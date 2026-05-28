import { Outlet, createBrowserRouter } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Home } from "@/pages/Home";
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
    children: [{ path: "/", element: <Home /> }],
  },
]);
