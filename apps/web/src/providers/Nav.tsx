import { createContext, useContext } from "react";

/** The separate "views" of the app — switched in-place, without a route change. */
export type View = "home" | "chat" | "roadmap" | "whitepaper";

export interface NavState {
  view: View;
  navigate: (view: View) => void;
}

export const NavContext = createContext<NavState>({ view: "home", navigate: () => {} });

export const useNav = (): NavState => useContext(NavContext);
