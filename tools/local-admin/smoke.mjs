// Explicit local integration test: publishes only a synthetic HTTP response, never user applications.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { Runtime, run, containers, nativeTunnels } from './runtime.mjs';

assert.equal(process.env.ALLOW_SYNTHETIC_TESTS,'true','Opt in to creating isolated test containers and temporary public tunnels');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const stamp=Date.now();
const directory=path.join(root,'.runtime','local-admin-smoke',String(stamp));
await mkdir(directory,{recursive:true});
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
const priorNative=await nativeTunnels();
const native=priorNative[0];
const kinds=process.platform==='win32'&&native?['compose','native']:['compose'];
for(const kind of kinds){
  const port=await freePort();const name=`flowing-admin-test-${stamp}-${kind}`;
  const file=path.join(directory,kind+'.json');
  const marker=`synthetic-${stamp}-${kind}`;
  const code=`const fs=require('fs'),http=require('http');if(!fs.existsSync('/data/marker'))fs.writeFileSync('/data/marker','${marker}');http.createServer((q,r)=>r.end(fs.readFileSync('/data/marker'))).listen(8000,'0.0.0.0');`;
  await writeFile(file,JSON.stringify({services:{frontend:{image:'node:22-alpine',command:['node','-e',code],ports:[`127.0.0.1:${port}:8000`],volumes:['data:/data'],healthcheck:{test:['CMD','node','-e',"fetch('http://127.0.0.1:8000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"],interval:'1s',timeout:'2s',retries:20}},tunnel:{image:'cloudflare/cloudflared@sha256:4955524aeaa379e154023d5a027c250f7b35041a2e7e950cf13f144bc9b9c5ba',profiles:['share'],command:['tunnel','--no-autoupdate','--url','http://frontend:8000','--protocol','http2']}},volumes:{data:{}}}));
  const p={id:name,name,cwd:directory,composeProject:name,files:[file],profiles:kind==='compose'?['share']:[],localUrl:`http://127.0.0.1:${port}`,frontend:'frontend',tunnel:kind==='compose'?{kind,service:'tunnel'}:{kind,executable:native.executable}};
  const runtime=new Runtime(directory);
  try {
    await runtime.action(p,'start');let status=await runtime.status(p);assert.equal(status.status,'running');assert.equal(status.tunnelRunning,true);assert.ok(status.publicUrl);
    assert.equal(await(await fetch(p.localUrl)).text(),marker);
    const url=status.publicUrl;await runtime.action(p,'start');assert.equal((await runtime.status(p)).publicUrl,url,'Repeated start preserves URL');
    await runtime.action(p,'hide');status=await runtime.status(p);assert.equal(status.tunnelRunning,false);assert.equal(status.publicUrl,null);assert.equal(status.status,'running');
    assert.equal(await(await fetch(p.localUrl)).text(),marker);
    await runtime.action(p,'start');assert.equal((await runtime.status(p)).tunnelRunning,true);
    await runtime.action(p,'stop');status=await runtime.status(p);assert.equal(status.tunnelRunning,false);assert.equal(status.status,'stopped');
    await runtime.action(p,'start');assert.equal(await(await fetch(p.localUrl)).text(),marker,'Named-volume data survives stop/start');
    console.log(`PASS ${kind}: start, stable URL, hide, restart, full stop, preserved data`);
  } finally {
    await runtime.hide(p);
    assert.match(p.composeProject,/^flowing-admin-test-\d+-(compose|native)$/);
    assert.equal(p.cwd,directory);
    await runtime.compose(p,['down','-v']); // Only this freshly created synthetic project, never real demo volumes.
  }
}
const after=await nativeTunnels();
for(const row of priorNative)assert.ok(after.some(other=>other.pid===row.pid&&other.startTicks===row.startTicks),'Existing native tunnel must remain untouched');
console.log('PASS: existing native tunnels unchanged');
