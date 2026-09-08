"use client";

import { useCallback, useEffect, useState } from "react";

// Bumped from "cliain:sidebar-collapsed" — the default flipped from expanded to collapsed
// (hover-to-peek is now the primary interaction), so anyone with an old stored "false" needs
// a fresh key rather than getting stuck pinned open with no way to notice the new behavior.
const STORAGE_KEY = "cliain:sidebar-collapsed-v2";

/**
 * `isCollapsed` is the persisted preference (pinned narrow vs. pinned open, via the explicit
 * toggle) — defaults to collapsed, so hover-to-peek is the primary interaction out of the box.
 * `isHovering` is separate, transient, never persisted: while pinned narrow, hovering the rail
 * temporarily reveals it as an overlay (see sidebar.tsx) without changing the pinned
 * preference or reflowing the page.
 */
export function useSidebarState() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

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

  return {
    isCollapsed: isHydrated ? isCollapsed : true,
    isHovering,
    setHovering: setIsHovering,
    toggle,
  };
}
