import { useCallback, useEffect, useRef } from 'react';

/** Stable event handler that observes the latest committed state.
 * Call from events/effects, never during render. Updating its implementation
 * does not restart the subscription or explicitly triggered operation using it.
 */
export function useCommittedCallback<Args extends unknown[], Result>(callback: (...args: Args) => Result) {
  const current = useRef(callback);
  useEffect(() => { current.current = callback; }, [callback]);
  return useCallback((...args: Args) => current.current(...args), []);
}
