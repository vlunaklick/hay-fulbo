import * as Haptics from "expo-haptics";
import { MoonIcon, SunIcon } from "lucide-react-native";
import { Platform } from "react-native";
import Animated, { FadeOut, ZoomIn } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAppTheme } from "@/contexts/app-theme-context";

export function ThemeToggle() {
  const { toggleTheme, isLight } = useAppTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      accessibilityLabel={isLight ? "Switch to dark theme" : "Switch to light theme"}
      onPress={() => {
        if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        toggleTheme();
      }}
      className="mr-1 rounded-full"
    >
      {isLight ? (
        <Animated.View key="moon" entering={ZoomIn} exiting={FadeOut}>
          <Icon as={MoonIcon} className="size-5 text-foreground" />
        </Animated.View>
      ) : (
        <Animated.View key="sun" entering={ZoomIn} exiting={FadeOut}>
          <Icon as={SunIcon} className="size-5 text-foreground" />
        </Animated.View>
      )}
    </Button>
  );
}
