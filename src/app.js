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
const homeIcon = name => {
  const icons = {
    mono: '<svg viewBox="0 0 34 34"><path fill-rule="evenodd" clip-rule="evenodd" d="M15.0793 8.09057C15.9367 6.63648 18.0633 6.63648 18.9214 8.09057L20.742 11.1788C20.8456 11.3544 20.9851 11.5067 21.1516 11.6262C21.318 11.7456 21.5079 11.8295 21.709 11.8725L25.2458 12.6285C26.9108 12.9848 27.5681 14.9827 26.4329 16.237L24.0217 18.9022C23.8846 19.0538 23.781 19.2318 23.7175 19.4251C23.654 19.6184 23.6319 19.8226 23.6526 20.0248L24.0172 23.5799C24.1884 25.2542 22.4685 26.4888 20.9087 25.8104L17.598 24.3687C17.4097 24.2868 17.2062 24.2445 17.0004 24.2445C16.7946 24.2445 16.5911 24.2868 16.4028 24.3687L13.0913 25.8104C11.5322 26.4888 9.81162 25.2542 9.98353 23.5799L10.3474 20.0248C10.3681 19.8226 10.346 19.6184 10.2825 19.4251C10.219 19.2318 10.1154 19.0538 9.97834 18.9022L7.56715 16.237C6.43194 14.9827 7.08921 12.9848 8.75422 12.6292L12.291 11.8725C12.4921 11.8295 12.682 11.7456 12.8484 11.6262C13.0149 11.5067 13.1544 11.3544 13.258 11.1788L15.0793 8.09057Z"/></svg>',
    stairs: '<svg viewBox="0 0 34 34"><path fill-rule="evenodd" clip-rule="evenodd" d="M24.26 8.2C23.6906 8.2 23.2321 8.25671 22.8757 8.3318C22.0776 8.49998 21.7159 9.16641 21.6987 9.7734C21.6684 10.8892 21.62 13.2163 21.62 16.9998C21.62 20.7833 21.6675 23.11 21.6992 24.2258C21.7159 24.8324 22.0776 25.4992 22.8757 25.667C23.2321 25.7425 23.6906 25.7992 24.26 25.7992C24.8293 25.7992 25.2878 25.7425 25.6442 25.667C26.4424 25.4989 26.8041 24.8328 26.8212 24.2258C26.852 23.11 26.9 20.7829 26.9 16.9998C26.9 13.2163 26.8525 10.8896 26.8208 9.7738C26.8041 9.16681 26.4424 8.50037 25.6442 8.33219C25.2878 8.2571 24.8293 8.20039 24.26 8.20039M17 12.1091C16.5191 12.1091 16.1195 12.1404 15.7948 12.1853C14.9113 12.3066 14.4506 13.0153 14.4286 13.7063C14.3978 14.6516 14.36 16.3557 14.36 18.9538C14.36 21.5518 14.3983 23.2559 14.4286 24.2012C14.4506 24.8923 14.9113 25.6009 15.7948 25.7226C16.1938 25.7751 16.5967 25.8005 17 25.7984C17.4809 25.7984 17.8809 25.7671 18.2051 25.7222C19.0887 25.6009 19.5493 24.8923 19.5713 24.2012C19.6021 23.2563 19.64 21.5518 19.64 18.9538C19.64 16.3557 19.6017 14.6516 19.5713 13.7063C19.5493 13.0153 19.0887 12.3066 18.2051 12.1849C17.8062 12.1325 17.4033 12.1073 17 12.1095M8.78958 17.6451C9.10595 17.6267 9.42293 17.6179 9.73998 17.6185C10.1047 17.6185 10.4207 17.6291 10.6904 17.6451C11.6782 17.7046 12.3069 18.4528 12.3386 19.2791C12.3606 19.8502 12.38 20.6515 12.38 21.7091C12.38 22.7666 12.3606 23.5676 12.3386 24.1394C12.3069 24.9654 11.6782 25.7136 10.6908 25.773C10.4207 25.7894 10.1047 25.8 9.73998 25.8C9.37522 25.8 9.0593 25.7894 8.78958 25.773C7.80178 25.7136 7.17302 24.9654 7.14134 24.1394C7.11934 23.5676 7.09998 22.7666 7.09998 21.7091C7.09998 20.6515 7.11934 19.8506 7.14134 19.2791C7.17302 18.4528 7.80222 17.7046 8.78958 17.6451Z"/></svg>',
    mixer: '<svg viewBox="0 0 34 34"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.25 11.1667C13.25 10.1721 13.645 9.21827 14.3483 8.51501C15.0516 7.81175 16.0054 7.41666 17 7.41666C17.9945 7.41666 18.9483 7.81175 19.6516 8.51501C20.3549 9.21827 20.75 10.1721 20.75 11.1667C20.75 12.1612 20.3549 13.1151 19.6516 13.8183C18.9483 14.5216 17.9945 14.9167 17 14.9167C16.0054 14.9167 15.0516 14.5216 14.3483 13.8183C13.645 13.1151 13.25 12.1612 13.25 11.1667ZM17 19.0833C16.0054 19.0833 15.0516 19.4784 14.3483 20.1817C13.645 20.8849 13.25 21.8388 13.25 22.8333C13.25 23.8279 13.645 24.7817 14.3483 25.485C15.0516 26.1882 16.0054 26.5833 17 26.5833C17.9945 26.5833 18.9483 26.1882 19.6516 25.485C20.3549 24.7817 20.75 23.8279 20.75 22.8333C20.75 21.8388 20.3549 20.8849 19.6516 20.1817C18.9483 19.4784 17.9945 19.0833 17 19.0833ZM19.0833 17C19.0833 16.0054 19.4784 15.0516 20.1816 14.3483C20.8849 13.6451 21.8387 13.25 22.8333 13.25C23.8279 13.25 24.7817 13.6451 25.4849 14.3483C26.1882 15.0516 26.5833 16.0054 26.5833 17C26.5833 17.9946 26.1882 18.9484 25.4849 19.6516C24.7817 20.3549 23.8279 20.75 22.8333 20.75C21.8387 20.75 20.8849 20.3549 20.1816 19.6516C19.4784 18.9484 19.0833 17.9946 19.0833 17ZM11.1666 13.25C10.1721 13.25 9.21824 13.6451 8.51498 14.3483C7.81171 15.0516 7.41663 16.0054 7.41663 17C7.41663 17.9946 7.81171 18.9484 8.51498 19.6516C9.21824 20.3549 10.1721 20.75 11.1666 20.75C12.1612 20.75 13.115 20.3549 13.8183 19.6516C14.5215 18.9484 14.9166 17.9946 14.9166 17C14.9166 16.0054 14.5215 15.0516 13.8183 14.3483C13.115 13.6451 12.1612 13.25 11.1666 13.25Z"/></svg>'
  };
  return `<span class="icon" aria-hidden="true">${icons[name]}</span>`;
};
const uiIcons = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12 3.5 12M10 5 3 12l7 7"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5V9.5C4 9.18333 4.071 8.88333 4.213 8.6C4.355 8.31667 4.55067 8.08333 4.8 7.9L10.8 3.4C11.15 3.13333 11.55 3 12 3C12.45 3 12.85 3.13333 13.2 3.4L19.2 7.9C19.45 8.08333 19.646 8.31667 19.788 8.6C19.93 8.88333 20.0007 9.18333 20 9.5V18.5C20 19.05 19.804 19.521 19.412 19.913C19.02 20.305 18.5493 20.5007 18 20.5H15C14.7167 20.5 14.4793 20.404 14.288 20.212C14.0967 20.02 14.0007 19.7827 14 19.5V14.5C14 14.2167 13.904 13.9793 13.712 13.788C13.52 13.5967 13.2827 13.5007 13 13.5H11C10.7167 13.5 10.4793 13.596 10.288 13.788C10.0967 13.98 10.0007 14.2173 10 14.5V19.5C10 19.7833 9.904 20.021 9.712 20.213C9.52 20.405 9.28267 20.5007 9 20.5H6C5.45 20.5 4.97933 20.3043 4.588 19.913C4.19667 19.5217 4.00067 19.0507 4 18.5Z"/></svg>',
  play: '<svg viewBox="0 0 34 34" aria-hidden="true"><path d="M25 14.7679C26.3333 15.5377 26.3333 17.4623 25 18.2321L13.75 24.7272C12.4167 25.497 10.75 24.5348 10.75 22.9952V10.0048C10.75 8.46521 12.4167 7.50296 13.75 8.27276L25 14.7679Z"/></svg>',
  forward: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h17.5M14 5l7 7-7 7"/></svg>',
  settings: '<svg viewBox="0 0 20 13" aria-hidden="true"><path d="M1 2.5h17.5M1 10.5h17.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="5.5" cy="2.5" r="2.5" fill="currentColor"/><circle cx="13.5" cy="10.5" r="2.5" fill="currentColor"/></svg>',
  check: '<svg viewBox="0 0 10 8" aria-hidden="true"><path d="M9.78125 1.46403c0 .16828-.0589.31132-.17669.42912L5.03577 6.46194l-.85823.85822a.585.585 0 0 1-.42911.17669.585.585 0 0 1-.42912-.17669L2.46109 6.46194.176694 4.17754A.585.585 0 0 1 0 3.74843c0-.16828.058898-.31132.176694-.42912l.858226-.85822a.585.585 0 0 1 .42911-.17669c.16828 0 .31132.05889.42912.17669l1.85528 1.86159L7.8881.176694A.585.585 0 0 1 8.31722 0c.16828 0 .31132.058898.42911.176694l.85823.858226c.11779.1178.17669.26083.17669.42911Z"/></svg>',
  lock: '<svg viewBox="0 0 18 20" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M0 10a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3v-7Zm10 2a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0v-3Z"/><path d="M5 8V5a4 4 0 0 1 8 0v3"/></svg>',
  starSelect: '<svg viewBox="0 0 19 19" aria-hidden="true"><path d="M19 9.5C19.0021 9.7785 18.9175 10.0507 18.7578 10.2789C18.5982 10.5071 18.3714 10.6798 18.1091 10.7731L12.7264 12.7311L10.7698 18.1146C10.6734 18.3745 10.4997 18.5986 10.2722 18.7569C10.0447 18.9152 9.77423 19 9.4971 19C9.21998 19 8.94949 18.9152 8.72198 18.7569C8.49447 18.5986 8.32084 18.3745 8.2244 18.1146L6.26783 12.7303L.885143 10.7731C.625339 10.6766.401271 10.5029.243042 10.2754.0848118 10.0478 0 9.77721 0 9.5 0 9.22279.0848118 8.95222.243042 8.72464.401271 8.49706.625339 8.32337.885143 8.22691L6.26783 6.26974 8.2244.885413C8.32084.62553 8.49447.401394 8.72198.243116 8.94949.0848377 9.21998 0 9.4971 0 9.77423 0 10.0447.0848377 10.2722.243116 10.4997.401394 10.6734.62553 10.7698.885413L12.7272 6.26974 18.1091 8.22691C18.3714 8.32021 18.5982 8.49294 18.7578 8.7211 18.9175 8.94926 19.0021 9.22151 19 9.5Z"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.47843 2.19244a.767.767 0 0 1 1.06257 1.06413l-.0996.1196-1.75723 1.7572h8.11593a6.9 6.9 0 1 1 0 13.80003h-6.1333a.767.767 0 0 1 0-1.5334h6.1333a5.3667 5.3667 0 1 0 0-10.73329H8.68417L10.4414 8.42544l.0996.1196a.767.767 0 0 1-1.06257 1.0626l-.12113-.09813-3.06667-3.06667a.767.767 0 0 1 0-1.08407L9.3573 2.29211l.12113-.09967Z"/></svg>',
  cross: '<svg viewBox="0 0 9 9" aria-hidden="true"><path d="M8.43929 1.78334a.5.5 0 0 0 0-.70711L7.50953.146461a.5.5 0 0 0-.70711 0L4.6464 2.30248a.5.5 0 0 1-.70711 0L1.78327.146461a.5.5 0 0 0-.7071 0L.1464 1.07623a.5.5 0 0 0 0 .70711l2.15602 2.15601a.5.5 0 0 1 0 .70711L.1464 6.80248a.5.5 0 0 0 0 .70711l.92977.92976a.5.5 0 0 0 .70711 0l2.15601-2.15601a.5.5 0 0 1 .70711 0l2.15602 2.15601a.5.5 0 0 0 .7071 0l.92977-.92976a.5.5 0 0 0 0-.70711L6.28328 4.64646a.5.5 0 0 1 0-.70711l2.15601-2.15601Z"/></svg>',
  skip: '<svg viewBox="0 0 25 20" aria-hidden="true"><path d="M10.2658 6.3625 4.43196.679704a1 1 0 0 0-1.39554 0L.735361 2.92118a1 1 0 0 0 0 1.43264l5.060899 4.92986a1 1 0 0 1 0 1.43262L.735359 15.6462a1 1 0 0 0 0 1.4326l2.301061 2.2415a1 1 0 0 0 1.39554 0l5.83384-5.6828 2.9988-2.9212a1 1 0 0 0 0-1.43262L10.2658 6.3625Z"/><path d="m21.2658 6.3625-5.8338-5.682796a1 1 0 0 0-1.3956.000001l-2.301 2.241475a1 1 0 0 0 0 1.43264l5.0609 4.92986a1 1 0 0 1 0 1.43262l-5.0609 4.9299a1 1 0 0 0 0 1.4326l2.301 2.2415a1 1 0 0 0 1.3956 0l5.8338-5.6828 2.9988-2.9212a1 1 0 0 0 0-1.43262L21.2658 6.3625Z"/></svg>',
  starLine: '<svg viewBox="0 0 16 15" aria-hidden="true"><path d="M6.89258 1.11719C7.38428.294399 8.61475.294184 9.10742 1.11719L10.5645 3.55566c.1189.19896.2784.37084.4677.50489.1894.13403.4047.22746.6319.27539l2.8291.59668c.9078.19176 1.2737 1.19114.792 1.88672l-.1075.13476L13.249 9.05859c-.1566.171-.2763.37288-.3496.59278-.0549.16482-.0825.33688-.083.50973l.0088.1739.291 2.8056c.0892.8613-.7558 1.5533-1.6191 1.3115l-.1729-.0615-2.64842-1.1377A1.71 1.71 0 0 0 8 13.1143c-.23201 0-.4617.0471-.6748.1386l-2.64942 1.1377c-.91865.3945-1.88755-.3315-1.79199-1.25l.29101-2.8056c.024-.2305-.00099-.46375-.07421-.68363a1.71 1.71 0 0 0-.23926-.45899l-.11035-.13379L.822266 6.9541c-.635888-.69355-.283441-1.81646.684574-2.02051l2.8291-.59765c.22714-.04793.4425-.14136.63183-.27539.18935-.13405.34884-.30593.46778-.50489L6.89258 1.11719Z"/></svg>',
  starFill: '<svg viewBox="0 0 16 15" aria-hidden="true"><path d="M6.46348.860973c.68586-1.147964 2.38718-1.147964 3.07364 0L10.9936 3.29902c.0829.13864.1945.25893.3276.35323.1332.09429.2851.16052.446.19447l2.8294.5968c1.332.28136 1.8578 1.85858.9497 2.84882l-1.929 2.10412c-.1096.11966-.1925.26026-.2433.41284-.0508.15259-.0685.3138-.0519.4734l.2917 2.8067c.1369 1.3218-1.239 2.2965-2.4868 1.7609l-2.64862-1.1381A1.21 1.21 0 0 0 8 13.614c-.16433 0-.32715.0335-.47779.0982l-2.6492 1.1381c-1.24725.5356-2.62372-.4391-2.48619-1.7609l.29107-2.8067c.01661-.1596-.00106-.32081-.05189-.4734-.05082-.15258-.13369-.29318-.24333-.41284L.453718 7.29234c-.908163-.99024-.382354-2.56746.949662-2.84824l2.82941-.59738c.16089-.03395.31277-.10018.44596-.19447.13319-.0943.24477-.21459.32763-.35323L6.46348.860973Z"/></svg>'
};
const stars = (count, filled) => `<span class="difficulty-stars">${Array.from({length: count}, () => filled ? uiIcons.starFill : uiIcons.starLine).join('')}</span>`;
const button = (label, action, classes = 'primary', attrs = '') => `<button class="button ${classes}" data-action="${action}" ${attrs}>${label}</button>`;
const shell = (content, title = '', back = '', showSettings = true) => `
  <main class="shell">
    ${title ? `<header class="topbar">${back ? `<button class="icon-button back-button" data-action="go" data-to="${back}" aria-label="Назад">${uiIcons.back}</button>` : '<span></span>'}<h1>${title}</h1>${showSettings ? `<button class="icon-button settings-button" data-action="settings" aria-label="Налаштування">${uiIcons.settings}</button>` : '<span></span>'}</header>` : ''}
    ${content}
  </main>`;

