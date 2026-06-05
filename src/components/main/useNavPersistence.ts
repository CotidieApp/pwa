import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { persistNavState } from "@/components/main/navigation";
import type { NavigationState } from "@/components/main/navigation";

export function useNavPersistence(
  navStateRef: MutableRefObject<NavigationState>
) {
  useEffect(() => {
    const saveState = () => {
      try {
        persistNavState(navStateRef.current);
      } catch {}
    };

    document.addEventListener("visibilitychange", saveState);

    return () => {
      document.removeEventListener("visibilitychange", saveState);
    };
  }, [navStateRef]);
}
