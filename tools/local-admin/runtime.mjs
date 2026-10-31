import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export function run(file, args, {cwd, env, timeout = 20000} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {cwd, env: {...process.env, ...env}, windowsHide: true, shell: false});
    let output = '', size = 0, expired = false;
    const timer = setTimeout(() => { expired = true; child.kill(); }, timeout);
    const collect = data => { size += data.length; if (size <= 2 * 1024 * 1024) output += data.toString(); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', () => { clearTimeout(timer); reject(new Error('Команда недоступна. Проверьте Docker Desktop и установленные инструменты.')); });
    child.on('close', code => {
      clearTimeout(timer);
      if (code !== 0 || expired || size > 2 * 1024 * 1024) reject(new Error(expired
        ? 'Истекло время ожидания. Команда могла частично выполниться; обновите статус перед повтором.'
        : 'Операция не завершилась. Проверьте Docker Desktop, образы и конфигурацию проекта.'));
      else resolve(output.trim());
    });
  });
}

export async function containers(project, execute = run) {
  const ids = (await execute('docker', ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`])).split(/\s+/).filter(Boolean);
  if (!ids.length) return [];
  const rows = JSON.parse(await execute('docker', ['inspect', ...ids]));
  return rows.filter(row => row.Config.Labels['com.docker.compose.project'] === project).map(row => ({
    id: row.Id, name: row.Name.replace(/^\//, ''), service: row.Config.Labels['com.docker.compose.service'],
    state: row.State.Status, health: row.State.Health?.Status || null, startedAt: row.State.StartedAt,
    ports: row.NetworkSettings.Ports,
  }));
}

// Only this fixed PowerShell program inspects native quick tunnels; command lines/tokens never leave it.
const nativeQuery = `$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" | ForEach-Object {
  $target=[regex]::Match($_.CommandLine,'--url\\s+"?([^\\s"]+)').Groups[1].Value;
  if ($target -match '^http://127\\.0\\.0\\.1:[0-9]+/?$') {
    [pscustomobject]@{pid=$_.ProcessId; executable=$_.ExecutablePath; target=$target; startTicks=(Get-Process -Id $_.ProcessId).StartTime.ToUniversalTime().Ticks.ToString()}
  }
}); ConvertTo-Json -InputObject $rows -Compress`;

export async function nativeTunnels(execute = run) {
  if (process.platform !== 'win32') return [];
  return JSON.parse(await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', nativeQuery]));
}

export function matchingNative(rows, project) {
  return rows.filter(row => new URL(row.target).origin === new URL(project.localUrl).origin &&
    path.resolve(row.executable).toLowerCase() === path.resolve(project.tunnel.executable).toLowerCase());
}

export function latestUrl(log) { return log.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com\b/g)?.at(-1) || null; }

export async function readJson(file, fallback = null) {
  try { return JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/,'')); } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw new Error('Не удалось прочитать локальную конфигурацию. Проверьте JSON-файл.');
  }
}

export async function saveJson(file, value) {
  await mkdir(path.dirname(file), {recursive:true});
  const temporary=file+'.'+randomUUID()+'.tmp';
  try {
    await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {mode:0o600,flag:'wx'});
    await rename(temporary,file);
  } finally {await unlink(temporary).catch(()=>{});}
}

export async function discoverProjects(root, directory) {
  const file = path.join(directory, 'projects.json');
  const existing = await readJson(file);
  if (existing) return validateProjects(existing);
  const projects = [{id:'flowing-short', name:'Flowing Short', cwd:root, composeProject:'flowing-short-client-demo',
    files:['compose.yaml','compose.demo.yaml'], envFile:'.runtime/demo.env', profiles:['share'], localUrl:'http://127.0.0.1:13010',
    tunnel:{kind:'compose', service:'tunnel'}, frontend:'frontend'}];
  const delivery = path.resolve(root, '../flowing-delivery');
  try {
    await readFile(path.join(delivery, 'docker-compose.demo.yml'));
    const rows = await nativeTunnels();
    const known = await readJson(path.join(delivery, '.demo-host/tunnel.json'));
    const candidates = rows.filter(row => known && row.pid === known.pid && row.startTicks === known.startTicks);
    if (candidates.length === 1) {
      const native = candidates[0]; const port = new URL(native.target).port;
      projects.push({id:'flowing-delivery',name:'Flowing Delivery',cwd:delivery,composeProject:'flowing-delivery-demo',
        files:['docker-compose.demo.yml'],envFile:'.demo.local.env',profiles:[],environment:{DEMO_PORT:port},
        localUrl:native.target.replace(/\/$/,''),frontend:'frontend',
        tunnel:{kind:'native',executable:native.executable,legacyMetadata:path.join(delivery,'.demo-host/tunnel.json')}});
    }
  } catch { /* An optional sibling is never needed to operate Flowing Short. */ }
  validateProjects(projects); await saveJson(file, projects); return projects;
}

export function validateProjects(projects) {
  if (!Array.isArray(projects) || !projects.length || projects.length > 30) throw new Error('Некорректный список проектов.');
  const ids = new Set(), owners = new Set(), urls = new Set();
  for (const p of projects) {
    const url = new URL(p.localUrl);
    if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(p.id) || ids.has(p.id) ||
        !/^[a-z0-9][a-z0-9_-]{0,62}$/.test(p.composeProject) || owners.has(p.composeProject) || urls.has(url.origin) ||
        typeof p.name !== 'string' || !path.isAbsolute(p.cwd) ||
        !Array.isArray(p.files) || !p.files.length || p.files.some(f => typeof f !== 'string' || f.startsWith('-')) ||
        !['compose','native'].includes(p.tunnel?.kind) || !/^[a-zA-Z0-9_-]+$/.test(p.frontend) ||
        url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.pathname !== '/' || url.search || url.hash || url.username || url.password ||
        (p.tunnel.kind === 'compose' && !/^[a-zA-Z0-9_-]+$/.test(p.tunnel.service)) ||
        (p.tunnel.kind === 'native' && !path.isAbsolute(p.tunnel.executable))) throw new Error('Некорректная или повторяющаяся конфигурация проекта.');
    p.localUrl=url.origin;
    ids.add(p.id); owners.add(p.composeProject); urls.add(url.origin);
  }
  return projects;
}

export function composeArgs(p, args) {
  return ['compose','-p',p.composeProject, ...(p.envFile ? ['--env-file',path.resolve(p.cwd,p.envFile)] : []),
    ...p.files.flatMap(f => ['-f',path.resolve(p.cwd,f)]), ...(p.profiles || []).flatMap(v => ['--profile',v]), ...args];
}

export class Runtime {
  constructor(directory, execute = run) { this.directory = directory; this.execute = execute; }
  compose(p, args) { return this.execute('docker', composeArgs(p,args), {cwd:p.cwd,env:p.environment,timeout:330000}); }
  record(p) { return path.join(this.directory, p.id + '-tunnel.json'); }
  async tunnel(p, rows) {
    if (p.tunnel.kind === 'compose') {
      const live = rows.find(r => r.service === p.tunnel.service && r.state === 'running');
      if (!live) return {running:false,url:null};
      const record = await readJson(this.record(p));
      const logs = await this.execute('docker',['logs','--since',live.startedAt,'--tail','150',live.id]);
      const loggedUrl=latestUrl(logs);
      const same=record?.containerId===live.id && record.startedAt===live.startedAt;
      if(loggedUrl && (!same || record.url!==loggedUrl))await saveJson(this.record(p),{containerId:live.id,startedAt:live.startedAt,url:loggedUrl});
      // Connection logs can push the original URL out of the tail. Never reuse it after a restart.
      return {running:true,url:loggedUrl || (same?latestUrl(record.url || ''):null)};
    }
    const found = matchingNative(await nativeTunnels(this.execute),p);
    if (!found.length) return {running:false,url:null};
    if (found.length !== 1) throw new Error('Найдено несколько туннелей проекта. Закройте лишние вручную.');
    const current = found[0];
    const record = await readJson(this.record(p));
    const old = p.tunnel.legacyMetadata ? await readJson(p.tunnel.legacyMetadata) : null;
    let url = null;
    if (record?.pid === current.pid && record.startTicks === current.startTicks) {
      url = latestUrl(await readFile(path.join(this.directory,p.id+'-cloudflare.log'),'utf8').catch(()=>''));
    } else if (old?.pid === current.pid && old.startTicks === current.startTicks) url = latestUrl(old.url || '');
    return {running:true,url,current};
  }
  async status(p) {
    const rows = await containers(p.composeProject,this.execute);
    const tunnel = await this.tunnel(p,rows);
    const app = rows.filter(r => r.service !== p.tunnel.service && !['kafka-init','backend-build'].includes(r.service));
    const frontend = app.find(r => r.service === p.frontend);
    const state = frontend?.state === 'running' && app.every(r => r.state === 'running' && r.health !== 'unhealthy' && r.health !== 'starting')
      ? 'running' : app.some(r => r.state === 'running') ? 'partial' : 'stopped';
    return {status:state,tunnelRunning:tunnel.running,publicUrl:tunnel.url,
      containers:rows.map(({name,state,health})=>({name,state,health}))};
  }
  async hide(p) {
    if (p.tunnel.kind === 'compose') { await this.compose(p,['stop',p.tunnel.service]); return; }
    const found = matchingNative(await nativeTunnels(this.execute),p);
    if (!found.length) return;
    if (found.length !== 1) throw new Error('Нельзя однозначно определить процесс туннеля.');
    const row = found[0];
    if (!Number.isSafeInteger(row.pid) || !/^\d+$/.test(row.startTicks)) throw new Error('Не удалось проверить процесс.');
    // Recheck identity in the same process that performs termination: no kill by stale PID.
    await this.execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',
      `$ErrorActionPreference='Stop'; $p=Get-Process -Id ${row.pid}; if($p.ProcessName -ne 'cloudflared' -or $p.StartTime.ToUniversalTime().Ticks.ToString() -ne '${row.startTicks}'){throw 'Process identity changed'}; $p.Kill(); if(-not $p.WaitForExit(10000)){throw 'Tunnel did not stop'}`]);
  }
  async open(p) {
    const before = await this.tunnel(p,await containers(p.composeProject,this.execute));
    if (before.running && before.url) return;
    if (!before.running) {
      if (p.tunnel.kind === 'compose') await this.compose(p,['up','-d','--no-deps',p.tunnel.service]);
      else {
        if (process.platform !== 'win32') throw new Error('Нативный туннель настроен для Windows.');
        const logfile = path.join(this.directory,p.id+'-cloudflare.log');
        await writeFile(logfile,'',{mode:0o600});
        const child = spawn(p.tunnel.executable,['tunnel','--no-autoupdate','--url',p.localUrl,'--protocol','http2','--logfile',logfile],
          {cwd:p.cwd,detached:true,windowsHide:true,stdio:'ignore',shell:false});
        await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',()=>reject(new Error('Не удалось запустить cloudflared.')));});
        child.unref();
        const found = matchingNative(await nativeTunnels(this.execute),p).find(row=>row.pid===child.pid);
        if (!found) throw new Error('Не удалось подтвердить запуск туннеля. Обновите статус.');
        await saveJson(this.record(p),found);
      }
    }
    const deadline = Date.now()+60000;
    while (Date.now()<deadline) {
      const state = await this.tunnel(p,await containers(p.composeProject,this.execute));
      if (state.running && state.url) return;
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    throw new Error('Туннель запущен, но Cloudflare ещё не выдал ссылку. Обновите статус.');
  }
  async action(p, action) {
    if (action === 'hide') return this.hide(p);
    if (action === 'stop') { await this.hide(p); await this.compose(p,['stop']); return; }
    if (action !== 'start') throw new Error('Неизвестное действие.');
    await this.compose(p,['up','-d','--no-build','--wait','--wait-timeout','240',p.frontend]);
    await this.open(p);
  }
}
