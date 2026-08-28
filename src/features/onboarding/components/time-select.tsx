import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTime } from "../services/format-time";

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, index) => {
  const hours = Math.floor(index / 4);
  const minutes = (index % 4) * 15;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

type TimeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
};

/** A Select-based time picker in 15-minute increments — replaces native <input type="time">, which renders inconsistently across browsers. */
export function TimeSelect({ id, value, onChange }: TimeSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string" && next) onChange(next);
      }}
    >
      <SelectTrigger id={id} className="w-28">
        <SelectValue placeholder="Select a time" />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((time) => (
          <SelectItem key={time} value={time}>
            {formatTime(time)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
