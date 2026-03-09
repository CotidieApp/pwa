import { useEffect } from "react";

export function useNavPersistence(
  navStateRef: any,
  NAV_STATE_STORAGE_KEY: string,
  normalizeNavState: (raw: any) => any
) {
  useEffect(() => {
    const saveState = () => {
      try {
        const safeState = normalizeNavState(navStateRef.current);
        window.localStorage.setItem(
          NAV_STATE_STORAGE_KEY,
          JSON.stringify(safeState)
        );
      } catch {}
    };

    document.addEventListener("visibilitychange", saveState);

    return () => {
      document.removeEventListener("visibilitychange", saveState);
    };
  }, []);
}