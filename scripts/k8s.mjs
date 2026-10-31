import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const runtime = join(root, '.runtime', 'k8s');
mkdirSync(runtime, { recursive: true });
const cluster = 'flowing-short-review';
const namespace = 'flowing-short';
const context = `kind-${cluster}`;
const kubeconfig = join(runtime, 'kubeconfig');
const marker = join(runtime, 'owned-cluster');
const version = 'v0.33.0';
const windows = process.platform === 'win32';
const platform = windows ? 'windows' : 'linux';
const checksums = {
  windows: '4b22adaa135368c5a465d56bbd8e520cbea87272a06ca00b6078e7b81515c9fc',
  linux: 'aee6151561422756b764a4ae28e7f44cda5af5a9eead3cc9985112b1de8d8e0d',
};
const kind = join(runtime, windows ? 'kind.exe' : 'kind');
const nodeImage = 'kindest/node:v1.35.8@sha256:07b2536e30b803ed61d1677a79df6115f798ce64c80f9e22f6ed45afd09323c0';
const command = process.argv[2] || 'start';
assert.ok(['prepare', 'start', 'test', 'status', 'serve', 'stop', 'diagnostics'].includes(command), 'Usage: node scripts/k8s.mjs prepare|start|test|status|serve|diagnostics|stop');

