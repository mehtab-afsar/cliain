import { IANAZone } from "luxon";

/** Falls back to UTC for a missing/invalid IANA zone — better an off-by-hours date than a hard failure. */
export function resolveTimezone(timezone: string | null | undefined): string {
  return timezone && IANAZone.isValidZone(timezone) ? timezone : "UTC";
}
