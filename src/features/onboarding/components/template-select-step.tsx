import { Building2, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

type TemplateOption = {
  value: string;
  label: string;
  description: string;
  icon: typeof Building2;
};

const OPTIONS: TemplateOption[] = [
  {
    value: "clinic-v1",
    label: "Clinic",
    description: "Book patient appointments with a doctor or practitioner.",
    icon: Building2,
  },
  {
    value: "gym-v1",
    label: "Gym",
    description: "Book members into a recurring class with a trainer.",
    icon: Dumbbell,
  },
];

type TemplateSelectStepProps = {
  value: string;
  onChange: (templateVersion: string) => void;
};

export function TemplateSelectStep({ value, onChange }: TemplateSelectStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
              selected
                ? "border-primary bg-accent/50"
                : "border-border hover:border-primary/50 hover:bg-muted",
            )}
          >
            <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
            <span className="font-heading text-base text-foreground">{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.description}</span>
          </button>
        );
      })}
    </div>
  );
}
