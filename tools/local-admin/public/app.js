'use strict';

const $ = (id) => document.getElementById(id);
const cards = new Map();
const pending = new Set();
let projects = new Map();
let csrf = '';
let connected = false;
let refreshing = false;
let stopProject = null;
let stateVersion = 0;
const statuses = {running: 'Запущен', stopped: 'Остановлен', partial: 'Частично', unknown: 'Нет данных'};
const actionNames = {start: 'Запуск проекта', hide: 'Отключение ссылки', stop: 'Остановка проекта'};

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function announce(message) { $('announcement').textContent = message; }
function errorMessage(error) {
  if (error.name === 'AbortError') return 'Ответ задерживается. Обновите статус перед повторной попыткой: операция могла начаться.';
  return error.displayMessage || 'Не удалось связаться с локальной панелью или прочитать ответ. Проверьте локальный сервер и повторите обновление.';
}
function safeUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function renderUrl(target, value, fallback) {
  const url = safeUrl(value);
  if (target.dataset.value === (url || fallback)) return;
  target.dataset.value = url || fallback;
  target.replaceChildren();
  if (!url) { target.append(node('span', 'unavailable', fallback)); return; }
  const link = node('a', '', url);
  link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${url} — открыть в новой вкладке`);
  target.append(link);
}
function createCard(project) {
  const card = node('article', 'card');
  card.dataset.projectId = project.id;
  const top = node('div', 'card-top'), identity = node('div', 'project-identity');
  const icon = node('span', 'project-icon'); icon.setAttribute('aria-hidden', 'true');
  const heading = node('div'), title = node('h2', 'project-title'), subtitle = node('p', 'project-subtitle');
  heading.append(title, subtitle); identity.append(icon, heading);
  const badge = node('span', 'badge'); top.append(identity, badge);
  const links = node('div', 'links');
  const localBox = node('div', 'link-box'), local = node('div', 'url');
  localBox.append(node('span', 'link-label', 'На этом компьютере'), local);
  const publicBox = node('div', 'link-box public-box'), publicRow = node('div', 'link-row'), publicUrl = node('div', 'url');
  const copy = node('button', 'copy', 'Копировать'); copy.type = 'button';
  copy.addEventListener('click', async () => {
    const url = safeUrl(projects.get(project.id)?.publicUrl);
    if (!url) return;
    try { await navigator.clipboard.writeText(url); copy.textContent = 'Скопировано'; announce('Публичная ссылка скопирована.'); setTimeout(() => {copy.textContent = 'Копировать';}, 2200); }
    catch { announce('Не удалось скопировать. Выделите публичную ссылку и скопируйте вручную.'); copy.textContent = 'Выделите ссылку'; }
  });
  publicRow.append(publicUrl, copy); publicBox.append(node('span', 'link-label', 'Публичная ссылка для клиента'), publicRow); links.append(localBox, publicBox);
  const error = node('p', 'notice error project-error'); error.setAttribute('role', 'alert'); error.hidden = true;
  const job = node('div', 'job'), jobTitle = node('span', 'job-title'), jobMessage = node('span'), jobTime = node('span', 'job-time');
  job.setAttribute('role', 'status'); job.hidden = true; job.append(jobTitle, jobMessage, jobTime);
  const details = node('details', 'details'), summary = node('summary'), containerList = node('ul', 'container-list'); details.append(summary, containerList);
  const actions = node('div', 'actions');
  const start = node('button', 'button primary', 'Запустить демо'), hide = node('button', 'button secondary', 'Скрыть ссылку'), stop = node('button', 'button quiet-danger', 'Остановить');
  for (const button of [start, hide, stop]) button.type = 'button';
  start.addEventListener('click', () => runAction(project.id, 'start'));
  hide.addEventListener('click', () => runAction(project.id, 'hide'));
  stop.addEventListener('click', () => {
    stopProject = project.id;
    $('dialog-description').textContent = `Проект «${projects.get(project.id)?.name || project.name}» станет недоступен клиентам и на этом компьютере.`;
    $('stop-dialog').showModal();
  });
  actions.append(start, hide, stop); card.append(top, links, error, job, details, node('div', 'actions-spacer'), actions);
  $('projects').append(card);
  return {card, icon, title, subtitle, badge, local, publicBox, publicUrl, copy, error, job, jobTitle, jobMessage, jobTime, summary, containerList, start, hide, stop};
}
function updateCard(project) {
  let view = cards.get(project.id);
  if (!view) { view = createCard(project); cards.set(project.id, view); }
  const status = Object.hasOwn(statuses, project.status) ? project.status : 'unknown';
  view.title.textContent = project.name;
  view.card.setAttribute('aria-label', `Проект ${project.name}`);
  view.icon.textContent = (project.name || 'Д').slice(0, 1).toUpperCase();
  view.badge.className = `badge ${status}`; view.badge.textContent = statuses[status];
  view.subtitle.textContent = project.tunnelRunning ? 'Туннель Cloudflare работает' : 'Внешний доступ выключен';
  renderUrl(view.local, project.localUrl, 'Локальный адрес не задан');
  const publicUrl = project.tunnelRunning ? safeUrl(project.publicUrl) : null;
  renderUrl(view.publicUrl, publicUrl, project.tunnelRunning ? 'Получаем публичный адрес…' : 'Ссылка появится после запуска');
  view.publicBox.classList.toggle('available', Boolean(publicUrl));
  view.copy.hidden = !publicUrl;
  view.copy.setAttribute('aria-label', `Копировать публичную ссылку проекта ${project.name}`);
  view.error.hidden = !project.error; view.error.textContent = project.error || '';
  const job = project.job;
  view.job.hidden = !job;
  if (job) {
    const jobStatus = ['running', 'success', 'failed'].includes(job.status) ? job.status : 'running';
    view.job.className = `job ${jobStatus}`;
    view.jobTitle.textContent = `${actionNames[job.action] || 'Операция'} · ${jobStatus === 'running' ? 'в процессе' : jobStatus === 'success' ? 'готово' : 'не выполнена'}`;
    view.jobMessage.textContent = job.message || (jobStatus === 'running' ? 'Это может занять несколько минут. Можно оставить панель открытой.' : '');
    const time = new Date(job.finishedAt || job.startedAt);
    view.jobTime.textContent = Number.isNaN(time.getTime()) ? '' : time.toLocaleString('ru-RU', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  const containers = Array.isArray(project.containers) ? project.containers : [];
  view.summary.textContent = `Контейнеры · ${containers.length}`;
  const fingerprint = JSON.stringify(containers);
  if (view.containerList.dataset.value !== fingerprint) {
    view.containerList.dataset.value = fingerprint;
    view.containerList.replaceChildren(...containers.map(container => {
      const row = node('li');
      const states = {running:'работает', stopped:'остановлен', exited:'остановлен', created:'создан', restarting:'перезапуск', paused:'пауза', dead:'ошибка'};
      const health = {healthy:'исправен', unhealthy:'неисправен', starting:'проверяется'};
      row.append(node('span', 'container-name', container.name), node('span', 'container-state', [states[container.state] || container.state, health[container.health] || container.health].filter(Boolean).join(' · ')));
      return row;
    }));
    if (!containers.length) view.containerList.append(node('li', '', 'Нет запущенных контейнеров или Docker недоступен.'));
  }
  const busy = pending.has(project.id) || job?.status === 'running';
  const disabled = busy || !connected || !csrf;
  view.start.disabled = disabled || (status === 'running' && project.tunnelRunning);
  view.hide.disabled = disabled || !project.tunnelRunning;
  view.stop.disabled = disabled || (status === 'stopped' && !project.tunnelRunning);
  view.start.textContent = busy ? 'Выполняется…' : status === 'running' && !project.tunnelRunning ? 'Открыть доступ' : 'Запустить демо';
  view.card.setAttribute('aria-busy', String(busy));
}
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {...options, signal:controller.signal, credentials:'same-origin', cache:'no-store'});
    if (!response.ok) {
      const error = new Error(response.status === 403 ? 'Доступ не подтверждён. Обновите страницу и повторите действие.' : response.status === 409 ? 'Для проекта уже выполняется операция. Дождитесь её завершения.' : 'Локальная панель не смогла выполнить запрос. Проверьте, что Docker и сервер панели запущены.');
      error.displayMessage = error.message;
      throw error;
    }
    return await response.json();
  } finally { clearTimeout(timeout); }
}
async function refresh() {
  if (refreshing) return;
  refreshing = true; $('refresh').disabled = true;
  const version = stateVersion;
  try {
    const state = await request('/api/state');
    if (version !== stateVersion) return;
    if (!Array.isArray(state.projects) || typeof state.csrf !== 'string') throw new Error('Панель вернула неполный статус. Повторите обновление.');
    csrf = state.csrf; connected = true;
    projects = new Map(state.projects.map(project => [project.id, project]));
    $('loading')?.remove(); $('empty-state')?.remove();
    for (const [id, view] of cards) if (!projects.has(id)) { view.card.remove(); cards.delete(id); }
    for (const project of projects.values()) updateCard(project);
    if (!projects.size) { const empty = node('div', 'empty', 'Проекты ещё не настроены. Добавьте их в конфигурацию локальной панели.'); empty.id = 'empty-state'; $('projects').append(empty); }
    $('connection').textContent = `Панель подключена · проектов: ${projects.size}`;
    $('connection').className = 'connected';
    $('updated').textContent = `Проверено в ${new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;
    $('global-error').hidden = true;
  } catch (error) {
    connected = false;
    $('loading')?.remove();
    $('connection').textContent = 'Нет связи с локальной панелью'; $('connection').className = 'offline';
    $('global-error').textContent = error.name === 'AbortError' ? 'Панель не ответила за 10 секунд. Проверьте локальный сервер и повторите обновление.' : errorMessage(error);
    $('global-error').hidden = false;
    for (const project of projects.values()) updateCard(project);
  } finally { refreshing = false; $('refresh').disabled = false; $('projects').setAttribute('aria-busy', 'false'); }
}
async function runAction(id, action) {
  const project = projects.get(id);
  if (!project || pending.has(id) || project.job?.status === 'running' || !connected || !csrf) return;
  stateVersion++; pending.add(id); updateCard(project);
  try {
    const result = await request(`/api/projects/${encodeURIComponent(id)}/actions`, {method:'POST', headers:{'Content-Type':'application/json','X-Admin-CSRF':csrf}, body:JSON.stringify({action})});
    // Accept both a direct job response and a named job envelope.
    const job = result.job || result;
    if (job && job.status) project.job = job;
    announce(`${actionNames[action]}: запрос принят.`);
    await refresh();
  } catch (error) {
    const view = cards.get(id);
    if (!error.displayMessage) connected = false;
    if (view) { view.error.hidden = false; view.error.textContent = errorMessage(error); }
    announce('Не удалось подтвердить операцию. Проверьте сообщение в карточке проекта.');
  } finally {
    pending.delete(id);
    // Keep action errors visible until the next state update.
    const view = cards.get(id), message = view && !view.error.hidden ? view.error.textContent : null;
    if (projects.has(id)) updateCard(projects.get(id));
    if (message && view) { view.error.hidden = false; view.error.textContent = message; }
  }
}
$('refresh').addEventListener('click', refresh);
$('cancel-stop').addEventListener('click', () => $('stop-dialog').close());
$('stop-dialog').addEventListener('close', () => { stopProject = null; });
$('confirm-stop').addEventListener('click', () => { const id = stopProject; $('stop-dialog').close(); if (id) void runAction(id, 'stop'); });
void refresh();
setInterval(refresh, 5000);
