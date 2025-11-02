import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Address = {
  id: string;
  label: string; // e.g., "Home", "Office"
  address: string; // display string
};

type AddressContextType = {
  currentAddress: string;
  saved: Address[];
  setCurrentAddress: (addr: string) => void;
  addAddress: (addr: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
};

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const STORAGE_KEY_ADDR = "fd_saved_addresses";
const STORAGE_KEY_CURR = "fd_current_address";

export function AddressProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddressState] = useState<string>("Nhập địa chỉ giao hàng");

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(STORAGE_KEY_ADDR);
        const c = await AsyncStorage.getItem(STORAGE_KEY_CURR);
        if (s) setSaved(JSON.parse(s));
        if (c) setCurrentAddressState(c);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_ADDR, JSON.stringify(saved)).catch(() => {});
  }, [saved]);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY_CURR, currentAddress).catch(() => {});
  }, [currentAddress]);

  const setCurrentAddress = (addr: string) => setCurrentAddressState(addr);

  const addAddress: AddressContextType["addAddress"] = (addr) => {
    const a: Address = { id: `${Date.now()}`, ...addr };
    setSaved((prev) => [a, ...prev]);
    setCurrentAddressState(addr.address);
  };

  const removeAddress: AddressContextType["removeAddress"] = (id) => {
    setSaved((prev) => prev.filter((x) => x.id !== id));
  };

  const value = useMemo(
    () => ({ currentAddress, saved, setCurrentAddress, addAddress, removeAddress }),
    [currentAddress, saved]
  );

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}
