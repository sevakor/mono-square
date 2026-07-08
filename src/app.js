import { DIFFICULTIES, STAIRS, SCHEMES, applyDifficultyOverrides, byDifficulty, buildMixedSequence, shuffle, takeFromQueue, toMatrix } from './domain.js';
import { loadState, saveState, resetProgress } from './storage.js';

const app = document.querySelector('#app');
const state = loadState();
if (Array.isArray(state.visibleDifficulties)) {
  state.visibleDifficulties = { select: [...state.visibleDifficulties], mix: [...state.visibleDifficulties] };
}
state.visibleDifficulties = state.visibleDifficulties || { select: [1,2,3,4], mix: [1,2,3,4] };
state.visibleDifficulties.select ||= [1,2,3,4];
state.visibleDifficulties.mix ||= [1,2,3,4];
Object.keys(state.difficultyOverrides).forEach(id => {
  const scheme = SCHEMES.find(item => item.id === id);
  if (scheme && Number(state.difficultyOverrides[id]) === scheme.baseDifficulty) delete state.difficultyOverrides[id];
});
applyDifficultyOverrides(state.difficultyOverrides);
saveState(state);
let route = location.hash.slice(1) || '/';
let unlockTimer;
const difficulty = id => DIFFICULTIES.find(d => d.id === Number(id));

const escapeHtml = value => String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const icon = name => `<span class="icon" aria-hidden="true">${name}</span>`;
const button = (label, action, classes = 'primary', attrs = '') => `<button class="button ${classes}" data-action="${action}" ${attrs}>${label}</button>`;
const shell = (content, title = '', back = '', showSettings = true) => `
  <main class="shell">
    ${title ? `<header class="topbar">${back ? `<button class="icon-button" data-action="go" data-to="${back}" aria-label="Назад">←</button>` : '<span></span>'}<h1>${title}</h1>${showSettings ? '<button class="icon-button" data-action="settings" aria-label="Налаштування">⚙</button>' : '<span></span>'}</header>` : ''}
    ${content}
  </main>`;

function navigate(to) { location.hash = to; }
function persist() { saveState(state); }
function render() {
  clearTimeout(unlockTimer);
  route = location.hash.slice(1) || '/';
  const routes = { '/': home, '/select': selectScreen, '/mix': mixScreen, '/stairs': stairsScreen, '/game': gameScreen, '/summary': summaryScreen, '/settings': settingsScreen, '/catalog': catalogScreen };
  (routes[route] || home)();
  window.scrollTo(0, 0);
}

function home() {
  app.innerHTML = shell(`<div class="home-content"><section class="hero">
    <h1>Квадро<span>грай</span></h1>
  </section>
  <section class="menu" aria-label="Режими гри">
    ${state.session ? button(`${icon('▶')} Продовжити гру`, 'continue', 'primary continue') : ''}
    ${button(`${icon('◉')} Моноскладність`, 'go', 'mode lilac', 'data-to="/select"')}
    ${button(`${icon('↗')} Сходинки`, 'go', 'mode mint', 'data-to="/stairs"')}
    ${button(`${icon('✦')} Мікс`, 'go', 'mode peach', 'data-to="/mix"')}
  </section>
  <button class="settings-link" data-action="settings">⚙ Налаштування</button></div>`);
}

function choiceCard(d, selected, multi = false) {
  return `<button class="choice ${selected ? 'selected' : ''}" data-action="difficulty" data-id="${d.id}" data-multi="${multi}">
    <span class="difficulty-dot" style="--tone:${d.color}">${d.icon}</span><strong>${d.name}</strong><span class="check">✓</span>
  </button>`;
}
function countPicker(selected) {
  return `<div class="segmented" role="group" aria-label="Кількість завдань">${[3,6,9,12].map(n => `<button data-action="count" data-count="${n}" class="${selected === n ? 'selected' : ''}">${n}</button>`).join('')}</div>`;
}

function selectScreen() {
  const available = DIFFICULTIES.filter(d => state.visibleDifficulties.select.includes(d.id));
  app.innerHTML = shell(`<div class="mode-settings mono-settings"><section class="panel"><h2>Складність</h2><div class="choices">${available.map(d => choiceCard(d, state.select.difficulty === d.id)).join('')}</div></section>
  <section class="panel"><h2>Кількість карток</h2>${countPicker(state.select.count)}</section>
  ${button('Почати гру', 'start-select', 'primary wide')}</div>`, 'Моноскладність', '/');
}

