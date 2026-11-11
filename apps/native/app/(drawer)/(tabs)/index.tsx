import { View } from "react-native";

import { Container } from "@/components/container";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <Container className="p-6">
      <View className="flex-1 items-center justify-center">
        <Card className="px-2">
          <CardHeader className="items-center">
            <CardTitle className="text-3xl">Tab One</CardTitle>
          </CardHeader>
        </Card>
      </View>
    </Container>
  );
}
