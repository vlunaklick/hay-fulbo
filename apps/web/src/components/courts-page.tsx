"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@hay-fulbo/ui/components/collapsible";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Separator } from "@hay-fulbo/ui/components/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CalendarClockIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleAlertIcon,
  CopyIcon,
  MapPinIcon,
  NavigationIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { formatDate, formatMoney, formatRelativeDays, formatShortDate } from "@/lib/format";
import { queryClient, trpc } from "@/utils/trpc";

type Court = {
  address: string;
  archivedAt: Date | string | null;
  id: string;
  lastCostMinor: string | null;
  lastPlayedAt: Date | string | null;
  mapsUrl: string;
  name: string;
  nextMatchAt: Date | string | null;
  played: number;
};

type CourtValues = { address: string; mapsUrl: string; name: string };

type SheetState = { mode: "view" | "edit"; courtId: string } | { mode: "new" } | null;

const EMPTY_VALUES: CourtValues = { name: "", address: "", mapsUrl: "" };

/**
 * Canchas: the page exists to get people to the court. Directions and the
 * address are one tap away on every row, the next match's court leads, and
 * details and editing live in a sheet.
 */
export function CourtsPage() {
  const { role } = useAppContext();
  const canManage = role !== "member";
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const [sheet, setSheet] = useState<SheetState>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: async (_, input) => {
        if (input.type === "archiveCourt") {
          toast.success(input.archived ? "Cancha archivada" : "Cancha reactivada", {
            description: input.archived
              ? "Los partidos anteriores la conservan."
              : "Vuelve a aparecer al crear partidos.",
          });
        } else {
          toast.success(
            input.type === "upsertCourt" && input.courtId
              ? "Cancha actualizada"
              : "Cancha guardada",
          );
        }
        setSheet(null);
        setError(null);
        await queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() });
      },
      onError: (cause) => {
        setError(cause.message);
        toast.error("No pudimos guardar los cambios", { description: cause.message });
      },
    }),
  );

  const courts: Court[] = directory.data?.courts ?? [];
  const active = courts.filter((court) => !court.archivedAt).sort(byUse);
  const archived = courts.filter((court) => court.archivedAt).sort(byUse);
  const next = active
    .filter((court) => court.nextMatchAt)
    .sort((a, b) => time(a.nextMatchAt) - time(b.nextMatchAt))[0];
  const selected =
    sheet && sheet.mode !== "new"
      ? (courts.find((court) => court.id === sheet.courtId) ?? null)
      : null;

  function openNew() {
    setError(null);
    setSheet({ mode: "new" });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Canchas"
        description="Tocá la flecha para ir. Las que más usan, arriba."
        actions={
          canManage ? (
            <Button variant="outline" onClick={openNew}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              Nueva cancha
            </Button>
          ) : null
        }
      />

      {directory.isPending ? (
        <div className="flex flex-col">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
          ))}
        </div>
      ) : directory.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar las canchas</AlertTitle>
          <AlertDescription>{directory.error.message}</AlertDescription>
        </Alert>
      ) : courts.length === 0 ? (
        <EmptyRow canManage={canManage} onCreate={openNew} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          {next?.nextMatchAt ? (
            <section
              aria-labelledby="courts-next"
              className="lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
            >
              <Card className="gap-4 p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <CalendarClockIcon className="size-4" aria-hidden="true" />
                  <h2 id="courts-next">
                    Próximo partido ·{" "}
                    <span className="tabular-nums">{formatDate(next.nextMatchAt)}</span>
                  </h2>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-lg font-bold text-balance">{next.name}</p>
                  <p className="text-sm text-muted-foreground">{next.address}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    nativeButton={false}
                    render={<a href={next.mapsUrl} target="_blank" rel="noreferrer" />}
                  >
                    <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                    Cómo llegar
                  </Button>
                  <CopyAddressButton address={next.address} name={next.name} variant="outline" />
                </div>
              </Card>
            </section>
          ) : null}

          <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">
            {active.length ? (
              <section aria-labelledby="courts-active" className="flex flex-col gap-3">
                <h2 id="courts-active" className="text-base font-semibold">
                  Activas{" "}
                  <span className="text-muted-foreground tabular-nums">{active.length}</span>
                </h2>
                <CourtList
                  courts={active}
                  onOpen={(courtId) => {
                    setError(null);
                    setSheet({ mode: "view", courtId });
                  }}
                />
              </section>
            ) : null}

            {archived.length ? (
              <Collapsible className="flex flex-col gap-3">
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="group/archived -mx-3 w-fit text-muted-foreground"
                    />
                  }
                >
                  Archivadas <span className="tabular-nums">{archived.length}</span>
                  <ChevronDownIcon
                    data-icon="inline-end"
                    aria-hidden="true"
                    className="transition-transform duration-150 ease-out group-aria-expanded/archived:rotate-180 motion-reduce:transition-none"
                  />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CourtList
                    courts={archived}
                    onOpen={(courtId) => {
                      setError(null);
                      setSheet({ mode: "view", courtId });
                    }}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </div>
        </div>
      )}

      <CourtSheet
        key={sheet ? `${sheet.mode}-${"courtId" in sheet ? sheet.courtId : "new"}` : "closed"}
        canManage={canManage}
        court={selected}
        error={error}
        isPending={execute.isPending}
        mode={sheet?.mode ?? "view"}
        open={Boolean(sheet)}
        onArchive={() => {
          if (!selected) return;
          setError(null);
          execute.mutate({
            type: "archiveCourt",
            courtId: selected.id,
            archived: !selected.archivedAt,
          });
        }}
        onClose={() => {
          setSheet(null);
          setError(null);
        }}
        onEdit={() => {
          if (selected) setSheet({ mode: "edit", courtId: selected.id });
        }}
        onSave={(values) => {
          setError(null);
          execute.mutate({
            type: "upsertCourt",
            ...(sheet?.mode === "edit" && selected ? { courtId: selected.id } : {}),
            ...values,
          });
        }}
      />
    </div>
  );
}