function mixScreen() {
  const available = DIFFICULTIES.filter(d => state.visibleDifficulties.mix.includes(d.id));
  app.innerHTML = shell(`<div class="mode-settings mix-settings"><section class="panel"><h2>Складність</h2><p class="settings-note mix-note">Оберіть щонайменше дві складності.</p><div class="choices">${available.map(d => choiceCard(d, state.mix.difficulties.includes(d.id), true)).join('')}</div></section>
  <section class="panel"><h2>Кількість карток</h2>${countPicker(state.mix.count)}</section>
  ${button('Почати гру →', 'start-mix', 'primary wide', state.mix.difficulties.length >= 2 ? '' : 'disabled')}</div>`, 'Мікс', '/');
}

function stairsScreen() {
  app.innerHTML = shell(`<div class="stairs-grid">${STAIRS.map((counts, i) => {
    const level = i + 1, locked = level > state.stairs.unlocked, done = state.stairs.completed.includes(level);
    return `<button class="stair ${done ? 'done' : ''}" data-action="start-stairs" data-level="${level}" ${locked ? 'disabled' : ''}><span>${locked ? '🔒' : done ? '✓' : level}</span><strong>Рівень ${level}</strong></button>`;
  }).join('')}</div>`, 'Сходинки', '/');
}

function confirmExisting(start) {
  if (!state.session) return start();
  showModal('Гра вже триває', 'Продовжити попередню чи почати нову?', [
    ['Продовжити попередню', 'continue', 'primary'], ['Почати нову', 'confirm-new', 'secondary']
  ], start);
}
function createSession(mode, sequence, parameters) {
  state.session = { mode, parameters, sequence, currentIndex: 0, results: sequence.map(() => 'pending'), retryQueue: [], phase: 'main', controlsAvailableAt: Date.now() + 2500, startedAt: Date.now(), completedCount: 0, skipCount: 0 };
  persist(); navigate('/game');
}
function startSelect() {
  confirmExisting(() => {
    const ids = takeFromQueue(state, state.select.difficulty, state.select.count);
    createSession('select', ids, { ...state.select });
  });
}
function startMix() {
  confirmExisting(() => createSession('mix', buildMixedSequence(state, state.mix.difficulties, state.mix.count), { ...state.mix, difficulties: [...state.mix.difficulties] }));
}
function startStairs(level) {
  confirmExisting(() => {
    const used = new Set(state.stairs.used || []); let ids = [];
    STAIRS[level - 1].forEach((count, i) => { ids.push(...takeFromQueue(state, i + 1, count, used)); ids.forEach(id => used.add(id)); });
    ids = shuffle(ids); state.stairs.used = [...used];
    createSession('stairs', ids, { level });
  });
}

