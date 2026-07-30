"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
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
    const requestedReturn = new URLSearchParams(window.location.search).get("returnTo");
    const returnTo =
      requestedReturn &&
      /^\/(?:invitaciones\/[A-Za-z0-9_-]+|sumarse\/[A-Za-z0-9_.-]+)$/.test(requestedReturn)
        ? requestedReturn
        : "/dashboard";
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
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheckIcon aria-hidden="true" />
            <span className="text-sm font-semibold uppercase tracking-[0.18em]">Hay Fulbo</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">El partido, bajo control.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Armá equipos, cerrá el resultado y dejá las cuentas claras desde cualquier pantalla.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>{mode === "signin" ? "Entrar al grupo" : "Crear tu cuenta"}</CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Usá los datos con los que te registraste."
                : "Después vas a poder crear o elegir tu grupo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Tabs value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
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
                      type="password"
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <FieldDescription>Mínimo 8 caracteres.</FieldDescription>
                  </Field>
                  <FieldError>{message}</FieldError>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Entrando…" : mode === "signin" ? "Entrar" : "Crear cuenta"}
                    <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
