"use client";

import { createContext, useContext } from "react";

type ProductTourContextValue = {
  start: () => void;
};

export const ProductTourContext = createContext<ProductTourContextValue | null>(null);

export function useProductTour(): ProductTourContextValue {
  const context = useContext(ProductTourContext);
  if (!context) {
    throw new Error("useProductTour must be used within a ProductTourProvider");
  }
  return context;
}
