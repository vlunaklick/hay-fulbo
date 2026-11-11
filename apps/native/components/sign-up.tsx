import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { ActivityIndicator, type TextInput, View } from "react-native";
import { toast } from "sonner-native";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return null;
}

export function SignUp() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppTheme();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signUp.email(
        {
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            toast.error(error.error?.message || "Failed to sign up");
          },
          onSuccess() {
            formApi.reset();
            toast.success("Account created successfully");
            queryClient.refetchQueries();
          },
        },
      );
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>

      <CardContent>
        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
            validationError: getErrorMessage(state.errorMap.onSubmit),
          })}
        >
          {({ isSubmitting, validationError }) => {
            const formError = validationError;

            return (
              <>
                {formError ? (
                  <Text role="alert" className="mb-3 text-sm text-destructive">
                    {formError}
                  </Text>
                ) : null}

                <View className="gap-3">
                  <form.Field name="name">
                    {(field) => (
                      <View className="gap-1.5">
                        <Label htmlFor="sign-up-name">Name</Label>
                        <Input
                          id="sign-up-name"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChangeText={field.handleChange}
                          placeholder="John Doe"
                          autoComplete="name"
                          textContentType="name"
                          returnKeyType="next"
                          submitBehavior="submit"
                          onSubmitEditing={() => {
                            emailInputRef.current?.focus();
                          }}
                        />
                      </View>
                    )}
                  </form.Field>

                  <form.Field name="email">
                    {(field) => (
                      <View className="gap-1.5">
                        <Label htmlFor="sign-up-email">Email</Label>
                        <Input
                          id="sign-up-email"
                          ref={emailInputRef}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChangeText={field.handleChange}
                          placeholder="email@example.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoComplete="email"
                          textContentType="emailAddress"
                          returnKeyType="next"
                          submitBehavior="submit"
                          onSubmitEditing={() => {
                            passwordInputRef.current?.focus();
                          }}
                        />
                      </View>
                    )}
                  </form.Field>

                  <form.Field name="password">
                    {(field) => (
                      <View className="gap-1.5">
                        <Label htmlFor="sign-up-password">Password</Label>
                        <Input
                          id="sign-up-password"
                          ref={passwordInputRef}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChangeText={field.handleChange}
                          placeholder="••••••••"
                          secureTextEntry
                          autoComplete="new-password"
                          textContentType="newPassword"
                          returnKeyType="go"
                          onSubmitEditing={form.handleSubmit}
                        />
                      </View>
                    )}
                  </form.Field>

                  <Button onPress={form.handleSubmit} disabled={isSubmitting} className="mt-1">
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Text>Create Account</Text>
                    )}
                  </Button>
                </View>
              </>
            );
          }}
        </form.Subscribe>
      </CardContent>
    </Card>
  );
}
