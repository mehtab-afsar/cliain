"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "cliain:sidebar-collapsed";

export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrating from localStorage (client-only) after mount, not derived state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setIsCollapsed(stored === "true");
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { isCollapsed: isHydrated ? isCollapsed : false, toggle };
}
