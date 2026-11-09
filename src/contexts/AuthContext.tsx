import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { forecastStore } from "@/lib/forecastStore";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
}

export interface Session {
  token: string;
  user: User;
}

export interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
}

export type SyncStatus = "idle" | "syncing" | "synced" | "error" | "local";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  syncStatus: SyncStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  verifyEmail: (otp: string) => Promise<void>;
  resendVerificationOtp: () => Promise<void>;
  changeEmail: (newEmail: string) => Promise<string>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const BACKEND_URL = 'http://localhost:5000';

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("local");

  // Hydrate forecast store from MongoDB cloud
  const hydrateForecast = useCallback(async (token: string) => {
    setSyncStatus("syncing");
    try {
      const response = await fetch(`${BACKEND_URL}/api/forecasts`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to fetch forecasts");
      const rows = await response.json();

      if (!rows || rows.length === 0) {
        setSyncStatus("synced");
        return;
      }

      const latestForecast = rows[0];

      forecastStore.set({
        generatedAt: new Date(latestForecast.createdAt).getTime(),
        horizonDays: latestForecast.horizonDays ?? 90,
        products: latestForecast.products ?? [],
        source: latestForecast.source ?? "local",
      });
      setSyncStatus("synced");
    } catch {
      setSyncStatus("error");
    }
  }, []);

  // Check current session on load
  useEffect(() => {
    const token = localStorage.getItem("forecaster_jwt");
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error("Session expired");
        return res.json();
      })
      .then(data => {
        const u = { id: data.id, email: data.email, name: data.name, emailVerified: data.emailVerified };
        setSession({ token, user: u });
        setUser(u);
        setProfile({
          id: data.id,
          full_name: data.name,
          company_name: "",
          created_at: data.createdAt
        });
        hydrateForecast(token);
      })
      .catch(() => {
        localStorage.removeItem("forecaster_jwt");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [hydrateForecast]);

  // ── Auth actions ────────────────────────────────────────────────────────────

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    localStorage.setItem("forecaster_jwt", data.token);
    const u = { id: data.user.id, email: data.user.email, name: data.user.name, emailVerified: data.user.emailVerified };
    setSession({ token: data.token, user: u });
    setUser(u);
    setProfile({
      id: data.user.id,
      full_name: data.user.name,
      company_name: "",
      created_at: new Date().toISOString()
    });
    hydrateForecast(data.token);
  };

  const signUp = async (email: string, password: string, fullName: string, companyName: string) => {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }

    localStorage.setItem("forecaster_jwt", data.token);
    const u = { id: data.user.id, email: data.user.email, name: data.user.name, emailVerified: false };
    setSession({ token: data.token, user: u });
    setUser(u);
    setProfile({
      id: data.user.id,
      full_name: data.user.name,
      company_name: companyName,
      created_at: new Date().toISOString()
    });
    setSyncStatus("synced");
  };

  const signOut = async () => {
    localStorage.removeItem("forecaster_jwt");
    setSession(null);
    setUser(null);
    setProfile(null);
    forecastStore.set(null);
    setSyncStatus("local");
  };

  const updateProfileName = async (name: string) => {
    const token = localStorage.getItem("forecaster_jwt");
    if (!token) return;

    const response = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to update profile");
    }

    setProfile(prev => prev ? { ...prev, full_name: name } : null);
    setUser(prev => prev ? { ...prev, name } : null);
  };

  const verifyEmail = async (otp: string) => {
    const token = localStorage.getItem("forecaster_jwt");
    if (!token) throw new Error("No active session");

    const response = await fetch(`${BACKEND_URL}/api/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ otp })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Email verification failed");
    }

    setUser(prev => prev ? { ...prev, email: data.user.email, emailVerified: true } : null);
    setSession(prev => prev ? { ...prev, user: { ...prev.user, email: data.user.email, emailVerified: true } } : null);
  };

  const resendVerificationOtp = async () => {
    const token = localStorage.getItem("forecaster_jwt");
    if (!token) throw new Error("No active session");

    // Send user email in body as backup — primary lookup uses JWT token claim
    const currentEmail = user?.email ?? session?.user?.email ?? "";

    const response = await fetch(`${BACKEND_URL}/api/auth/resend-verification-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ email: currentEmail })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to resend verification code");
    }
  };

  const changeEmail = async (newEmail: string): Promise<string> => {
    const token = localStorage.getItem("forecaster_jwt");
    if (!token) throw new Error("No active session");

    const response = await fetch(`${BACKEND_URL}/api/auth/email`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ newEmail })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to initiate email change");
    }

    setUser(prev => prev ? { ...prev, emailVerified: false } : null);
    setSession(prev => prev ? { ...prev, user: { ...prev.user, emailVerified: false } } : null);

    return data.message;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        syncStatus,
        signIn,
        signUp,
        signOut,
        updateProfileName,
        verifyEmail,
        resendVerificationOtp,
        changeEmail
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
