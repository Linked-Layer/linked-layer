import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { Preloader } from "@/components/Preloader";
import { AppProviders } from "@/providers/AppProviders";
import { router } from "@/router";

export function App() {
  const [booting, setBooting] = useState(true);

  return (
    <AppProviders>
      <AnimatePresence>{booting && <Preloader onDone={() => setBooting(false)} />}</AnimatePresence>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