function sessionLabel(s) {
  if (s.mode === 'stairs') return `Сходинки · рівень ${s.parameters.level}`;
  if (s.mode === 'mix') return 'Мікс';
  return `Моноскладність · ${difficulty(s.parameters.difficulty).name.toLowerCase()}`;
}
function matrixHtml(scheme) {
  const matrix = toMatrix(scheme.tiles);
  const cells = matrix.map((row, r) => row.map((black, c) =>
    `<span class="cell ${black ? 'black' : ''} ${r === 1 ? 'h-split' : ''} ${c === 1 ? 'v-split' : ''}"></span>`
  ).join('')).join('');
  return `<div class="matrix" role="img" aria-label="Схема 4 на 4">${cells}</div>`;
}
function progressHtml(s) {
  const retryIndex = s.phase === 'retry' ? s.sequence.indexOf(s.retryQueue[0]) : -1;
  return `<div class="progress-row" aria-label="Прогрес">${s.results.map((result, i) => {
    const current = s.phase === 'main' ? i === s.currentIndex : i === retryIndex;
    const symbol = current && s.phase === 'retry' ? i + 1 : result === 'completed' ? '✓' : result === 'skipped' ? '×' : i + 1;
    return `<span class="progress-mark ${result} ${current ? 'current' : ''} ${current && s.phase === 'retry' ? 'retry-current' : ''}">${symbol}</span>`;
  }).join('')}</div>`;
}
function gameScreen(showRetryPrompt = false) {
  const s = state.session;
  if (!s) return navigate('/');
  const id = s.phase === 'retry' ? s.retryQueue[0] : s.sequence[s.currentIndex];
  const scheme = SCHEMES.find(item => item.id === id);
  if (!scheme) return finishSession();
  const locked = Date.now() < s.controlsAvailableAt;
  app.innerHTML = `<main class="game-shell game-${s.mode}"><header class="game-head"><strong>${sessionLabel(s)}</strong><button class="text-button" data-action="finish-menu">Завершити</button></header>
    ${progressHtml(s)}
    <section class="board-area">${matrixHtml(scheme)}</section>
    <section class="game-actions">${button('Готово!', 'complete', 'primary huge', locked ? 'disabled' : '')}${button('Пропустити', 'skip', 'ghost', locked ? 'disabled' : '')}</section></main>`;
  if (locked) unlockTimer = setTimeout(() => {
    if (route !== '/game' || state.session !== s) return;
    app.querySelectorAll('[data-action="complete"], [data-action="skip"]').forEach(control => { control.disabled = false; });
  }, Math.max(0, s.controlsAvailableAt - Date.now()));
  if (showRetryPrompt) {
    const toast = document.createElement('div');
    toast.className = 'toast retry-toast';
    toast.textContent = 'Ще одна спроба';
    app.append(toast);
    setTimeout(() => toast.remove(), 1850);
  }
}
function advance() {
  const s = state.session;
  if (s.phase === 'main') {
    s.currentIndex += 1;
    if (s.currentIndex >= s.sequence.length) {
      if (s.mode === 'stairs' && s.retryQueue.length) s.phase = 'retry'; else return finishSession();
    }
  } else if (!s.retryQueue.length) return finishSession();
  s.controlsAvailableAt = Date.now() + 2500; persist(); gameScreen(s.phase === 'retry');
}
function complete() {
  const s = state.session; if (!s || Date.now() < s.controlsAvailableAt) return;
  if (s.phase === 'main') s.results[s.currentIndex] = 'completed';
  else {
    const completedId = s.retryQueue.shift();
    const originalIndex = s.sequence.indexOf(completedId);
    if (originalIndex >= 0) s.results[originalIndex] = 'completed';
  }
  s.completedCount += 1; beep(660);
  document.querySelector('.board-area')?.classList.add('celebrate');
  const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = 'Готово!'; app.append(toast);
  persist(); setTimeout(advance, 700);
}
function skip() {
  const s = state.session; if (!s || Date.now() < s.controlsAvailableAt) return;
  if (s.phase === 'main') { s.results[s.currentIndex] = 'skipped'; if (s.mode === 'stairs') s.retryQueue.push(s.sequence[s.currentIndex]); }
  else { const id = s.retryQueue.shift(); s.retryQueue.push(id); }
  s.skipCount += 1; persist(); advance();
}
function finishSession() {
  const s = state.session; if (!s) return navigate('/');
  if (s.mode === 'stairs' && !s.retryQueue.length && s.currentIndex >= s.sequence.length) {
    const level = s.parameters.level;
    if (!state.stairs.completed.includes(level)) state.stairs.completed.push(level);
    state.stairs.unlocked = Math.max(state.stairs.unlocked, Math.min(12, level + 1));
  }
  state.summary = { mode: s.mode, parameters: s.parameters, completed: s.completedCount, skipped: s.skipCount, total: s.sequence.length };
  state.session = null; persist(); navigate('/summary');
}

function summaryScreen() {
  const s = state.summary; if (!s) return navigate('/');
  const label = s.mode === 'stairs' ? `Рівень ${s.parameters.level}` : s.mode === 'mix' ? 'Мікс' : difficulty(s.parameters.difficulty).name;
  app.innerHTML = shell(`<section class="summary"><h1>Браво!</h1><div class="confetti" aria-hidden="true">★ ★ ★</div><div class="summary-card"><strong>${label}</strong><div><span><b>✓ ${s.completed}</b> завершено</span><span><b>× ${s.skipped}</b> пропущено</span></div></div>
    ${s.mode === 'stairs' && s.parameters.level < 12 ? button('Наступний рівень →', 'next-level', 'primary wide') : button('Зіграти ще', 'replay', 'primary wide')}
    ${button('На головну', 'go', 'ghost wide', 'data-to="/"')}</section>`);
}

