"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getStoredUserName, setStoredUserName } from "@/lib/user";
import NameGate from "@/components/NameGate";

interface UserContextValue {
  userName: string | null;
  setUserName: (name: string) => void;
}

const UserContext = createContext<UserContextValue>({
  userName: null,
  setUserName: () => {},
});

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so the stored name can only
    // be read after mount. Gating render on `ready` avoids a hydration
    // mismatch between the server (always logged-out) and the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUserNameState(getStoredUserName());
    setReady(true);
  }, []);

  const setUserName = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredUserName(trimmed);
    setUserNameState(trimmed);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {userName ? children : <NameGate onSubmit={setUserName} />}
    </UserContext.Provider>
  );
}
