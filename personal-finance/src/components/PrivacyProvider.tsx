"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type PrivacyContextType = {
  privacyMode: boolean;
  togglePrivacy: () => void;
};

const PrivacyContext = createContext<PrivacyContextType>({
  privacyMode: true,
  togglePrivacy: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(true);
  const togglePrivacy = useCallback(() => setPrivacyMode((p) => !p), []);

  return (
    <PrivacyContext.Provider value={{ privacyMode, togglePrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
