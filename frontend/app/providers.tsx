"use client";

// Client-side providers (theme + auth). Wraps the app in layout.tsx.

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { AuthProvider } from "../components/auth-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