function navigate(to) { location.hash = to; }
function persist() { saveState(state); }
function render() {
  clearTimeout(unlockTimer);
  route = location.hash.slice(1) || '/';
  const gameTone = state.session?.mode === 'stairs' ? '#F5B5CD' : state.session?.mode === 'mix' ? '#FCB92C' : '#2BB39B';
  const pageTone = route === '/game' ? gameTone : '#FAF5EF';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pageTone);
  document.body.style.background = pageTone;
  const routes = { '/': home, '/select': selectScreen, '/mix': mixScreen, '/stairs': stairsScreen, '/game': gameScreen, '/summary': summaryScreen, '/settings': settingsScreen, '/catalog': catalogScreen };
  (routes[route] || home)();
  window.scrollTo(0, 0);
}

function home() {
  app.innerHTML = shell(`<div class="home-content"><section class="hero">
    <h1>Квадро<span>грай</span></h1>
  </section>
  <section class="menu" aria-label="Режими гри">
    ${state.session ? button(`<span class="continue-icon">${uiIcons.play}</span>Продовжити гру`, 'continue', 'primary continue') : ''}
    ${button(`${homeIcon('mono')} Моноскладність`, 'go', 'mode lilac', 'data-to="/select"')}
    ${button(`${homeIcon('stairs')} Сходинки`, 'go', 'mode mint', 'data-to="/stairs"')}
    ${button(`${homeIcon('mixer')} Міксер`, 'go', 'mode peach', 'data-to="/mix"')}
  </section>
  </div>`);
}

