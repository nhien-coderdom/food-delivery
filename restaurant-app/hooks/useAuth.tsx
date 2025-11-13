/* import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginRestaurantOwner } from "../lib/api";

type AuthUser = {
  id: number;
  username: string;
  email: string;
  role?: { id: number; name: string };
};

type AuthContextType = {
  user: AuthUser | null;
  jwt: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_JWT_KEY = "restaurant-manager/jwt";
const STORAGE_USER_KEY = "restaurant-manager/user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(user && jwt);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedJwt, storedUser] = await Promise.all([
          AsyncStorage.getItem(STORAGE_JWT_KEY),
          AsyncStorage.getItem(STORAGE_USER_KEY),
        ]);
        if (storedJwt && storedUser) {
          setJwt(storedJwt);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.warn("Không thể khôi phục phiên đăng nhập:", err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const { jwt: token, user: userPayload } = await loginRestaurantOwner(identifier, password);

      await AsyncStorage.multiSet([
        [STORAGE_JWT_KEY, token],
        [STORAGE_USER_KEY, JSON.stringify(userPayload)],
      ]);

      setJwt(token);
      setUser(userPayload);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_JWT_KEY, STORAGE_USER_KEY]);
    setJwt(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, jwt, loading, isAuthenticated, login, logout }),
    [user, jwt, loading, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return ctx;
}; */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Giữ nguyên import này để không lỗi file, dù ta chưa dùng tới api thật lúc này
import { loginRestaurantOwner } from "../lib/api"; 

type AuthUser = {
  id: number;
  username: string;
  email: string;
  role?: { id: number; name: string };
};

type AuthContextType = {
  user: AuthUser | null;
  jwt: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_JWT_KEY = "restaurant-manager/jwt";
const STORAGE_USER_KEY = "restaurant-manager/user";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// CẤU HÌNH MÔI TRƯỜNG DEV (Dữ liệu giả) ---
const MOCK_USER: AuthUser = {
  id: 1,
  username: "Admin Developer",
  email: "admin@dev.com",
  role: { id: 1, name: "Owner" },
};
const MOCK_JWT = "dev-mock-token-123";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(MOCK_USER);
  const [jwt, setJwt] = useState<string | null>(MOCK_JWT);
  const [loading, setLoading] = useState(false); 
  const isAuthenticated = Boolean(user && jwt);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const { jwt: token, user: userPayload } = await loginRestaurantOwner(identifier, password);

      await AsyncStorage.multiSet([
        [STORAGE_JWT_KEY, token],
        [STORAGE_USER_KEY, JSON.stringify(userPayload)],
      ]);

      setJwt(token);
      setUser(userPayload);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    // Khi logout thì xóa hết và về null
    await AsyncStorage.multiRemove([STORAGE_JWT_KEY, STORAGE_USER_KEY]);
    setJwt(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, jwt, loading, isAuthenticated, login, logout }),
    [user, jwt, loading, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider");
  }
  return ctx;
};