function settingsScreen() {
  const returnRoute = sessionStorage.getItem('settings-return') || '/';
  const modeSettings = returnRoute === '/select'
    ? `<section class="panel"><h2>Показувати складності</h2><div class="choices compact">${DIFFICULTIES.map(d => choiceCard(d, state.visibleDifficulties.select.includes(d.id), true)).join('')}</div><p class="settings-note">Щонайменше одна складність має залишатися.</p></section>`
    : returnRoute === '/mix'
      ? `<section class="panel"><h2>Показувати складності</h2><div class="choices compact">${DIFFICULTIES.map(d => choiceCard(d, state.visibleDifficulties.mix.includes(d.id), true)).join('')}</div><p class="settings-note">Для «Міксу» мають залишатися щонайменше дві складності.</p></section>`
      : returnRoute === '/stairs'
        ? `<section class="panel danger-zone"><h2>Прогрес «Сходинок»</h2>${button('Скинути прогрес', 'reset-progress', 'danger')}</section>`
        : '';
  app.innerHTML = shell(`<section class="panel settings"><label class="toggle"><span><strong>Звук</strong></span><input type="checkbox" data-setting="sound" ${state.sound ? 'checked' : ''}><i></i></label></section>${modeSettings}`, 'Налаштування', returnRoute, false);
}

function miniMatrix(scheme) {
  const cells = toMatrix(scheme.tiles).flat().map(black => `<i class="${black ? 'black' : ''}"></i>`).join('');
  return `<div class="mini-matrix" role="img" aria-label="Схема ${scheme.id}">${cells}</div>`;
}

function catalogScreen() {
  const counts = DIFFICULTIES.map(d => byDifficulty(d.id).length);
  const groups = DIFFICULTIES.map(d => {
    const schemes = byDifficulty(d.id);
    return `<section class="catalog-group"><header><div><span class="difficulty-dot" style="--tone:${d.color}">${d.icon}</span><h2>${d.name}</h2></div><p>${schemes.length} схем</p></header><div class="catalog-grid">${schemes.map(s => `<button class="catalog-card ${state.difficultyOverrides[s.id] ? 'edited' : ''}" data-action="edit-scheme" data-id="${s.id}" title="${s.id}: ${s.tiles.join(' · ')}; симетрій: ${s.features.symmetries}">${miniMatrix(s)}<small>${s.id.slice(2).toUpperCase()}</small>${state.difficultyOverrides[s.id] ? '<b>✎</b>' : ''}</button>`).join('')}</div></section>`;
  }).join('');
  const reset = Object.keys(state.difficultyOverrides).length ? button('Скинути ручні правки', 'reset-overrides', 'ghost wide') : '';
  app.innerHTML = shell(`<section class="catalog-note"><strong>Ручне редагування</strong><p>Натисніть схему та оберіть для неї іншу складність. Зміни зберігаються автоматично й позначаються символом ✎.</p><p>Зараз: <b>${counts[0]} легких · ${counts[1]} середні · ${counts[2]} складних · ${counts[3]} надскладних</b>.</p>${button('Зафіксувати розподіл у файл', 'export-classification', 'primary wide')}${reset}</section>${groups}`, 'Каталог схем', '/settings');
}

function exportClassification() {
  const catalog = {
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: Object.fromEntries(DIFFICULTIES.map(d => [d.id, byDifficulty(d.id).length])),
    schemes: Object.fromEntries(SCHEMES.map(scheme => [scheme.id, scheme.difficulty]))
  };
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'four-squares-difficulties.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function editScheme(id) {
  const scheme = SCHEMES.find(item => item.id === id);
  if (!scheme) return;
  const choices = DIFFICULTIES.map(d => [
    `${scheme.difficulty === d.id ? '✓ ' : ''}${d.name}`,
    'set-scheme-difficulty',
    scheme.difficulty === d.id ? 'primary' : 'secondary',
    d.id
  ]);
  const modal = document.createElement('div');
  modal.className = 'modal-wrap';
  modal.dataset.schemeId = id;
  modal.innerHTML = `<div class="modal scheme-editor" role="dialog" aria-modal="true"><h2>Схема ${id.slice(2).toUpperCase()}</h2>${miniMatrix(scheme)}<p>До якої складності її віднести?</p><div>${choices.map(([label, action, cls, value]) => button(label, action, cls, `data-difficulty="${value}"`)).join('')}${state.difficultyOverrides[id] ? button('Повернути автоматичну', 'clear-scheme-difficulty', 'ghost') : ''}${button('Скасувати', 'close-modal', 'ghost')}</div></div>`;
  app.append(modal);
}

