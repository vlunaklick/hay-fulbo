"use client";

// PROTOTYPE ONLY — the email/Google form used by "Pase" and "La lista".

import { Button } from "@hay-fulbo/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@hay-fulbo/ui/components/field";
import { Input } from "@hay-fulbo/ui/components/input";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { Tabs, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { ArrowRightIcon } from "lucide-react";

import { GoogleIcon, type LoginState } from "./shared";

export function LoginForm({ login, idPrefix }: { login: LoginState; idPrefix: string }) {
  const errorId = `${idPrefix}-error`;
  return (
    <div className="flex flex-col gap-5">
      <Button type="button" variant="outline" onClick={login.startGoogle} disabled={login.google}>
        {login.google ? <Spinner data-icon="inline-start" /> : <GoogleIcon />}
        {login.google ? "Abriendo Google…" : "Continuar con Google"}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        <span>o con tu email</span>
        <Separator className="flex-1" />
      </div>
      <Tabs
        value={login.mode}
        onValueChange={(value) => login.switchMode(value as "signin" | "signup")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Ingresar</TabsTrigger>
          <TabsTrigger value="signup">Registrarme</TabsTrigger>
        </TabsList>
      </Tabs>
      <form onSubmit={login.submit} noValidate>
        <FieldGroup>
          {login.mode === "signup" ? (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-name`}>Nombre</FieldLabel>
              <Input
                id={`${idPrefix}-name`}
                autoComplete="name"
                className="text-base md:text-sm"
                aria-invalid={Boolean(login.message) && login.name.trim().length < 2}
                aria-describedby={login.message ? errorId : undefined}
                value={login.name}
                onChange={(event) => login.setName(event.target.value)}
              />
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-email`}>Email</FieldLabel>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              className="text-base md:text-sm"
              aria-invalid={Boolean(login.message) && !login.email.includes("@")}
              aria-describedby={login.message ? errorId : undefined}
              placeholder="vos@ejemplo.com"
              value={login.email}
              onChange={(event) => login.setEmail(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-password`}>Contraseña</FieldLabel>
            <Input
              id={`${idPrefix}-password`}
              type="password"
              className="text-base md:text-sm"
              autoComplete={login.mode === "signin" ? "current-password" : "new-password"}
              aria-invalid={Boolean(login.message) && login.password.length < 8}
              aria-describedby={login.message ? errorId : `${idPrefix}-password-help`}
              value={login.password}
              onChange={(event) => login.setPassword(event.target.value)}
            />
            <FieldDescription id={`${idPrefix}-password-help`}>
              Mínimo 8 caracteres.
            </FieldDescription>
          </Field>
          <FieldError id={errorId} role="alert">
            {login.message}
          </FieldError>
          <Button type="submit" disabled={login.submitting}>
            {login.submitting ? <Spinner data-icon="inline-start" /> : null}
            {login.submitting ? "Entrando…" : login.mode === "signin" ? "Entrar" : "Crear cuenta"}
            <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </FieldGroup>
      </form>
    </div>
  );
}
