"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchNeedsAttention, clearNeedsAttention } from "../services/needs-attention-client";
import type { NeedsAttentionItem } from "../types";

export function useNeedsAttention() {
  const [patients, setPatients] = useState<NeedsAttentionItem[] | null>(null);

  const reload = useCallback(() => {
    fetchNeedsAttention().then(setPatients);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchNeedsAttention().then((data) => {
      if (!cancelled) setPatients(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const clear = useCallback(
    async (patientId: string) => {
      const ok = await clearNeedsAttention(patientId);
      if (ok) reload();
      return ok;
    },
    [reload],
  );

  return { patients, isLoading: patients === null, clear };
}
