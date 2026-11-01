import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  api,
  ApiError,
  type SignInInput,
  type SignUpInput,
  type User,
} from "../lib/api";

type Status = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: Status;
  user: User | null;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((me) => {
        if (!active) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;

        if (!(error instanceof ApiError) || error.status !== 401)
          console.warn("Session check failed", error);
        setStatus("unauthenticated");
      });
    return () => {
      active = false;
    };
  }, []);

  const establish = useCallback((signedIn: User) => {
    setUser(signedIn);
    setStatus("authenticated");
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput) => establish((await api.signUp(input)).user),
    [establish],
  );
  const signIn = useCallback(
    async (input: SignInInput) => establish((await api.signIn(input)).user),
    [establish],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, signUp, signIn, logout }),
    [status, user, signUp, signIn, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
