import { Outlet, createBrowserRouter } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Whitepaper } from "@/pages/Whitepaper";
import { SmoothScroll } from "@/providers/SmoothScroll";

function RootLayout() {
  return (
    <SmoothScroll>
      <Outlet />
    </SmoothScroll>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/whitepaper", element: <Whitepaper /> },
    ],
  },
]);
