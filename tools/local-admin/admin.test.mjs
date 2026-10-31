import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdmin } from './server.mjs';
import { Runtime, composeArgs, latestUrl, matchingNative, validateProjects } from './runtime.mjs';
import path from 'node:path';
import http from 'node:http';
import {mkdtemp, unlink, rmdir} from 'node:fs/promises';
import os from 'node:os';

export const project = {id:'demo',name:'Demo',cwd:process.cwd(),composeProject:'isolated-demo',files:['compose.yaml'],profiles:[],localUrl:'http://127.0.0.1:13010',frontend:'frontend',tunnel:{kind:'compose',service:'tunnel'}};
const snapshot = {status:'running',publicUrl:'https://demo.trycloudflare.com',tunnelRunning:true,containers:[]};
async function request(app, action, extra={}) {
  const {csrf} = await (await fetch(app.origin+'/api/state')).json();
  return fetch(app.origin+'/api/projects/demo/actions',{method:'POST',headers:{origin:app.origin,'content-type':'application/json','x-admin-csrf':csrf,...extra},body:JSON.stringify({action})});
}
async function until(check) {for(let i=0;i<100;i++){if(await check())return;await new Promise(r=>setTimeout(r,10));}assert.fail('Timed out');}

test('loopback admin rejects remote Origin, DNS rebinding and missing CSRF before executing commands',async()=>{
  let calls=0;
  const app=await createAdmin({projects:[project],port:0,runtime:{status:async()=>snapshot,action:async()=>{calls++;}}});
  try {
    assert.equal(app.server.address().address,'127.0.0.1');
    assert.equal((await request(app,'stop',{origin:'https://evil.example'})).status,403);
    assert.equal((await request(app,'stop',{'x-admin-csrf':'wrong'})).status,403);
    const rebound=await new Promise((resolve,reject)=>{http.get(app.origin+'/api/state',{headers:{host:'evil.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});
    assert.equal(rebound,403);
    assert.equal((await fetch(app.origin+'/api/state',{headers:{'sec-fetch-site':'cross-site'}})).status,403);
    assert.equal((await fetch(app.origin+'/api/projects/demo/actions',{method:'POST'})).status,403);
    assert.equal(calls,0);
    assert.equal((await fetch(app.origin+'/../runtime.mjs')).status,404);
  }finally{await app.close();}
});

test('actions are allowlisted and concurrent double clicks cannot race a project stop/start',async()=>{
  let release,calls=0;
  const app=await createAdmin({projects:[project],port:0,runtime:{status:async()=>snapshot,action:()=>{calls++;return new Promise(r=>release=r);}}});
  try {
    assert.equal((await request(app,'down -v')).status,400);
    assert.equal((await request(app,'stop')).status,202);
    assert.equal((await request(app,'start')).status,409);
    assert.equal(calls,1);release();
    await until(async()=> (await (await fetch(app.origin+'/api/state')).json()).projects[0].job.status==='success');
  }finally{release?.();await app.close();}
});

test('Docker errors are contained and secrets never enter API responses',async()=>{
  const secret='JWT_SECRET=never-expose-this';
  const app=await createAdmin({projects:[project],port:0,runtime:{status:async()=>{throw Error(secret);},action:async()=>{throw Error(secret);}}});
  try {
    const state=await(await fetch(app.origin+'/api/state')).json();assert.equal(state.projects[0].status,'unknown');assert.ok(!JSON.stringify(state).includes(secret));
    assert.equal((await request(app,'start')).status,202);
    await until(async()=> (await(await fetch(app.origin+'/api/state')).json()).projects[0].job.status==='failed');
    assert.ok(!(await(await fetch(app.origin+'/api/state')).text()).includes(secret));
  }finally{await app.close();}
});

test('hide stops only the configured tunnel; stop preserves volumes and never invokes down/remove',async()=>{
  const calls=[];const r=new Runtime('/unused',async(file,args)=>{calls.push([file,...args]);return '';});
  await r.action(project,'hide');
  assert.deepEqual(calls.at(-1).slice(-2),['stop','tunnel']);
  calls.length=0;await r.action(project,'stop');
  assert.deepEqual(calls.map(c=>c.slice(composeArgs(project,[]).length+1)),[['stop','tunnel'],['stop']]);
  assert.ok(calls.every(c=>!c.includes('down')&&!c.includes('-v')&&!c.includes('rm')));
  assert.ok(calls.every(c=>c.includes('isolated-demo')));
});

test('registry rejects duplicate ownership, public targets and malformed service names',()=>{
  assert.throws(()=>validateProjects([project,project]));
  assert.throws(()=>validateProjects([{...project,localUrl:'http://example.com:80'}]));
  assert.throws(()=>validateProjects([{...project,frontend:'frontend; rm'}]));
  assert.equal(validateProjects([project]).length,1);
  assert.throws(()=>validateProjects([project,{...project,id:'second',composeProject:'second',localUrl:project.localUrl+'/'}]));
  assert.equal(validateProjects([{...project,localUrl:project.localUrl+'/'}])[0].localUrl,project.localUrl);
});

test('native tunnel matching requires exact executable and origin; URL parsing selects latest safe URL',()=>{
  const executable=path.resolve('cloudflared.exe');
  const p={...project,tunnel:{kind:'native',executable}};
  const rows=[{pid:1,executable,target:p.localUrl},{pid:2,executable,target:'http://127.0.0.1:9999'},{pid:3,executable:path.resolve('other.exe'),target:p.localUrl}];
  assert.deepEqual(matchingNative(rows,p).map(r=>r.pid),[1]);
  assert.deepEqual(matchingNative(rows,{...p,localUrl:p.localUrl+'/'}).map(r=>r.pid),[1]);
  assert.equal(latestUrl('old https://old.trycloudflare.com new https://new.trycloudflare.com'),'https://new.trycloudflare.com');
  assert.equal(latestUrl('javascript:alert(1)'),null);
});

test('a live Docker tunnel keeps its URL when logs rotate but never after a different container start',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'flowing-admin-cache-'));
  let logs='https://current.trycloudflare.com';
  const r=new Runtime(dir,async()=>logs);
  const row={id:'container-one',service:'tunnel',state:'running',startedAt:'2026-10-31T12:00:00Z'};
  try {
    assert.equal((await r.tunnel(project,[row])).url,'https://current.trycloudflare.com');
    logs='connection restored';
    assert.equal((await r.tunnel(project,[row])).url,'https://current.trycloudflare.com');
    assert.equal((await r.tunnel(project,[{...row,startedAt:'2026-10-31T13:00:00Z'}])).url,null);
    assert.equal((await r.tunnel(project,[{...row,id:'replacement'}])).url,null);
  }finally{await unlink(path.join(dir,project.id+'-tunnel.json'));await rmdir(dir);}
});
