import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { ParticleField } from "@/components/ParticleField";
import { Preloader } from "@/components/Preloader";
import { AppProviders } from "@/providers/AppProviders";
import { router } from "@/router";

export function App() {
  const [booting, setBooting] = useState(true);

  return (
    <AppProviders>
      {/* Global interactive star field behind everything */}
      <ParticleField className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
      <AnimatePresence>{booting && <Preloader onDone={() => setBooting(false)} />}</AnimatePresence>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
