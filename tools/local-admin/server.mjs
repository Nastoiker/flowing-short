import http from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { Runtime, discoverProjects } from './runtime.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export async function createAdmin({projects, runtime, port = 13200}) {
  const csrf = randomBytes(32).toString('hex');
  const jobs = new Map();
  let origin, cached, pending, cachedAt = 0;
  const files = new Map([['/', ['index.html','text/html']],['/app.js',['app.js','text/javascript']],['/style.css',['style.css','text/css']]]);
  async function state() {
    if (cached && Date.now()-cachedAt < 2000) return cached;
    if (pending) return pending;
    pending = Promise.all(projects.map(async p => {
      const base = {id:p.id,name:p.name,localUrl:p.localUrl};
      try { return {...base,...await runtime.status(p)}; }
      catch { return {...base,status:'unknown',tunnelRunning:false,publicUrl:null,containers:[],error:'Статус недоступен. Проверьте Docker Desktop и локальную конфигурацию.'}; }
    })).then(rows => {cached = rows;cachedAt=Date.now();return rows;}).finally(()=>{pending=null;});
    return pending;
  }
  const server = http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const json = (code,body) => {res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
    try {
      if (req.headers.host !== new URL(origin).host || (req.headers.origin && req.headers.origin !== origin) || req.headers['sec-fetch-site'] === 'cross-site') return json(403,{error:'Доступ разрешён только из локальной панели.'});
      if (req.method === 'GET' && req.url === '/api/state') {
        return json(200,{csrf,projects:(await state()).map(p=>({...p,job:jobs.get(p.id)||null}))});
      }
      if (req.method === 'POST') {
        const token = req.headers['x-admin-csrf'];
        if (req.headers.origin !== origin || req.headers['content-type']?.split(';')[0] !== 'application/json' ||
            typeof token !== 'string' || Buffer.byteLength(token)!==Buffer.byteLength(csrf) || !timingSafeEqual(Buffer.from(token),Buffer.from(csrf))) return json(403,{error:'Обновите панель перед выполнением действия.'});
        const match = /^\/api\/projects\/([a-z0-9-]+)\/actions$/.exec(req.url);
        const p = match && projects.find(p=>p.id===match[1]);
        if (!p) return json(404,{error:'Проект не найден.'});
        let body='';
        for await (const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>4096)return json(413,{error:'Слишком большой запрос.'});}
        let data;try{data=JSON.parse(body);}catch{return json(400,{error:'Некорректный JSON.'});}
        if (!data || Object.keys(data).some(key=>key!=='action') || !['start','hide','stop'].includes(data.action)) return json(400,{error:'Неизвестное действие.'});
        if(jobs.get(p.id)?.status==='running')return json(409,{error:'Дождитесь завершения текущей операции.'});
        const job = {id:randomUUID(),action:data.action,status:'running',message:'Операция выполняется…',startedAt:new Date().toISOString(),finishedAt:null};
        jobs.set(p.id,job);
        json(202,job);
        Promise.resolve().then(()=>runtime.action(p,data.action)).then(()=>{
          job.status='success';job.message=data.action==='start'?'Проект запущен, публичная ссылка готова.':data.action==='hide'?'Публичный доступ закрыт. Локальный проект продолжает работать.':'Проект остановлен. Данные сохранены.';
        }).catch(()=>{
          job.status='failed';job.message='Операция не завершилась. Проверьте Docker Desktop, образы и конфигурацию. Действие могло выполниться частично; проверьте статус перед повтором.';
        }).finally(()=>{job.finishedAt=new Date().toISOString();cached=null;});
        return;
      }
      if(req.method==='GET' && files.has(req.url)) {
        const [file,type]=files.get(req.url);res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});res.end(await readFile(path.join(here,'public',file)));return;
      }
      json(404,{error:'Не найдено.'});
    } catch {if(!res.headersSent)json(500,{error:'Не удалось выполнить запрос.'});else res.end();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  origin=`http://127.0.0.1:${server.address().port}`;
  if(projects.some(p=>new URL(p.localUrl).origin===origin)){await new Promise(resolve=>server.close(resolve));throw new Error('Админку нельзя использовать как цель туннеля.');}
  return {server,origin,close:()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();})};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const root=path.resolve(here,'../..');
    const directory=path.join(root,'.runtime','local-admin');await mkdir(directory,{recursive:true});
    const projects=await discoverProjects(root,directory);
    const app=await createAdmin({projects,runtime:new Runtime(directory)});
    console.log(`Локальная панель: ${app.origin}\nПроекты: ${projects.map(p=>p.name).join(', ')}\nЗакрытие панели не останавливает проекты. Ctrl+C — закрыть панель.`);
    if(process.argv.includes('--open')) {
      const opener=process.platform==='win32'
        ? spawn('powershell.exe',['-NoProfile','-Command',`Start-Process '${app.origin}'`],{windowsHide:true,stdio:'ignore'})
        : null;
      opener?.on('error',()=>console.log('Откройте адрес панели в браузере.'));
    }
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.close().then(()=>process.exit(0)));
  } catch(error) {console.error(error.code==='EADDRINUSE'?'Порт 13200 занят. Если панель уже запущена, откройте http://127.0.0.1:13200':error.message);process.exitCode=1;}
}
