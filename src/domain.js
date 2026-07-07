export const DIFFICULTIES = [
  { id: 1, name: 'Легка', icon: '●', color: '#2f9d68' },
  { id: 2, name: 'Середня', icon: '●●', color: '#3484d6' },
  { id: 3, name: 'Складна', icon: '●●●', color: '#e17b28' },
  { id: 4, name: 'Надскладна', icon: '●●●●', color: '#d34f65' }
];

export const STAIRS = [
  [5,3,0,0], [4,4,0,0], [3,5,0,0], [4,4,1,0],
  [3,4,2,0], [2,4,3,0], [3,3,2,2], [2,3,3,2],
  [1,3,3,3], [0,5,4,3], [0,4,4,4], [0,3,4,5]
];

// Затверджений користувачем каталог, 07.07.2026. Кожна позиція відповідає s-00…s-ff.
const PERMANENT_DIFFICULTIES = [
  '11121144241324412144122444412414',
  '23143344231341442442141434431422',
  '21331233333133131244212242134141',
  '43413224312343443344124113433242',
  '23231331142344444444121342231424',
  '13241123221243211133121113211312',
  '23313444414324423313324244434142',
  '31331344332142121332114234222221'
].join('');

const serialize = matrix => matrix.flat().map(Number).join('');
const transform = (matrix, fn) => matrix.map((row, r) => row.map((_, c) => fn(matrix, r, c)));

export function analyzeScheme(tiles) {
  const matrix = toMatrix(tiles);
  const original = serialize(matrix);
  const variants = [
    transform(matrix, (m, r, c) => m[3 - r][c]),       // horizontal
    transform(matrix, (m, r, c) => m[r][3 - c]),       // vertical
    transform(matrix, (m, r, c) => m[3 - r][3 - c]),   // 180°
    transform(matrix, (m, r, c) => m[c][r]),           // main diagonal
    transform(matrix, (m, r, c) => m[3 - c][3 - r]),   // anti-diagonal
    transform(matrix, (m, r, c) => m[3 - c][r]),       // 90°
    transform(matrix, (m, r, c) => m[c][3 - r])        // 270°
  ];
  const symmetries = variants.filter(item => serialize(item) === original).length;
  let adjacentPairs = 0;
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) if (matrix[r][c]) {
    if (matrix[r + 1]?.[c]) adjacentPairs += 1;
    if (matrix[r][c + 1]) adjacentPairs += 1;
  }
  const visited = new Set();
  let components = 0;
  for (let r = 0; r < 4; r += 1) for (let c = 0; c < 4; c += 1) {
    if (!matrix[r][c] || visited.has(`${r},${c}`)) continue;
    components += 1;
    const queue = [[r, c]];
    while (queue.length) {
      const [row, col] = queue.pop();
      const key = `${row},${col}`;
      if (visited.has(key) || !matrix[row]?.[col]) continue;
      visited.add(key);
      queue.push([row + 1, col], [row - 1, col], [row, col + 1], [row, col - 1]);
    }
  }
  return { symmetries, adjacentPairs, components, uniqueRotations: new Set(tiles).size };
}

export function classifyScheme(features) {
  const { symmetries, uniqueRotations, components, adjacentPairs } = features;
  if (symmetries >= 2 || uniqueRotations === 1 || (symmetries >= 1 && uniqueRotations <= 2)) return 1;
  if (symmetries >= 1 || uniqueRotations <= 2 || components <= 2 || adjacentPairs >= 2) return 2;
  if (symmetries === 0 && uniqueRotations >= 3 && components === 4 && adjacentPairs === 0) return 4;
  return 3;
}

export function createSchemes() {
  const schemes = [];
  for (let n = 0; n < 256; n += 1) {
    const tiles = [n >> 6 & 3, n >> 4 & 3, n >> 2 & 3, n & 3];
    const features = analyzeScheme(tiles);
    const baseDifficulty = Number(PERMANENT_DIFFICULTIES[n]);
    schemes.push({ id: `s-${n.toString(16).padStart(2, '0')}`, tiles, features, baseDifficulty, difficulty: baseDifficulty });
  }
  return schemes;
}

export const SCHEMES = createSchemes();
export const byDifficulty = id => SCHEMES.filter(s => s.difficulty === Number(id));

export function applyDifficultyOverrides(overrides = {}) {
  SCHEMES.forEach(scheme => {
    const value = Number(overrides[scheme.id]);
    scheme.difficulty = value >= 1 && value <= 4 ? value : scheme.baseDifficulty;
  });
}

export function toMatrix(tiles) {
  const matrix = Array.from({ length: 4 }, () => Array(4).fill(false));
  tiles.forEach((position, tile) => {
    const tr = Math.floor(tile / 2) * 2;
    const tc = (tile % 2) * 2;
    const offsets = [[0,0], [0,1], [1,1], [1,0]];
    const [r, c] = offsets[position];
    matrix[tr + r][tc + c] = true;
  });
  return matrix;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function takeFromQueue(state, difficulty, count, used = new Set()) {
  const key = String(difficulty);
  const all = byDifficulty(difficulty).map(s => s.id);
  let queue = (state.queues[key] || []).filter(id => all.includes(id) && !used.has(id));
  const result = [];
  while (result.length < count) {
    if (!queue.length) queue = shuffle(all.filter(id => !used.has(id) && !result.includes(id)));
    if (!queue.length) break;
    const id = queue.shift();
    if (!used.has(id) && !result.includes(id)) result.push(id);
  }
  state.queues[key] = queue;
  return result;
}

export function buildMixedSequence(state, difficulties, count) {
  const plan = [];
  let last = null;
  let hardRun = 0;
  while (plan.length < count) {
    let candidates = difficulties.filter(d => d !== last);
    if (!candidates.length) candidates = difficulties;
    if (hardRun >= 2 && difficulties.some(d => d <= 2)) candidates = candidates.filter(d => d <= 2);
    const d = candidates[Math.floor(Math.random() * candidates.length)];
    plan.push(d);
    hardRun = d >= 3 ? hardRun + 1 : 0;
    last = d;
  }
  const pools = Object.fromEntries(difficulties.map(d => [d, takeFromQueue(state, d, plan.filter(x => x === d).length)]));
  return plan.map(d => pools[d].shift());
}
