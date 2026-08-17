"use client";

import { useEffect, useState } from "react";
import { fetchAppointments } from "../services/appointment-client";
import type { AppointmentListItem } from "../types";

export function useAppointments() {
  const [appointments, setAppointments] = useState<AppointmentListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAppointments().then((data) => {
      if (!cancelled) setAppointments(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { appointments, isLoading: appointments === null };
}
