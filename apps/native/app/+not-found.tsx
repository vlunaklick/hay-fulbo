import { Link, Stack } from "expo-router";
import { View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <Container>
        <View className="flex-1 items-center justify-center p-4">
          <Card className="w-full max-w-sm items-center">
            <CardHeader className="items-center">
              <Text className="mb-1 text-4xl">🤔</Text>
              <CardTitle className="text-lg">Page Not Found</CardTitle>
              <CardDescription className="text-center">
                The page you're looking for doesn't exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/" asChild>
                <Button size="sm">
                  <Text>Go Home</Text>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </View>
      </Container>
    </>
  );
}
