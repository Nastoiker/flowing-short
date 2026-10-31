import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const envFile = fileURLToPath(new URL('../.runtime/demo.env', import.meta.url));
mkdirSync(new URL('../.runtime/', import.meta.url), { recursive: true });
try {
  writeFileSync(envFile, `JWT_SECRET=${randomBytes(48).toString('hex')}\nDEMO_PORT=13010\n`, { flag: 'wx', mode: 0o600 });
} catch (error) { if (error.code !== 'EEXIST') throw error; }

const args = ['compose', '-p', 'flowing-short-client-demo', '--env-file', envFile,
  '-f', 'compose.yaml', '-f', 'compose.demo.yaml', '--profile', 'share'];
function docker(command, capture = false) {
  const result = spawnSync('docker', command, {
    cwd: root, encoding: 'utf8', windowsHide: true, timeout: 900000,
    stdio: capture ? 'pipe' : 'inherit', maxBuffer: 4 * 1024 * 1024,
  });
  if (result.status !== 0) throw new Error('Docker command failed. Check that Docker Desktop is running and review its output.');
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}
function compose(command, capture = false) { return docker([...args, ...command], capture); }
function tunnelUrl() {
  const id = compose(['ps', '--status', 'running', '-q', 'tunnel'], true).trim();
  if (!id) return undefined;
  const started = docker(['inspect', '--format', '{{.State.StartedAt}}', id], true).trim();
  const matches = compose(['logs', '--no-color', '--since', started, 'tunnel'], true)
    .match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/g);
  return matches?.at(-1);
}
const command = process.argv[2] || 'start';
if (!['start', 'stop', 'status'].includes(command)) {
  console.error('Usage: node scripts/demo.mjs [start|stop|status]');
  process.exit(1);
}
try {
  if (command === 'stop') {
    compose(['stop', 'tunnel']);
    console.log('Public access stopped. Demo data and local containers preserved.');
  } else if (command === 'status') {
    compose(['ps', '-a']);
    const running = compose(['ps', '--status', 'running', '-q', 'tunnel'], true).trim();
    console.log(running ? `Public demo: ${tunnelUrl() || 'URL not allocated yet'}` : 'Public tunnel is stopped.');
  } else {
    compose(['up', '-d', '--build', '--wait', '--wait-timeout', '240', 'frontend']);
    compose(['exec', '-T', '-e', 'NODE_ENV=demo', '-e', 'ALLOW_DEMO_SEED=true', 'backend', 'npx', 'prisma', 'db', 'seed']);
    compose(['up', '-d', '--no-deps', 'tunnel']);
    let url;
    for (let attempt = 0; attempt < 60; attempt++) {
      url = tunnelUrl();
      if (url) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!url) throw new Error('Tunnel has not allocated a URL. Run node scripts/demo.mjs status and inspect Docker tunnel logs.');
    writeFileSync(new URL('../.runtime/demo-url.txt', import.meta.url), `${url}\n`);
    console.log(`\nPublic demo: ${url}\nLocal demo: http://localhost:13010\nKeep this computer and Docker running. The public URL changes after the tunnel restarts.\nStop public access: node scripts/demo.mjs stop`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
