import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { apiService } from "../services/apiService";

interface User {
  uid: string;
  email: string;
}

interface Profile {
  uid: string;
  firstName: string;
  age?: number;
  distance?: number;
  onboardingComplete: boolean;
  simulationComplete: boolean;
  matchFound: boolean;
  vibeScore?: any;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, firstName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const token = localStorage.getItem("token");
    if (token && user) {
      try {
        const data = await apiService.getCurrentUser(token);
        setUser({ uid: data.user.uid, email: data.user.email });
        setProfile(data.profile);
      } catch (error) {
        console.error("Failed to refresh profile:", error);
        logout();
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      apiService.getCurrentUser(token)
        .then((data) => {
          setUser({ uid: data.user.uid, email: data.user.email });
          setProfile(data.profile);
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await apiService.login(email, password);
    localStorage.setItem("token", response.token);
    setUser({ uid: response.user.id, email: response.user.email });
    await refreshProfile();
  };

  const register = async (email: string, firstName: string, password: string) => {
    const response = await apiService.register(email, firstName, password);
    localStorage.setItem("token", response.token);
    setUser({ uid: response.user.id, email: response.user.email });
    setProfile({
      uid: response.user.id,
      firstName: response.user.firstName,
      onboardingComplete: false,
      simulationComplete: false,
      matchFound: false,
    });
  };

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
