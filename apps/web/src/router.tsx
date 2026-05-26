import { createBrowserRouter } from "react-router-dom";
import { Home } from "@/pages/Home";
import { Whitepaper } from "@/pages/Whitepaper";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/whitepaper", element: <Whitepaper /> },
]);
