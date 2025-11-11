import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/apiConfig";

interface AuthContextProps {
  user: any;
  jwt: string | null;
  loading: boolean;
  login: (user: any, token?: string) => Promise<void>;
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

  // 🟢 Load dữ liệu user & jwt khi mở app
  useEffect(() => {
    (async () => {
      try {
        const storedJwt = await AsyncStorage.getItem("jwt");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedJwt && storedUser) {
          setJwt(storedJwt);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn("⚠️ Failed to load auth:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 🟢 Lưu thông tin user & token sau khi login
  const login = async (userData: any, token?: string) => {
    try {
      if (token) await AsyncStorage.setItem("jwt", token);
      await AsyncStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      if (token) setJwt(token);

      console.log("✅ Logged in user:", userData);
    } catch (err) {
      console.error("⚠️ Failed to save user:", err);
    }
  };

  // 🟢 Đăng xuất, xóa cache
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(["jwt", "user"]);
      setUser(null);
      setJwt(null);
      console.log("👋 Logged out");
    } catch (err) {
      console.error("⚠️ Failed to logout:", err);
    }
  };

  // 🟢 Đồng bộ Clerk → Strapi (đảm bảo có user.id thật trong Strapi)
  // ✅ Hàm đồng bộ user Clerk → Strapi (luôn có id Strapi)
const syncUserToStrapi = async (clerkUser: any) => {
  try {
    if (!clerkUser) throw new Error("No Clerk user provided");

    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    const clerkUserID = clerkUser.id;

    if (!email || !clerkUserID) {
      throw new Error("Missing required fields (email, clerkUserID)");
    }

    const res = await fetch(`${API_URL}/api/sync-clerk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkUserID,
        email,
        username: clerkUser.username || clerkUser.firstName || "user",
        provider: "clerk",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("❌ Sync Clerk User Error:", data);
      throw new Error(data?.error?.message || "Failed to sync user");
    }

    if (data?.user?.id) {
      console.log("✅ Synced user to Strapi:", data.user);
      await login(data.user); // 👈 Lưu user vào AsyncStorage + state
    } else {
      console.warn("⚠️ Strapi did not return user.id:", data);
    }
  } catch (err) {
    console.error("❌ Sync Clerk User Error:", err);
  }
};


  return (
    <AuthContext.Provider
      value={{ user, jwt, loading, login, logout, syncUserToStrapi }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
