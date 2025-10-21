import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthContextProps {
  user: any;
  jwt: string | null;
  loading: boolean;
  login: (user: any, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  jwt: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedJwt = await AsyncStorage.getItem("jwt");
      const storedUser = await AsyncStorage.getItem("user");
      if (storedJwt && storedUser) {
        setJwt(storedJwt);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    })();
  }, []);

  const login = async (userData: any, token: string) => {
    await AsyncStorage.setItem("jwt", token);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setJwt(token);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("jwt");
    await AsyncStorage.removeItem("user");
    setUser(null);
    setJwt(null);
  };

  return (
    <AuthContext.Provider value={{ user, jwt, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