function choiceCard(d, selected, multi = false) {
  return `<button class="choice ${selected ? 'selected' : ''}" data-action="difficulty" data-id="${d.id}" data-multi="${multi}">
    ${stars(d.id, selected)}<strong>${d.name}</strong><span class="check">${uiIcons.check}</span>
  </button>`;
}
function countPicker(selected) {
  return `<div class="segmented" role="group" aria-label="Кількість завдань">${[3,6,9,12].map(n => `<button data-action="count" data-count="${n}" class="${selected === n ? 'selected' : ''}">${n}</button>`).join('')}</div>`;
}

function selectScreen() {
  const available = [1,3,2,4].map(id => DIFFICULTIES.find(d => d.id === id)).filter(d => state.visibleDifficulties.select.includes(d.id));
  app.innerHTML = shell(`<div class="mode-settings mono-settings"><section class="panel"><h2>Складність</h2><div class="choices">${available.map(d => choiceCard(d, state.select.difficulty === d.id)).join('')}</div></section>
  <section class="panel"><h2>Кількість карток</h2>${countPicker(state.select.count)}</section>
  ${button(`Почати гру ${uiIcons.forward}`, 'start-select', 'primary wide')}</div>`, 'Моноскладність', '/');
}

function mixScreen() {
  const available = DIFFICULTIES.filter(d => state.visibleDifficulties.mix.includes(d.id));
  app.innerHTML = shell(`<div class="mode-settings mono-settings mix-settings"><section class="panel"><h2>Складність</h2><div class="choices">${available.map(d => choiceCard(d, state.mix.difficulties.includes(d.id), true)).join('')}</div></section>
  <section class="panel"><h2>Кількість карток</h2>${countPicker(state.mix.count)}</section>
  ${button(`Почати гру ${uiIcons.forward}`, 'start-mix', 'primary wide', state.mix.difficulties.length >= 2 ? '' : 'disabled')}</div>`, 'Міксер', '/');
}