function CourtList({ courts, onOpen }: { courts: Court[]; onOpen: (courtId: string) => void }) {
  return (
    <Card className="gap-0 py-0">
      {courts.map((court, index) => (
        <Fragment key={court.id}>
          {index > 0 ? <Separator /> : null}
          <div className="flex items-center gap-1 pr-2">
            <Button
              aria-label={`Ver ${court.name}`}
              className="h-auto min-h-16 min-w-0 flex-1 justify-start rounded-none py-3 pl-4 text-left font-normal whitespace-normal"
              onClick={() => onOpen(court.id)}
              variant="ghost"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold">{court.name}</span>
                <span className="truncate text-xs text-muted-foreground">{court.address}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {court.nextMatchAt ? (
                    <span className="font-medium text-foreground">
                      Próximo {formatShortDate(court.nextMatchAt)} ·{" "}
                    </span>
                  ) : null}
                  {usage(court)}
                </span>
              </span>
            </Button>
            <CopyAddressButton address={court.address} name={court.name} />
            <Button
              aria-label={`Cómo llegar a ${court.name}`}
              className="text-primary-text"
              nativeButton={false}
              render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
              size="icon"
              variant="ghost"
            >
              <NavigationIcon aria-hidden="true" />
            </Button>
          </div>
        </Fragment>
      ))}
    </Card>
  );
}

