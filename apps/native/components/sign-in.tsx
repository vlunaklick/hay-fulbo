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

const signInSchema = z.object({
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

function SignIn() {
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppTheme();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            toast.error(error.error?.message || "Failed to sign in");
          },
          onSuccess() {
            formApi.reset();
            toast.success("Signed in successfully");
            queryClient.refetchQueries();
          },
        },
      );
    },
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
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
                  <form.Field name="email">
                    {(field) => (
                      <View className="gap-1.5">
                        <Label htmlFor="sign-in-email">Email</Label>
                        <Input
                          id="sign-in-email"
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
                        <Label htmlFor="sign-in-password">Password</Label>
                        <Input
                          id="sign-in-password"
                          ref={passwordInputRef}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChangeText={field.handleChange}
                          placeholder="••••••••"
                          secureTextEntry
                          autoComplete="password"
                          textContentType="password"
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
                      <Text>Sign In</Text>
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

export { SignIn };
