"use client";

import { useEffect, useState } from "react";
import { fetchPatients } from "../services/patient-client";
import type { PatientListItem } from "../types";

export function usePatients() {
  const [patients, setPatients] = useState<PatientListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPatients().then((data) => {
      if (!cancelled) setPatients(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { patients, isLoading: patients === null };
}
