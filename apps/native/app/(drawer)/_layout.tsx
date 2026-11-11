import { Link } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { HouseIcon, PanelBottomIcon, PlusIcon } from "lucide-react-native";
import React, { useCallback } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/contexts/app-theme-context";

function DrawerLayout() {
  const { colors } = useAppTheme();

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: colors.foreground,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: {
          fontWeight: "600",
          color: colors.foreground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: colors.background },
        drawerActiveTintColor: colors.accentForeground,
        drawerActiveBackgroundColor: colors.accent,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : colors.foreground }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <HouseIcon size={size} color={focused ? color : colors.foreground} />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Tabs",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : colors.foreground }}>Tabs</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <PanelBottomIcon size={size} color={focused ? color : colors.foreground} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Button variant="ghost" size="icon" accessibilityLabel="Open modal" className="mr-2">
                <Icon as={PlusIcon} className="size-6 text-foreground" />
              </Button>
            </Link>
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
