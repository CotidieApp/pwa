export type NavigationState = {
  activeView: string
  selectedCategoryId: string | null
  prayerPathIds: string[]
  editingPrayerId: string | null
  addFormMode: 'devotion' | 'entry' | 'letter' | 'predefined' | null
  selectedCustomPlanSlot: 1 | 2 | 3 | 4 | null
  customPlanPrayerSlot: 1 | 2 | 3 | 4 | null
  customPlanPrayerIndex: number | null
  customPlanEditMode: boolean
}

export const NAV_STATE_STORAGE_KEY = 'cotidie_nav_state';

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

  return {
    ...initialState,
    activeView,
    selectedCategoryId,
    prayerPathIds,
  };
};