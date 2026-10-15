const STORAGE_KEY = 'osaka-kyoto-family-trip-v1';
const defaultState = { completedStops: [], day4Option: 'slow-kyoto', completedPreparation: [] };

export function createTripStore(storage = globalThis.localStorage) {
  let state = load();

  function load() {
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
      return {
        completedStops: Array.isArray(saved?.completedStops) ? saved.completedStops : [],
        completedPreparation: Array.isArray(saved?.completedPreparation) ? saved.completedPreparation.filter(id=>typeof id === 'string') : [],
        day4Option: saved?.day4Option || defaultState.day4Option,
      };
    } catch {
      return { ...defaultState, completedStops: [], completedPreparation: [] };
    }
  }

  function save() {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return {
    getState: () => ({ ...state, completedStops: [...state.completedStops], completedPreparation: [...state.completedPreparation] }),
    toggleStop(id) {
      const complete = state.completedStops.includes(id);
      state = { ...state, completedStops: complete ? state.completedStops.filter((item) => item !== id) : [...state.completedStops, id] };
      save();
      return this.getState();
    },
    togglePreparation(id) {
      const complete = state.completedPreparation.includes(id);
      state = { ...state, completedPreparation: complete ? state.completedPreparation.filter(item=>item !== id) : [...state.completedPreparation, id] };
      save();
      return this.getState();
    },
    selectDay4(id) {
      state = { ...state, day4Option: id };
      save();
      return this.getState();
    },
  };
}