function showModal(title, text, actions, callback) {
  const modal = document.createElement('div'); modal.className = 'modal-wrap';
  modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><p>${text}</p><div>${actions.map(([label, action, cls]) => button(label, action, cls)).join('')}</div></div>`;
  modal._callback = callback; app.append(modal); modal.querySelector('button')?.focus();
}
function finishMenu() {
  showModal('Завершити гру?', 'Поточна сесія збережена, доки ти не підеш на головну або до налаштувань режиму.', [
    ['Продовжити гру', 'close-modal', 'primary'], ['На головну', 'discard-home', 'secondary'], ['До налаштувань режиму', 'discard-mode', 'ghost']
  ]);
}
function beep(frequency) {
  if (!state.sound) return;
  try { const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value = frequency; gain.gain.setValueAtTime(.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .18); osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .18); } catch {}
}

app.addEventListener('click', event => {
  const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action;
  if (action === 'go') navigate(el.dataset.to);
  else if (action === 'settings') { sessionStorage.setItem('settings-return', route); navigate('/settings'); }
  else if (action === 'continue') navigate('/game');
  else if (action === 'count') { const target = route === '/mix' ? state.mix : state.select; target.count = Number(el.dataset.count); persist(); render(); }
  else if (action === 'difficulty') {
    const id = Number(el.dataset.id), settingsMode = sessionStorage.getItem('settings-return');
    const target = route === '/settings' ? state.visibleDifficulties[settingsMode === '/mix' ? 'mix' : 'select'] : state.mix.difficulties;
    if (el.dataset.multi === 'true') {
      const index = target.indexOf(id), minimum = route === '/mix' || (route === '/settings' && settingsMode === '/mix') ? 2 : 1;
      if (index >= 0 && target.length > minimum) target.splice(index, 1); else if (index < 0) target.push(id);
      if (route === '/settings' && settingsMode === '/select' && !target.includes(state.select.difficulty)) state.select.difficulty = target[0];
      if (route === '/settings' && settingsMode === '/mix') state.mix.difficulties = state.mix.difficulties.filter(value => target.includes(value));
    } else state.select.difficulty = id;
    persist(); render();
  } else if (action === 'start-select') startSelect();
  else if (action === 'start-mix') startMix();
  else if (action === 'start-stairs') startStairs(Number(el.dataset.level));
  else if (action === 'complete') complete();
  else if (action === 'skip') skip();
  else if (action === 'finish-menu') finishMenu();
  else if (action === 'close-modal') el.closest('.modal-wrap').remove();
  else if (action === 'confirm-new') { const modal = el.closest('.modal-wrap'); state.session = null; modal._callback(); }
  else if (action === 'discard-home') { state.session = null; persist(); navigate('/'); }
  else if (action === 'discard-mode') { const mode = state.session.mode; state.session = null; persist(); navigate(mode === 'stairs' ? '/stairs' : mode === 'mix' ? '/mix' : '/select'); }
  else if (action === 'reset-progress') {
    showModal('Скинути прогрес?', 'Усі відкриті та завершені рівні «Сходинок» буде видалено. Цю дію неможливо скасувати.', [
      ['Скасувати', 'close-modal', 'secondary'], ['Скинути прогрес', 'confirm-reset-progress', 'danger']
    ]);
  }
  else if (action === 'confirm-reset-progress') { resetProgress(state); persist(); el.closest('.modal-wrap').remove(); render(); }
  else if (action === 'replay') navigate(safeModeRoute(state.summary.mode));
  else if (action === 'next-level') startStairs(state.summary.parameters.level + 1);
  else if (action === 'edit-scheme') editScheme(el.dataset.id);
  else if (action === 'set-scheme-difficulty') {
    const modal = el.closest('.modal-wrap'), id = modal.dataset.schemeId;
    state.difficultyOverrides[id] = Number(el.dataset.difficulty);
    applyDifficultyOverrides(state.difficultyOverrides); state.queues = {}; persist(); modal.remove(); catalogScreen();
  }
  else if (action === 'clear-scheme-difficulty') {
    const modal = el.closest('.modal-wrap'); delete state.difficultyOverrides[modal.dataset.schemeId];
    applyDifficultyOverrides(state.difficultyOverrides); state.queues = {}; persist(); modal.remove(); catalogScreen();
  }
  else if (action === 'reset-overrides') {
    if (confirm('Скинути всі ручні зміни складності?')) { state.difficultyOverrides = {}; applyDifficultyOverrides({}); state.queues = {}; persist(); catalogScreen(); }
  }
  else if (action === 'export-classification') exportClassification();
});
app.addEventListener('change', event => { if (event.target.dataset.setting === 'sound') { state.sound = event.target.checked; persist(); } });
const safeModeRoute = mode => mode === 'stairs' ? '/stairs' : mode === 'mix' ? '/mix' : '/select';
window.addEventListener('hashchange', render);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
render();
