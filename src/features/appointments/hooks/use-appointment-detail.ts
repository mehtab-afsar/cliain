"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchAppointmentDetail,
  transitionAppointment,
  type TransitionInput,
} from "../services/appointment-client";
import type { AppointmentDetail } from "../types";

export function useAppointmentDetail(id: string) {
  const [appointment, setAppointment] = useState<AppointmentDetail | null | undefined>(undefined);

  const reload = useCallback(() => {
    fetchAppointmentDetail(id).then(setAppointment);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetchAppointmentDetail(id).then((data) => {
      if (!cancelled) setAppointment(data);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const transition = useCallback(
    async (input: TransitionInput) => {
      const result = await transitionAppointment(id, input);
      if (result.ok) reload();
      return result;
    },
    [id, reload],
  );

  return { appointment, isLoading: appointment === undefined, transition };
}
