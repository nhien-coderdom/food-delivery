import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/apiConfig";

interface AuthContextProps {
  user: any;
  jwt: string | null;
  loading: boolean;
  login: (user: any, token: string) => Promise<void>;
  logout: () => Promise<void>;
  syncUserToStrapi: (clerkUser: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  jwt: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  syncUserToStrapi: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedJwt = await AsyncStorage.getItem("jwt");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedJwt && storedUser) {
          setJwt(storedJwt);
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (userData: any, token: string) => {
    await AsyncStorage.setItem("jwt", token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));

    setJwt(token);
    setUser(userData);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["jwt", "user"]);
    setJwt(null);
    setUser(null);
  };

  const syncUserToStrapi = async (clerkUser: any) => {
    try {
      const email = clerkUser.emailAddresses[0].emailAddress;

      const res = await fetch(`${API_URL}/api/sync-clerk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          clerkUserID: clerkUser.id,
          username: clerkUser.username || clerkUser.firstName,
          provider: "clerk",
        }),
      });

      const data = await res.json();

      if (data?.user && data?.jwt) {
        await login(data.user, data.jwt);
      }
    } catch (err) {
      console.error("❌ Sync User Error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, jwt, loading, login, logout, syncUserToStrapi }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
