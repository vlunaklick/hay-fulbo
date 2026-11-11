import { router } from "expo-router";
import { CheckIcon } from "lucide-react-native";
import { View } from "react-native";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

function Modal() {
  function handleClose() {
    router.back();
  }

  return (
    <Container>
      <View className="flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="items-center">
            <View className="mb-3 size-12 items-center justify-center rounded-lg bg-primary">
              <Icon as={CheckIcon} className="size-6 text-primary-foreground" />
            </View>
          </CardContent>
          <CardHeader className="items-center">
            <CardTitle className="text-lg">Modal Screen</CardTitle>
            <CardDescription className="text-center">
              This is an example modal screen for dialogs and confirmations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onPress={handleClose} className="w-full" size="sm">
              <Text>Close</Text>
            </Button>
          </CardFooter>
        </Card>
      </View>
    </Container>
  );
}

export default Modal;
