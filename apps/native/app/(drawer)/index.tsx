import { useQuery } from "@tanstack/react-query";
import { CircleCheckIcon, CircleXIcon, HourglassIcon } from "lucide-react-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { queryClient, trpc } from "@/utils/trpc";

export default function Home() {
  const healthCheck = useQuery(trpc.healthCheck.queryOptions());
  const privateData = useQuery(trpc.privateData.queryOptions());
  const isConnected = healthCheck?.data === "OK";
  const isLoading = healthCheck?.isLoading;
  const { data: session } = authClient.useSession();

  return (
    <Container className="p-6">
      <View className="mb-6 py-4">
        <Text variant="h1" className="text-left">
          BETTER T STACK
        </Text>
      </View>

      {session?.user ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-normal">
              Welcome, <Text className="font-medium">{session.user.name}</Text>
            </CardTitle>
            <CardDescription>{session.user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              className="self-start"
              onPress={() => {
                authClient.signOut();
                queryClient.invalidateQueries();
              }}
            >
              <Text>Sign Out</Text>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>System Status</CardTitle>
          <Badge variant={isConnected ? "default" : "destructive"}>
            <Text>{isConnected ? "LIVE" : "OFFLINE"}</Text>
          </Badge>
        </CardHeader>
        <Separator />
        <CardContent>
          <View className="flex-row items-center">
            <View
              className={cn(
                "mr-3 size-3 rounded-full",
                isConnected ? "bg-primary" : "bg-muted-foreground",
              )}
            />
            <View className="flex-1 gap-1">
              <Text className="font-medium">TRPC Backend</Text>
              <CardDescription>
                {isLoading
                  ? "Checking connection..."
                  : isConnected
                    ? "Connected to API"
                    : "API Disconnected"}
              </CardDescription>
            </View>
            {isLoading && <Icon as={HourglassIcon} className="size-5 text-muted-foreground" />}
            {!isLoading && isConnected && (
              <Icon as={CircleCheckIcon} className="size-5 text-primary" />
            )}
            {!isLoading && !isConnected && (
              <Icon as={CircleXIcon} className="size-5 text-destructive" />
            )}
          </View>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Private Data</CardTitle>
          {privateData && <CardDescription>{privateData.data?.message}</CardDescription>}
        </CardHeader>
      </Card>

      {!session?.user && (
        <>
          <SignIn />
          <SignUp />
        </>
      )}
    </Container>
  );
}
