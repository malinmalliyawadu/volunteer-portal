"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  ThemedDropdownMenu,
  ThemedDropdownMenuContent,
  ThemedDropdownMenuItem,
  ThemedDropdownMenuTrigger,
  ThemedDropdownMenuIcon,
} from "@/components/ui/themed-dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ThemedDropdownMenu>
      <ThemedDropdownMenuTrigger>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/90 hover:text-white hover:bg-white/10 transition-colors duration-200 rounded-lg p-2 relative"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </ThemedDropdownMenuTrigger>
      <ThemedDropdownMenuContent align="end" className="w-48 p-2">
        <ThemedDropdownMenuItem onClick={() => setTheme("light")}>
          <ThemedDropdownMenuIcon
            variant={theme === "light" ? "active" : "default"}
            className={theme === "light" ? "" : "bg-gray-100 dark:bg-emerald-900/40"}
          >
            <Sun
              className={`h-4 w-4 ${
                theme === "light"
                  ? "text-primary dark:text-emerald-400"
                  : "text-gray-600 dark:text-emerald-600"
              }`}
            />
          </ThemedDropdownMenuIcon>
          <span className="font-medium dark:text-gray-100">Light</span>
        </ThemedDropdownMenuItem>
        
        <ThemedDropdownMenuItem onClick={() => setTheme("dark")}>
          <ThemedDropdownMenuIcon
            variant={theme === "dark" ? "active" : "default"}
            className={theme === "dark" ? "" : "bg-gray-100 dark:bg-emerald-900/40"}
          >
            <Moon
              className={`h-4 w-4 ${
                theme === "dark"
                  ? "text-primary dark:text-emerald-400"
                  : "text-gray-600 dark:text-emerald-600"
              }`}
            />
          </ThemedDropdownMenuIcon>
          <span className="font-medium dark:text-gray-100">Dark</span>
        </ThemedDropdownMenuItem>
        
        <ThemedDropdownMenuItem onClick={() => setTheme("system")}>
          <ThemedDropdownMenuIcon
            variant={theme === "system" ? "active" : "default"}
            className={theme === "system" ? "" : "bg-gray-100 dark:bg-emerald-900/40"}
          >
            <Monitor
              className={`h-4 w-4 ${
                theme === "system"
                  ? "text-primary dark:text-emerald-400"
                  : "text-gray-600 dark:text-emerald-600"
              }`}
            />
          </ThemedDropdownMenuIcon>
          <span className="font-medium dark:text-gray-100">System</span>
        </ThemedDropdownMenuItem>
      </ThemedDropdownMenuContent>
    </ThemedDropdownMenu>
  );
}