function stairsScreen() {
  const currentLevel = state.stairs.unlocked;
  app.innerHTML = shell(`<div class="stairs-page"><div class="stairs-grid">${STAIRS.map((counts, i) => {
    const level = i + 1, locked = level > state.stairs.unlocked, done = state.stairs.completed.includes(level);
    const status = locked ? uiIcons.lock : done ? uiIcons.check : uiIcons.starSelect;
    return `<button class="stair ${done ? 'done' : locked ? 'locked' : 'current'}" data-action="start-stairs" data-level="${level}" ${locked ? 'disabled' : ''}><b>${level}</b><span class="stair-status">${status}</span></button>`;
  }).join('')}</div>${button(`Почати гру ${uiIcons.forward}`, 'start-stairs', 'primary wide stairs-start', `data-level="${currentLevel}"`)}</div>`, 'Сходинки', '/');
}

function confirmExisting(start) {
  if (!state.session) return start();
  showModal('Гра вже триває', 'Продовжити попередню чи почати нову?', [
    ['Продовжити попередню', 'continue', 'primary'], ['Почати нову', 'confirm-new', 'secondary']
  ], start);
}
function createSession(mode, sequence, parameters) {
  state.session = { mode, parameters, sequence, currentIndex: 0, results: sequence.map(() => 'pending'), retryQueue: [], phase: 'main', controlsAvailableAt: Date.now() + 1000, startedAt: Date.now(), completedCount: 0, skipCount: 0 };
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
  if (s.mode === 'mix') return 'Міксер';
  return `Моноскладність · ${difficulty(s.parameters.difficulty).name.toLowerCase()}`;
}
function sessionHeading(s) {
  if (s.mode === 'stairs') return `<strong>Сходинки<span>рівень ${s.parameters.level}</span></strong>`;
  if (s.mode === 'mix') return '<strong>Міксер</strong>';
  return `<strong>Моноскладність<span>${difficulty(s.parameters.difficulty).name.toLowerCase()}</span></strong>`;
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
  const total = s.results.length;
  const columns = total === 10 ? 5 : total === 12 ? 6 : 0;
  const layoutClass = columns ? 'progress-snake' : total === 9 ? 'progress-nine' : '';
  return `<div class="progress-row ${layoutClass}" ${columns ? `style="--progress-columns:${columns}"` : ''} aria-label="Прогрес">${s.results.map((result, i) => {
    const current = s.phase === 'main' ? i === s.currentIndex : i === retryIndex;
    const symbol = current && s.phase === 'retry' ? i + 1 : result === 'completed' ? uiIcons.check : result === 'skipped' ? uiIcons.cross : i + 1;
    const step = i + 1;
    const column = columns ? Math.ceil(step / 2) : 0;
    const firstInColumn = step % 2 === 1;
    const row = columns ? column % 2 === 1 ? (firstInColumn ? 1 : 2) : (firstInColumn ? 2 : 1) : 0;
    const connectorClass = columns && step < total ? firstInColumn ? (row === 1 ? 'snake-down' : 'snake-up') : 'snake-right' : '';
    const gridStyle = columns ? `style="grid-column:${column};grid-row:${row}"` : '';
    return `<span class="progress-mark ${result} ${current ? 'current' : ''} ${current && s.phase === 'retry' ? 'retry-current' : ''} ${connectorClass}" ${gridStyle}>${symbol}</span>`;
  }).join('')}</div>`;
}
function gameScreen(showRetryPrompt = false) {
  const s = state.session;
  if (!s) return navigate('/');
  const id = s.phase === 'retry' ? s.retryQueue[0] : s.sequence[s.currentIndex];
  const scheme = SCHEMES.find(item => item.id === id);
  if (!scheme) return finishSession();
  const locked = Date.now() < s.controlsAvailableAt;
  const hasSnakeProgress = s.results.length === 10 || s.results.length === 12;
  app.innerHTML = `<main class="game-shell game-${s.mode}"><header class="game-head"><button class="game-back" data-action="finish-menu" aria-label="Завершити гру">${uiIcons.back}</button>${sessionHeading(s)}</header>
    <div class="game-body ${hasSnakeProgress ? 'game-body-snake' : ''}">${progressHtml(s)}
      <section class="board-area">${matrixHtml(scheme)}</section>
      <section class="game-actions">${button(`Готово ${uiIcons.check}`, 'complete', 'primary huge', locked ? 'disabled' : '')}${button(`<span class="skip-label">Пропустити</span>${uiIcons.skip}`, 'skip', 'ghost', `${locked ? 'disabled ' : ''}aria-label="Пропустити"`)}</section>
    </div></main>`;
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
  s.controlsAvailableAt = Date.now() + 1000; persist(); gameScreen(s.phase === 'retry');
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
  const isStairs = s.mode === 'stairs';
  const result = isStairs
    ? `<div class="summary-level"><span>${uiIcons.check}</span><b>Рівень ${s.parameters.level}</b></div>`
    : `<div class="summary-card"><div class="summary-stat completed"><span>${uiIcons.check}</span><b>${s.completed}</b></div><div class="summary-stat skipped"><span>${uiIcons.cross}</span><b>${s.skipped}</b></div></div>`;
  const mainAction = isStairs && s.parameters.level < 12
    ? button(`Наступний рівень ${uiIcons.forward}`, 'next-level', 'primary summary-primary')
    : button(`Зіграти ще ${uiIcons.forward}`, 'replay', 'primary summary-primary');
  app.innerHTML = shell(`<section class="summary ${isStairs ? 'summary-stairs' : ''}"><div class="summary-main"><h1>Браво!</h1><div class="summary-stars" aria-hidden="true">${uiIcons.starFill}${uiIcons.starFill}${uiIcons.starFill}</div>${result}</div><div class="summary-actions">${mainAction}${button(`На головну ${uiIcons.home}`, 'go', 'ghost summary-home', 'data-to="/"')}</div></section>`);
}

