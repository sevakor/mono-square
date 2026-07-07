const KEY = 'four-squares-v1';
export const defaults = () => ({
  version: 1,
  sound: true,
  visibleDifficulties: { select: [1,2,3,4], mix: [1,2,3,4] },
  select: { difficulty: 1, count: 6 },
  mix: { difficulties: [1,2], count: 6 },
  stairs: { unlocked: 1, completed: [] },
  queues: {},
  difficultyOverrides: {},
  session: null,
  summary: null
});

export function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!data || data.version !== 1) return defaults();
    return { ...defaults(), ...data };
  } catch { return defaults(); }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private browsing */ }
}

export function resetProgress(state) {
  state.stairs = { unlocked: 1, completed: [] };
  state.queues = {};
  state.session = null;
}
