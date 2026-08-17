"use client";

import { Compass } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useProductTour } from "../context";

export function TourMenuItem() {
  const { start } = useProductTour();

  return (
    <DropdownMenuItem onClick={start}>
      <Compass className="h-4 w-4" />
      Take a tour
    </DropdownMenuItem>
  );
}
