"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TourStep } from "../tour-steps";

type Rect = { top: number; left: number; width: number; height: number };

const SPOTLIGHT_PADDING = 6;
const TOOLTIP_WIDTH = 320;

function measureTarget(targetId: string | null): Rect | null {
  if (!targetId || typeof document === "undefined") return null;
  const el = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!el) return null;
  const box = el.getBoundingClientRect();
  if (box.width === 0 && box.height === 0) return null;
  return { top: box.top, left: box.left, width: box.width, height: box.height };
}

function useTargetRect(targetId: string | null): Rect | null {
  const [rect, setRect] = useState<Rect | null>(() => measureTarget(targetId));

  useEffect(() => {
    function measure() {
      setRect(measureTarget(targetId));
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [targetId]);

  return rect;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function getTooltipStyle(highlight: Rect | null, placement: TourStep["placement"]): CSSProperties {
  if (!highlight || placement === "center") {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }

  if (placement === "right") {
    return {
      top: clamp(highlight.top, 16, window.innerHeight - 240),
      left: clamp(highlight.left + highlight.width + 16, 16, window.innerWidth - TOOLTIP_WIDTH - 16),
    };
  }

  return {
    top: clamp(highlight.top + highlight.height + 16, 16, window.innerHeight - 240),
    left: clamp(
      highlight.left + highlight.width - TOOLTIP_WIDTH,
      16,
      window.innerWidth - TOOLTIP_WIDTH - 16,
    ),
  };
}

type TourOverlayProps = {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
};

export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: TourOverlayProps) {
  const rect = useTargetRect(step.targetId);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const highlight: Rect | null = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {highlight ? (
        <>
          <div
            className="fixed bg-foreground/50 transition-all duration-200"
            style={{ top: 0, left: 0, width: "100vw", height: Math.max(highlight.top, 0) }}
          />
          <div
            className="fixed bg-foreground/50 transition-all duration-200"
            style={{
              top: highlight.top + highlight.height,
              left: 0,
              width: "100vw",
              height: `calc(100vh - ${highlight.top + highlight.height}px)`,
            }}
          />
          <div
            className="fixed bg-foreground/50 transition-all duration-200"
            style={{
              top: highlight.top,
              left: 0,
              width: Math.max(highlight.left, 0),
              height: highlight.height,
            }}
          />
          <div
            className="fixed bg-foreground/50 transition-all duration-200"
            style={{
              top: highlight.top,
              left: highlight.left + highlight.width,
              width: `calc(100vw - ${highlight.left + highlight.width}px)`,
              height: highlight.height,
            }}
          />
          <div
            className="pointer-events-none fixed rounded-lg ring-2 ring-primary transition-all duration-200"
            style={{
              top: highlight.top,
              left: highlight.left,
              width: highlight.width,
              height: highlight.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-foreground/50" />
      )}

      <div
        className="fixed w-80 rounded-xl border border-border bg-card p-5 shadow-lg"
        style={getTooltipStyle(highlight, step.placement)}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-base text-foreground">{step.title}</h3>
          <button
            type="button"
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-1.5 rounded-full ${
                  index === stepIndex ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirstStep ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={onNext}>
              {isLastStep ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
