"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAppointments, transitionAppointment, type TransitionInput } from "../services/appointment-client";
import type { AppointmentListItem } from "../types";

export function useAppointments() {
  const [appointments, setAppointments] = useState<AppointmentListItem[] | null>(null);

  const reload = useCallback(() => {
    fetchAppointments().then(setAppointments);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchAppointments().then((data) => {
      if (!cancelled) setAppointments(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const transition = useCallback(
    async (id: string, input: TransitionInput) => {
      const result = await transitionAppointment(id, input);
      if (result.ok) reload();
      return result;
    },
    [reload],
  );

  return { appointments, isLoading: appointments === null, transition };
}
