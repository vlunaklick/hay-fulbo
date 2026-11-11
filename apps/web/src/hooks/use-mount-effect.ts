"use client";

import { useEffect } from "react";

export function useMountEffect(effect: () => void | (() => void)) {
  // Direct effects are intentionally isolated in this external-system hook.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
}
