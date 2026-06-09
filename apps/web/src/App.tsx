import { RouterProvider } from "react-router-dom";
import { CursorGlow } from "@/components/CursorGlow";
import { AppProviders } from "@/providers/AppProviders";
import { ThemeProvider } from "@/providers/Theme";
import { WalletProvider } from "@/providers/Wallet";
import { router } from "@/router";

export function App() {
  return (
    <ThemeProvider>
      <AppProviders>
        <WalletProvider>
          {/* Warm fog that trails the cursor, behind all content. */}
          <CursorGlow />
          <RouterProvider router={router} />
        </WalletProvider>
      </AppProviders>
    </ThemeProvider>
  );
}