function CourtSheet({
  canManage,
  court,
  error,
  isPending,
  mode,
  open,
  onArchive,
  onClose,
  onEdit,
  onSave,
}: {
  canManage: boolean;
  court: Court | null;
  error: string | null;
  isPending: boolean;
  mode: "view" | "edit" | "new";
  open: boolean;
  onArchive: () => void;
  onClose: () => void;
  onEdit: () => void;
  onSave: (values: CourtValues) => void;
}) {
  const isMobile = useIsMobile();
  const [values, setValues] = useState<CourtValues>(
    court && mode === "edit"
      ? { name: court.name, address: court.address, mapsUrl: court.mapsUrl }
      : EMPTY_VALUES,
  );
  const editing = mode === "edit" || mode === "new";
  const valid = isValid(values);
  const footerClass = "pb-[max(1rem,env(safe-area-inset-bottom))]";

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="max-h-[92dvh] md:max-h-none md:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-balance">
            {mode === "new" ? "Nueva cancha" : (court?.name ?? "")}
          </SheetTitle>
          <SheetDescription>
            {mode === "new"
              ? "La vas a poder elegir al crear un partido."
              : court?.archivedAt
                ? "Archivada · no aparece al crear partidos."
                : court?.address}
          </SheetDescription>
        </SheetHeader>

        {editing ? (
          <form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              if (valid) onSave(values);
            }}
          >
            <SheetBody>
              <FieldGroup>
                <CourtFields
                  autoFocus={mode === "new"}
                  onChange={setValues}
                  prefix={mode === "new" ? "new-court" : "court-edit"}
                  values={values}
                />
                {error ? <FieldError role="alert">{error}</FieldError> : null}
              </FieldGroup>
            </SheetBody>
            <SheetFooter className={footerClass}>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" className="sm:ml-auto" disabled={isPending || !valid}>
                {mode === "new" ? "Guardar cancha" : "Guardar cambios"}
              </Button>
            </SheetFooter>
          </form>
        ) : court ? (
          <>
            <SheetBody className="flex flex-col gap-6">
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  nativeButton={false}
                  render={<a href={court.mapsUrl} target="_blank" rel="noreferrer" />}
                >
                  <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                  Cómo llegar
                </Button>
                <CopyAddressButton address={court.address} name={court.name} variant="outline" />
              </div>
              {court.archivedAt ? <p className="text-sm">{court.address}</p> : null}
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Partidos jugados" value={court.played || null} />
                <Fact
                  label="Último costo"
                  value={court.lastCostMinor ? formatMoney(court.lastCostMinor) : null}
                />
                <Fact
                  label="Último partido"
                  value={court.lastPlayedAt ? formatShortDate(court.lastPlayedAt) : null}
                />
                <Fact
                  label="Próximo"
                  value={court.nextMatchAt ? formatShortDate(court.nextMatchAt) : null}
                />
              </dl>
              {error ? <FieldError role="alert">{error}</FieldError> : null}
            </SheetBody>
            {canManage ? (
              <SheetFooter className={footerClass}>
                <Button variant="outline" onClick={onEdit}>
                  <PencilIcon data-icon="inline-start" aria-hidden="true" />
                  Editar datos
                </Button>
                <Button
                  className="sm:ml-auto"
                  disabled={isPending}
                  onClick={onArchive}
                  variant="ghost"
                >
                  {court.archivedAt ? (
                    <ArchiveRestoreIcon data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <ArchiveIcon data-icon="inline-start" aria-hidden="true" />
                  )}
                  {court.archivedAt ? "Reactivar" : "Archivar"}
                </Button>
              </SheetFooter>
            ) : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function CourtFields({
  autoFocus,
  onChange,
  prefix,
  values,
}: {
  autoFocus?: boolean;
  onChange: (values: CourtValues) => void;
  prefix: string;
  values: CourtValues;
}) {
  const nameInvalid = Boolean(values.name && !values.name.trim());
  const addressInvalid = Boolean(values.address && !values.address.trim());
  const mapsInvalid = Boolean(values.mapsUrl && !isHttpUrl(values.mapsUrl));
  return (
    <>
      <Field data-invalid={nameInvalid}>
        <FieldLabel htmlFor={`${prefix}-name`}>Nombre</FieldLabel>
        <Input
          aria-describedby={nameInvalid ? `${prefix}-name-error` : undefined}
          aria-invalid={nameInvalid}
          autoFocus={autoFocus}
          id={`${prefix}-name`}
          onChange={(event) => onChange({ ...values, name: event.target.value })}
          placeholder="Nombre de la cancha"
          value={values.name}
        />
        {nameInvalid ? (
          <FieldError id={`${prefix}-name-error`} role="alert">
            Ingresá el nombre de la cancha.
          </FieldError>
        ) : null}
      </Field>
      <Field data-invalid={addressInvalid}>
        <FieldLabel htmlFor={`${prefix}-address`}>Dirección</FieldLabel>
        <Input
          aria-describedby={addressInvalid ? `${prefix}-address-error` : undefined}
          aria-invalid={addressInvalid}
          autoComplete="street-address"
          id={`${prefix}-address`}
          onChange={(event) => onChange({ ...values, address: event.target.value })}
          placeholder="Calle 123, Ciudad"
          value={values.address}
        />
        {addressInvalid ? (
          <FieldError id={`${prefix}-address-error`} role="alert">
            Ingresá la dirección.
          </FieldError>
        ) : null}
      </Field>
      <Field data-invalid={mapsInvalid}>
        <FieldLabel htmlFor={`${prefix}-map`}>Enlace de Google Maps</FieldLabel>
        <Input
          aria-describedby={mapsInvalid ? `${prefix}-map-error` : undefined}
          aria-invalid={mapsInvalid}
          id={`${prefix}-map`}
          inputMode="url"
          onChange={(event) => onChange({ ...values, mapsUrl: event.target.value })}
          placeholder="https://maps.google.com/…"
          type="url"
          value={values.mapsUrl}
        />
        {mapsInvalid ? (
          <FieldError id={`${prefix}-map-error`} role="alert">
            Usá un enlace que empiece con https:// o http://.
          </FieldError>
        ) : null}
      </Field>
    </>
  );
}

/** Copies the address and confirms with a checkmark for 1.5 s. */
function CopyAddressButton({
  address,
  name,
  variant = "ghost",
}: {
  address: string;
  name: string;
  variant?: "ghost" | "outline";
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
    <Button aria-label={`Copiar dirección de ${name}`} onClick={copy} size="icon" variant={variant}>
      <Icon aria-hidden="true" />
    </Button>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        className={
          value === null
            ? "text-lg font-semibold text-muted-foreground"
            : "text-lg font-semibold tabular-nums"
        }
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

function EmptyRow({ canManage, onCreate }: { canManage: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
      <MapPinIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">Todavía no hay canchas</p>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Guardá dónde juegan para que todos lleguen con un toque."
            : "Cuando el organizador cargue una, vas a ver cómo llegar desde acá."}
        </p>
      </div>
      {canManage ? (
        <Button onClick={onCreate}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Nueva cancha
        </Button>
      ) : null}
    </div>
  );
}

function usage(court: Court) {
  if (!court.played) return "Todavía sin partidos";
  const count = `${court.played} ${court.played === 1 ? "partido" : "partidos"}`;
  return court.lastPlayedAt ? `${count} · último ${formatRelativeDays(court.lastPlayedAt)}` : count;
}

function byUse(a: Court, b: Court) {
  return b.played - a.played || a.name.localeCompare(b.name, "es-AR");
}

function time(value: Date | string | null) {
  return value ? new Date(value).getTime() : 0;
}

function isValid(values: CourtValues) {
  return Boolean(values.name.trim() && values.address.trim() && isHttpUrl(values.mapsUrl));
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
