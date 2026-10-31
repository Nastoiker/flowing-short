import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium, devices, expect} from '../../frontend/node_modules/@playwright/test/index.mjs';
import {createAdmin} from './server.mjs';

// Real HTTP, browser Origin and CSRF validation; only command execution is replaced.
function fixture() {
  const projects = [
    {id:'first', name:'Первый проект', localUrl:'http://127.0.0.1:14001'},
    {id:'second', name:'Второй проект с длинным названием для мобильного экрана', localUrl:'http://127.0.0.1:14002'},
  ];
  const snapshots = new Map(projects.map((p, index) => [p.id, {
    status:index ? 'stopped' : 'running', tunnelRunning:!index,
    publicUrl:index ? null : 'https://synthetic.trycloudflare.com',
    containers:index ? [] : [{name:'frontend', state:'running', health:'healthy'}],
  }]));
  const calls = [], gates = new Map();
  let unavailable = false;
  const runtime = {
    async status(project) {
      if(unavailable) throw Error('JWT_SECRET=never-show-this');
      return structuredClone(snapshots.get(project.id));
    },
    async action(project, action) {
      calls.push({id:project.id, action});
      await new Promise((resolve,reject) => gates.set(project.id, {resolve,reject}));
      const snapshot = snapshots.get(project.id);
      if(action === 'start') Object.assign(snapshot, {status:'running', tunnelRunning:true, publicUrl:'https://new-synthetic.trycloudflare.com'});
      if(action === 'hide') Object.assign(snapshot, {tunnelRunning:false, publicUrl:null});
      if(action === 'stop') Object.assign(snapshot, {status:'stopped', tunnelRunning:false, publicUrl:null, containers:[]});
    },
  };
  return {projects, runtime, calls, gates, failStatus:()=>{unavailable=true;}};
}

for(const [name, device] of [['desktop', devices['Desktop Chrome']], ['mobile', devices['Pixel 7']]]) {
  test(`${name}: real HTTP actions, CSRF, confirmation, busy state and sanitized failures`, {timeout:45000}, async()=>{
    const f = fixture();
    const app = await createAdmin({projects:f.projects, runtime:f.runtime, port:0});
    const browser = await chromium.launch();
    const context = await browser.newContext({...device});
    await context.tracing.start({screenshots:true, snapshots:true});
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error=>errors.push(error.message));
    const first = page.locator('[data-project-id="first"]'), second = page.locator('[data-project-id="second"]');
    const settle = async(id, expected='success') => {
      await expect.poll(async()=>{
        const state = await (await fetch(app.origin+'/api/state')).json();
        return state.projects.find(project=>project.id===id).job?.status;
      }).toBe(expected);
      await page.locator('#refresh').click();
      await expect(page.locator(`[data-project-id="${id}"] .job`)).toHaveClass(new RegExp(expected));
    };
    try {
      await page.goto(app.origin);
      await expect(page.locator('article')).toHaveCount(2);
      await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(first.locator('.public-box a')).toHaveAttribute('href','https://synthetic.trycloudflare.com/');
      await expect(first.locator('.primary')).toBeDisabled();
      await first.locator('summary').click();
      await expect(first.locator('.container-list')).toContainText('frontend');

      const rejected = await page.evaluate(async()=> (await fetch('/api/projects/first/actions', {method:'POST', headers:{'Content-Type':'application/json','X-Admin-CSRF':'incorrect'}, body:JSON.stringify({action:'stop'})})).status);
      assert.equal(rejected,403); assert.equal(f.calls.length,0);
      await second.locator('.primary').click();
      await expect.poll(()=>f.calls.length).toBe(1);
      await expect(second.locator('.primary')).toBeDisabled();
      await expect(second).toHaveAttribute('aria-busy','true');
      assert.deepEqual(f.calls[0], {id:'second',action:'start'});
      f.gates.get('second').resolve(); await settle('second');
      await expect(second.locator('.public-box a')).toHaveAttribute('href','https://new-synthetic.trycloudflare.com/');

      await first.locator('.actions .secondary').click();
      await expect.poll(()=>f.calls.length).toBe(2);
      assert.deepEqual(f.calls[1], {id:'first',action:'hide'});
      f.gates.get('first').resolve(); await settle('first');
      await expect(first.locator('.badge')).toHaveText('Запущен');
      await expect(first.locator('.public-box a')).toHaveCount(0);
      await expect(first.locator('.actions .secondary')).toBeDisabled();

      await first.locator('.quiet-danger').click();
      await expect(page.locator('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('dialog')).not.toBeVisible();
      assert.equal(f.calls.length,2);
      await first.locator('.quiet-danger').click();
      await page.locator('#confirm-stop').click();
      await expect.poll(()=>f.calls.length).toBe(3);
      assert.deepEqual(f.calls[2], {id:'first',action:'stop'});
      await expect(first.locator('.quiet-danger')).toBeDisabled();
      f.gates.get('first').resolve(); await settle('first');
      await expect(first.locator('.badge')).toHaveText('Остановлен');

      await first.locator('.primary').click();
      await expect.poll(()=>f.calls.length).toBe(4);
      f.failStatus(); f.gates.get('first').reject(Error('JWT_SECRET=never-show-this'));
      await settle('first','failed');
      await expect(first.locator('.job')).toContainText('Операция не завершилась');
      await expect(first.locator('.project-error')).toContainText('Docker Desktop');
      await expect(first.locator('.badge')).toHaveText('Нет данных');
      assert.ok(!(await page.locator('body').textContent()).includes('never-show-this'));
      assert.deepEqual(errors,[]);
    } catch(error) {
      const directory = new URL('../../frontend/test-results/', import.meta.url);
      await mkdir(directory, {recursive:true});
      await page.screenshot({path:fileURLToPath(new URL(`local-admin-${name}.png`,directory)), fullPage:true}).catch(()=>{});
      await context.tracing.stop({path:fileURLToPath(new URL(`local-admin-${name}-trace.zip`,directory))}).catch(()=>{});
      throw error;
    } finally {
      for(const gate of f.gates.values()) gate.resolve();
      await context.close(); await browser.close(); await app.close();
    }
  });
}
