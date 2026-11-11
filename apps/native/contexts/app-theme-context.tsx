import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Uniwind, useUniwind } from "uniwind";

import { THEME } from "@/lib/theme";

type ThemeName = "light" | "dark";

type AppThemeContextType = {
  currentTheme: ThemeName;
  isLight: boolean;
  isDark: boolean;
  colors: (typeof THEME)[ThemeName];
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const AppThemeContext = createContext<AppThemeContextType | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useUniwind();
  const currentTheme: ThemeName = theme === "dark" ? "dark" : "light";

  const setTheme = useCallback((newTheme: ThemeName) => {
    Uniwind.setTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    Uniwind.setTheme(currentTheme === "light" ? "dark" : "light");
  }, [currentTheme]);

  const value = useMemo(
    () => ({
      currentTheme,
      isLight: currentTheme === "light",
      isDark: currentTheme === "dark",
      colors: THEME[currentTheme],
      setTheme,
      toggleTheme,
    }),
    [currentTheme, setTheme, toggleTheme],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return context;
}
