"use client";

import { createContext, use } from "react";

import type { ViewSource } from "./data";

export type ViewDetail = { kind: "partido" | "jugador"; id: string } | null;
export type ViewSection = "resultados" | "tabla" | "caja";

type ViewContextValue = {
  source: ViewSource;
  /** The private link shows payments; the public group page never does. */
  showMoney: boolean;
  detail: ViewDetail;
  section: ViewSection | null;
  open: (kind: "partido" | "jugador", id: string) => void;
  openSection: (section: ViewSection) => void;
  /** One step back: detail → the section under it → the screen. */
  close: () => void;
  param: (key: string) => string | null;
  setParam: (key: string, value: string | null) => void;
};

export const ViewContext = createContext<ViewContextValue | null>(null);

export function useView() {
  const value = use(ViewContext);
  if (!value) throw new Error("useView must be used inside SharedGroupView");
  return value;
}
