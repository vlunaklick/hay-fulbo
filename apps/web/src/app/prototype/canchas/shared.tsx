"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { NOW, type CourtSummary } from "./data";

export type CourtValues = { name: string; address: string; mapsUrl: string };

export type VariantProps = {
  courts: CourtSummary[];
  canManage: boolean;
  save: (id: string | null, values: CourtValues) => void;
  toggleArchive: (id: string) => void;
};

export const EMPTY_VALUES: CourtValues = { name: "", address: "", mapsUrl: "" };

export function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isValid(values: CourtValues) {
  return Boolean(values.name.trim() && values.address.trim() && isHttpUrl(values.mapsUrl));
}

export function byName(a: CourtSummary, b: CourtSummary) {
  return a.name.localeCompare(b.name, "es-AR");
}

export function relativeDays(value: string) {
  const days = Math.round((new Date(value).getTime() - NOW.getTime()) / 86_400_000);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  if (days === -1) return "ayer";
  const formatter = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  if (Math.abs(days) < 365) return formatter.format(Math.round(days / 30), "month");
  return formatter.format(Math.round(days / 365), "year");
}

/** Same fields and validation as production's CourtFields. */
export function CourtFields({
  values,
  onChange,
  prefix,
  autoFocus,
}: {
  values: CourtValues;
  onChange: (values: CourtValues) => void;
  prefix: string;
  autoFocus?: boolean;
}) {
  const nameInvalid = Boolean(values.name && !values.name.trim());
  const addressInvalid = Boolean(values.address && !values.address.trim());
  const mapsInvalid = Boolean(values.mapsUrl && !isHttpUrl(values.mapsUrl));
  return (
    <>
      <Field data-invalid={nameInvalid}>
        <FieldLabel htmlFor={`${prefix}-name`}>Nombre</FieldLabel>
        <Input
          aria-invalid={nameInvalid}
          autoFocus={autoFocus}
          id={`${prefix}-name`}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          placeholder="Nombre de la cancha"
          value={values.name}
        />
        {nameInvalid ? <FieldError role="alert">Ingresá el nombre de la cancha.</FieldError> : null}
      </Field>
      <Field data-invalid={addressInvalid}>
        <FieldLabel htmlFor={`${prefix}-address`}>Dirección</FieldLabel>
        <Input
          aria-invalid={addressInvalid}
          autoComplete="street-address"
          id={`${prefix}-address`}
          onChange={(event) => onChange({ ...values, address: event.target.value })}
          placeholder="Calle 123, Ciudad"
          value={values.address}
        />
        {addressInvalid ? <FieldError role="alert">Ingresá la dirección.</FieldError> : null}
      </Field>
      <Field data-invalid={mapsInvalid}>
        <FieldLabel htmlFor={`${prefix}-map`}>Enlace de Google Maps</FieldLabel>
        <Input
          aria-invalid={mapsInvalid}
          id={`${prefix}-map`}
          inputMode="url"
          onChange={(event) => onChange({ ...values, mapsUrl: event.target.value })}
          placeholder="https://maps.google.com/…"
          type="url"
          value={values.mapsUrl}
        />
        {mapsInvalid ? (
          <FieldError role="alert">Usá un enlace que empiece con https:// o http://.</FieldError>
        ) : null}
      </Field>
    </>
  );
}

/** Copies the address and confirms with a checkmark for 1.5 s. */
export function CopyAddressButton({
  address,
  name,
  withLabel = false,
  variant = "ghost",
}: {
  address: string;
  name: string;
  withLabel?: boolean;
  variant?: "ghost" | "outline" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Dirección copiada", { description: address });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("No pudimos copiar la dirección");
    }
  }

  const Icon = copied ? CheckIcon : CopyIcon;
  return (
    <Button
      aria-label={withLabel ? undefined : `Copiar dirección de ${name}`}
      onClick={copy}
      size={withLabel ? "default" : "icon"}
      variant={variant}
    >
      <Icon data-icon={withLabel ? "inline-start" : undefined} aria-hidden="true" />
      {withLabel ? (copied ? "Copiada" : "Copiar dirección") : null}
    </Button>
  );
}

export function useIsDesktop(query = "(min-width: 768px)") {
  return useSyncExternalStore(
    (notify) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