function settingsScreen() {
  const returnRoute = sessionStorage.getItem('settings-return') || '/';
  const orderedDifficulties = [1,3,2,4].map(id => DIFFICULTIES.find(d => d.id === id));
  const modeSettings = returnRoute === '/select'
    ? `<section class="panel"><h2>Відображати складності</h2><div class="choices compact">${orderedDifficulties.map(d => choiceCard(d, state.visibleDifficulties.select.includes(d.id), true)).join('')}</div><p class="settings-note">Щонайменше одна складність має залишатися.</p></section>`
    : returnRoute === '/mix'
      ? `<section class="panel"><h2>Відображати складності</h2><div class="choices compact">${orderedDifficulties.map(d => choiceCard(d, state.visibleDifficulties.mix.includes(d.id), true)).join('')}</div><p class="settings-note">Для «Міксера» мають залишатися щонайменше дві складності.</p></section>`
      : returnRoute === '/stairs'
        ? `<section class="panel danger-zone"><h2>Прогрес «Сходинок»</h2>${button(`Скинути прогрес ${uiIcons.reset}`, 'reset-progress', 'danger')}</section>`
        : '';
  app.innerHTML = shell(`<div class="settings-page"><section class="panel settings"><label class="toggle"><span><strong>Звук</strong></span><input type="checkbox" data-setting="sound" ${state.sound ? 'checked' : ''}><i></i></label></section>${modeSettings}</div>`, 'Налаштування', returnRoute, false);
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
  const message = state.session?.mode === 'stairs'
    ? 'Прогрес сесії лише поточного рівня буде втрачено.'
    : 'Прогрес поточної сесії буде втрачено.';
  showModal('Завершити гру?', message, [
    [`Продовжити гру ${uiIcons.play}`, 'close-modal', 'primary'], [`На головну ${uiIcons.home}`, 'discard-home', 'ghost'], [`Налаштування ${uiIcons.settings}`, 'discard-mode', 'ghost']
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
      ['Скасувати', 'close-modal', 'accent'], ['Скинути прогрес', 'confirm-reset-progress', 'danger-outline']
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