function run(binary, args, { capture = false, input, timeout = 900000, allowFailure = false } = {}) {
  const result = spawnSync(binary, args, {
    cwd: root, env: { ...process.env, KUBECONFIG: kubeconfig }, windowsHide: true,
    encoding: 'utf8', timeout, maxBuffer: 16 * 1024 * 1024,
    stdio: capture || input !== undefined ? ['pipe', 'pipe', 'pipe'] : 'inherit', input,
  });
  if (!allowFailure && result.status !== 0) {
    // Never echo stdin: Kubernetes secrets are sent only through stdin.
    if (capture && result.stderr) console.error(result.stderr);
    throw new Error(`${binary} ${args[0]} failed (${result.status ?? result.error?.code})`);
  }
  return result.stdout?.trim() || '';
}
const kubectl = args => run('kubectl', ['--context', context, '-n', namespace, ...args]);
const get = args => run('kubectl', ['--context', context, '-n', namespace, ...args], { capture: true });
function execNode(source, target = 'statefulset/backend') {
  return run('kubectl', ['--context', context, '-n', namespace, 'exec', '-i', target, '--', 'node'], { input: source, capture: true, timeout: 120000 });
}
function requireOwnedCluster() {
  assert.ok(existsSync(marker), 'This checkout has not created its isolated cluster; refusing to operate on an unknown cluster');
  assert.equal(readFileSync(marker, 'utf8').trim(), cluster);
  assert.ok(existsSync(kubeconfig), 'Local isolated kubeconfig missing');
  const label = run('docker', ['inspect', '--format', '{{index .Config.Labels "io.x-k8s.kind.cluster"}}', `${cluster}-control-plane`], { capture: true });
  assert.equal(label, cluster);
}
function ensureKind() {
  assert.ok(['win32', 'linux'].includes(process.platform) && process.arch === 'x64', 'Automatic kind installation supports Windows/Linux x64');
  if (!existsSync(kind)) {
    const temporary = `${kind}.download`;
    run(windows ? 'curl.exe' : 'curl', [
      ...(windows ? ['--ssl-revoke-best-effort'] : []), '--fail', '--location', '--retry', '2',
      '--connect-timeout', '15', '--max-time', '180', '--output', temporary,
      `https://kind.sigs.k8s.io/dl/${version}/kind-${platform}-amd64`,
    ]);
    assert.equal(createHash('sha256').update(readFileSync(temporary)).digest('hex'), checksums[platform], 'kind download checksum mismatch');
    renameSync(temporary, kind);
    if (!windows) chmodSync(kind, 0o700);
  }
  assert.equal(createHash('sha256').update(readFileSync(kind)).digest('hex'), checksums[platform], 'Unexpected kind binary');
}
function rollout() {
  for (const workload of ['statefulset/kafka', 'statefulset/backend', 'deployment/frontend']) {
    kubectl(['rollout', 'status', workload, '--timeout=240s']);
  }
}
async function waitForReplacement(oldUid) {
  const deadline = Date.now() + 240000;
  while (Date.now() < deadline) {
    const text = run('kubectl', ['--context', context, '-n', namespace, 'get', 'pod', 'backend-0', '--ignore-not-found', '-o', 'json'], { capture: true });
    const pod = text ? JSON.parse(text) : undefined;
    if (pod?.metadata.uid !== oldUid && pod?.status?.conditions?.some(condition => condition.type === 'Ready' && condition.status === 'True')) return;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Replacement backend pod did not become Ready within 240 seconds');
}
async function eventually(check, timeout = 90000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { return await check(); } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw last || new Error('Timed out waiting for a Kubernetes condition');
}
function diagnostics() {
  const directory = join(root, 'test-results', 'kubernetes');
  mkdirSync(directory, { recursive: true });
  for (const [name, args] of [
    ['resources', ['get', 'pods,services,pvc', '-o', 'wide']],
    ['events', ['get', 'events', '--sort-by=.lastTimestamp']],
    ['backend', ['logs', 'statefulset/backend', '--all-containers', '--tail=150']],
    ['kafka', ['logs', 'statefulset/kafka', '--tail=100']],
    ['frontend', ['logs', 'deployment/frontend', '--tail=100']],
  ]) {
    writeFileSync(join(directory, `${name}.log`), run('kubectl', ['--context', context, '-n', namespace, ...args], { capture: true, allowFailure: true }));
  }
  console.log(`Diagnostics saved in ${directory}`);
}

function prepare() {
  ensureKind();
  const clusters = run(kind, ['get', 'clusters'], { capture: true }).split(/\r?\n/);
  if (clusters.includes(cluster)) requireOwnedCluster();
  else {
    writeFileSync(marker, cluster);
    run(kind, ['create', 'cluster', '--name', cluster, '--config', 'k8s/kind.yaml', '--image', nodeImage, '--kubeconfig', kubeconfig, '--wait', '180s']);
  }
}
async function start() {
  prepare();
  run('docker', ['build', '-t', 'flowing-short-backend:k8s', 'backend']);
  run('docker', ['build', '--build-arg', 'API_INTERNAL_URL=http://backend:8000', '-t', 'flowing-short-frontend:k8s', 'frontend']);
  run('docker', ['pull', 'apache/kafka:3.9.1']);
  // Docker Desktop's containerd image store can retain a multi-platform index while
  // only one architecture is present. Export one platform to avoid missing-digest imports.
  for (const [name, image] of [['backend', 'flowing-short-backend:k8s'], ['frontend', 'flowing-short-frontend:k8s'], ['kafka', 'apache/kafka:3.9.1']]) {
    const archive = join(runtime, `${name}.tar`);
    run('docker', ['image', 'save', '--platform', 'linux/amd64', '--output', archive, image]);
    run(kind, ['load', 'image-archive', '--name', cluster, archive]);
    unlinkSync(archive);
  }
  kubectl(['apply', '-f', 'k8s/namespace.yaml']);
  const secretFile = join(runtime, 'secret.json');
  if (!existsSync(secretFile)) writeFileSync(secretFile, JSON.stringify({ apiVersion: 'v1', kind: 'Secret', metadata: { name: 'application', namespace }, type: 'Opaque', stringData: { JWT_SECRET: randomBytes(48).toString('hex') } }), { flag: 'wx', mode: 0o600 });
  const currentSecret = get(['get', 'secret', 'application', '--ignore-not-found', '-o', 'name']);
  if (!currentSecret) run('kubectl', ['--context', context, '-n', namespace, 'apply', '-f', '-'], { input: readFileSync(secretFile, 'utf8') });
  kubectl(['apply', '-k', 'k8s']);
  // Local image tags are stable for kind; force a controlled rollout after loading new images.
  kubectl(['rollout', 'restart', 'statefulset/backend', 'deployment/frontend']);
  rollout();
  kubectl(['exec', 'statefulset/backend', '--', 'env', 'NODE_ENV=demo', 'ALLOW_DEMO_SEED=true', 'node', 'dist/prisma/seed.js']);
  console.log('Isolated Kubernetes stack ready. Open locally: node scripts/k8s.mjs serve');
}

async function test() {
  requireOwnedCluster();
  rollout();
  assert.equal(get(['get', 'statefulset', 'backend', '-o', 'jsonpath={.spec.replicas}']), '1', 'SQLite smoke requires exactly one backend instance');
  const guard = `if(process.env.DATABASE_URL!=='file:/app/backend/data/k8s-demo.db')throw Error('Refusing non-demo database');`;
  const snapshot = () => execNode(`${guard}
    const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
    Promise.all([p.userModel.count(),p.video.count(),p.outboxEvent.count()]).then(x=>console.log(JSON.stringify(x))).finally(()=>p.$disconnect());`);
  const before = snapshot();
  kubectl(['exec', 'statefulset/backend', '--', 'env', 'NODE_ENV=demo', 'ALLOW_DEMO_SEED=true', 'node', 'dist/prisma/seed.js']);
  assert.equal(snapshot(), before, 'Repeated seed must preserve row counts');
  execNode(`Promise.all(['/health/live','/api/health/ready','/'].map(async path=>{const r=await fetch('http://frontend:3000'+path,{signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('Frontend HTTP check failed');})).then(()=>console.log('Frontend and API proxy healthy')).catch(()=>process.exit(1));`, 'deployment/frontend');
  kubectl(['exec', 'statefulset/backend', '--', 'env', 'ALLOW_SYNTHETIC_TESTS=true', 'API_URL=http://127.0.0.1:8000', 'node', '--test', 'test/kafka.integration.cjs']);
  try {
    kubectl(['scale', 'statefulset/kafka', '--replicas=0']);
    await eventually(() => {
      execNode(`(async()=>{const live=await fetch('http://localhost:8000/health/live');const ready=await fetch('http://localhost:8000/health/ready',{signal:AbortSignal.timeout(3000)});if(live.status!==200||ready.status!==503)process.exit(1)})().catch(()=>process.exit(1));`);
      const slices = JSON.parse(get(['get', 'endpointslices', '-l', 'kubernetes.io/service-name=backend', '-o', 'json']));
      assert.ok(slices.items.every(slice => (slice.endpoints || []).every(endpoint => endpoint.conditions?.ready !== true)), 'Unready backend must be removed from Service endpoints');
    });
  } finally {
    kubectl(['scale', 'statefulset/kafka', '--replicas=1']);
  }
  rollout();
  await eventually(() => execNode(`fetch('http://localhost:8000/health/ready',{signal:AbortSignal.timeout(3000)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1));`));
  const token = randomUUID();
  execNode(`${guard}require('fs').writeFileSync('/app/backend/uploads/k8s-persistence.txt',${JSON.stringify(token)});console.log('Persistence marker written');`);
  const persisted = snapshot();
  const oldUid = get(['get', 'pod', 'backend-0', '-o', 'jsonpath={.metadata.uid}']);
  const claimIds = () => get(['get', 'pvc', '-o', 'jsonpath={range .items[*]}{.metadata.uid}{"\\n"}{end}']).split(/\r?\n/).sort().join('\n');
  const claims = claimIds();
  kubectl(['delete', 'pod', 'backend-0', '--wait=true']);
  await waitForReplacement(oldUid);
  assert.notEqual(get(['get', 'pod', 'backend-0', '-o', 'jsonpath={.metadata.uid}']), oldUid);
  assert.equal(snapshot(), persisted, 'Database must survive pod replacement');
  assert.equal(execNode(`${guard}console.log(require('fs').readFileSync('/app/backend/uploads/k8s-persistence.txt','utf8'));`), token);
  assert.equal(claimIds(), claims);
  console.log('PASS: Kubernetes HTTP probes, Service readiness removal/recovery, idempotent seed, real Kafka delivery, DB/uploads/PVC persistence after pod replacement');
}

try {
  if (command === 'prepare') prepare();
  else if (command === 'start') await start();
  else if (command === 'test') await test();
  else if (command === 'diagnostics') { requireOwnedCluster(); diagnostics(); }
  else if (command === 'status') { requireOwnedCluster(); kubectl(['get', 'pods,svc,pvc']); }
  else if (command === 'serve') { requireOwnedCluster(); console.log('http://127.0.0.1:13020 (Ctrl+C closes forwarding only)'); run('kubectl', ['--context', context, '-n', namespace, 'port-forward', '--address', '127.0.0.1', 'service/frontend', '13020:3000'], { timeout: 86400000 }); }
  else {
    ensureKind();
    assert.ok(existsSync(marker) && readFileSync(marker, 'utf8').trim() === cluster, 'Refusing to remove an unowned cluster');
    if (!run(kind, ['get', 'clusters'], { capture: true }).split(/\r?\n/).includes(cluster)) {
      console.log('The isolated cluster is already absent.');
      process.exit(0);
    }
    requireOwnedCluster();
    console.log('Removing only the isolated flowing-short-review cluster and its disposable demo volumes.');
    run(kind, ['delete', 'cluster', '--name', cluster, '--kubeconfig', kubeconfig]);
  }
} catch (error) {
  console.error(error.message);
  if (existsSync(kubeconfig) && command !== 'diagnostics') {
    try { diagnostics(); } catch { /* Preserve the original failure. */ }
  }
  process.exitCode = 1;
}
