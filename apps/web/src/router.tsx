import { Outlet, createBrowserRouter } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChatApp } from "@/pages/ChatApp";
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
  // Standalone chat app — its own page, no marketing shell or smooth-scroll.
  { path: "/app", element: <ChatApp /> },
]);
