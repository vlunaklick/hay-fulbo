"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { GroupPass, PublicHeading, PublicSplit } from "@/components/public-shell";
import { authClient } from "@/lib/auth-client";

import { GoogleSignIn } from "./google-sign-in";
import { safeReturnTo } from "./return-to";

export type LoginContext = { kind: "join" | "invitation"; groupName: string | null };

function LoginIntro({ context }: { context: LoginContext | null }) {
  if (context?.groupName) {
    return (
      <>
        <GroupPass
          groupName={context.groupName}
          kicker={context.kind === "join" ? "Para sumarte a" : "Para aceptar tu invitación a"}
        />
        <p className="text-sm text-muted-foreground text-pretty">
          Entrá o creá tu cuenta. Después volvés directo a este grupo.
        </p>
      </>
    );
  }
  if (context) {
    return (
      <PublicHeading
        title={
          context.kind === "join"
            ? "Entrá para sumarte al grupo"
            : "Entrá para aceptar tu invitación"
        }
        description="Después de entrar volvés directo al link que te pasaron."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl lg:text-5xl">
        El partido, bajo control.
      </h1>
      <p className="max-w-[45ch] text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
        Armá equipos, cerrá el resultado y dejá las cuentas claras desde cualquier pantalla.
      </p>
    </div>
  );
}

export default function LoginScreen({
  clerkPublishableKey,
  context,
}: {
  clerkPublishableKey: string | null;
  context: LoginContext | null;
}) {
  const router = useRouter();
  const { isPending } = authClient.useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error =
      mode === "signup" && name.trim().length < 2
        ? "Ingresá tu nombre."
        : !email.includes("@")
          ? "Ingresá un email válido."
          : password.length < 8
            ? "La contraseña debe tener al menos 8 caracteres."
            : null;
    setMessage(error);
    if (error) return;
    setSubmitting(true);
    const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
    const callbacks = {
      onSuccess: () => {
        toast.success(mode === "signin" ? "Sesión iniciada" : "Cuenta creada");
        if (returnTo === "/dashboard") {
          router.push("/dashboard");
        } else if (returnTo.startsWith("/invitaciones/")) {
          router.push(returnTo as `/invitaciones/${string}`);
        } else {
          router.push(returnTo as Parameters<typeof router.push>[0]);
        }
        router.refresh();
      },
      onError: (result: { error: { message?: string; statusText?: string } }) => {
        setSubmitting(false);
        setMessage(result.error.message ?? result.error.statusText ?? "No pudimos continuar.");
      },
    };
    if (mode === "signin") {
      await authClient.signIn.email({ email, password }, callbacks);
    } else {
      await authClient.signUp.email({ email, name, password }, callbacks);
    }
  }

  return (
    <PublicSplit
      context={<LoginIntro context={context} />}
      action={
        <Card className="lg:rounded-xl">
          <CardContent className="flex flex-col gap-6">
            {clerkPublishableKey ? (
              <>
                <GoogleSignIn publishableKey={clerkPublishableKey} onError={setMessage} />
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  <span>o con tu email</span>
                  <Separator className="flex-1" />
                </div>
              </>
            ) : null}
            <Tabs
              value={mode}
              onValueChange={(value) => {
                setMode(value as typeof mode);
                setMessage(null);
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Ingresar</TabsTrigger>
                <TabsTrigger value="signup">Registrarme</TabsTrigger>
              </TabsList>
            </Tabs>
            {isPending ? (
              <div className="flex flex-col gap-4" aria-label="Cargando sesión">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : (
              <form onSubmit={submit}>
                <FieldGroup>
                  {mode === "signup" ? (
                    <Field>
                      <FieldLabel htmlFor="name">Nombre</FieldLabel>
                      <Input
                        id="name"
                        aria-invalid={Boolean(message) && name.trim().length < 2}
                        aria-describedby={message ? "login-error" : undefined}
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Tu nombre"
                      />
                    </Field>
                  ) : null}
                  <Field>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      aria-invalid={Boolean(message) && !email.includes("@")}
                      aria-describedby={message ? "login-error" : undefined}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="vos@ejemplo.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                    <Input
                      id="password"
                      aria-invalid={Boolean(message) && password.length < 8}
                      aria-describedby={message ? "login-error" : "password-help"}
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <FieldDescription id="password-help">Mínimo 8 caracteres.</FieldDescription>
                  </Field>
                  <FieldError id="login-error" role="alert">
                    {message}
                  </FieldError>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Spinner data-icon="inline-start" /> : null}
                    {submitting ? "Entrando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
                    <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
