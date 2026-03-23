export type NavigationState = {
  activeView: string
  selectedCategoryId: string | null
  prayerPathIds: string[]
  rosaryReturnMode: 'selection' | null
  editingPrayerId: string | null
  addFormMode: 'devotion' | 'entry' | 'letter' | 'predefined' | null
  selectedCustomPlanSlot: 1 | 2 | 3 | 4 | null
  customPlanPrayerSlot: 1 | 2 | 3 | 4 | null
  customPlanPrayerIndex: number | null
  customPlanEditMode: boolean
}

export const NAV_STATE_STORAGE_KEY = 'cotidie_nav_state';
const getNavStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export const RESTORABLE_VIEWS = new Set([
  'home',
  'category',
  'prayer',
  'settings',
  'customPlan',
  'viaCrucis',
  'rosary',
  'rosaryMeditated',
  'planCalendar',
]);

export const initialState: NavigationState = {
  activeView: 'home',
  selectedCategoryId: null,
  prayerPathIds: [],
  rosaryReturnMode: null,
  editingPrayerId: null,
  addFormMode: null,
  selectedCustomPlanSlot: null,
  customPlanPrayerSlot: null,
  customPlanPrayerIndex: null,
  customPlanEditMode: false,
};

export const normalizeNavState = (raw: any): NavigationState => {
  const activeView = RESTORABLE_VIEWS.has(raw?.activeView)
    ? raw.activeView
    : 'home';

  const selectedCategoryId =
    typeof raw?.selectedCategoryId === 'string'
      ? raw.selectedCategoryId
      : null;

  const prayerPathIds = Array.isArray(raw?.prayerPathIds)
    ? raw.prayerPathIds.filter((id: unknown) => typeof id === 'string')
    : [];
  const rosaryReturnMode = raw?.rosaryReturnMode === 'selection' ? 'selection' : null;

  return {
    ...initialState,
    activeView,
    selectedCategoryId,
    prayerPathIds,
    rosaryReturnMode,
  };
};

export const loadPersistedNavState = (): NavigationState => {
  const storage = getNavStorage();
  if (!storage) return initialState;
  try {
    const raw = storage.getItem(NAV_STATE_STORAGE_KEY);
    if (!raw) return initialState;
    return normalizeNavState(JSON.parse(raw));
  } catch {
    return initialState;
  }
};

export const persistNavState = (state: NavigationState) => {
  const storage = getNavStorage();
  if (!storage) return;
  try {
    storage.setItem(NAV_STATE_STORAGE_KEY, JSON.stringify(normalizeNavState(state)));
  } catch {}
};

export const clearPersistedNavState = () => {
  const storage = getNavStorage();
  if (!storage) return;
  try {
    storage.removeItem(NAV_STATE_STORAGE_KEY);
  } catch {}
};
