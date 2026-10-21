import { createContext, useContext } from "react";

// ============================================================
// APP CONTEXT
// Shares auth state, complaint data and actions between the
// routed pages without prop drilling.
// ============================================================
export const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside the App provider");
  }

  return context;
}
