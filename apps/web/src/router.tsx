import { Outlet, createBrowserRouter } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { DemoPage } from "@/pages/DemoPage";
import { Home } from "@/pages/Home";
import { RoadmapPage } from "@/pages/RoadmapPage";
import { TokenomicsPage } from "@/pages/TokenomicsPage";
import { Whitepaper } from "@/pages/Whitepaper";
import { SmoothScroll } from "@/providers/SmoothScroll";

function RootLayout() {
  return (
    <SmoothScroll>
      <Outlet />
      <ScrollToTop />
    </SmoothScroll>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/demo", element: <DemoPage /> },
      { path: "/tokenomics", element: <TokenomicsPage /> },
      { path: "/roadmap", element: <RoadmapPage /> },
      { path: "/whitepaper", element: <Whitepaper /> },
    ],
  },
]);
