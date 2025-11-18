import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type LocationCoords = {
  latitude: number;
  longitude: number;
};

export type Address = {
  id: string;
  label: string;   // Home, Company...
  address: string; // Full human-readable string
  location?: LocationCoords | null;
};

type AddressContextType = {
  currentAddress: string;
  currentLocation: LocationCoords | null;
  saved: Address[];

  setCurrentAddress: (addr: string) => void;
  setCurrentLocation: (coords: LocationCoords | null) => void;

  addAddress: (addr: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
};

// Context
const AddressContext = createContext<AddressContextType | undefined>(undefined);

// Storage keys
const KEY_SAVED = "fd_saved_addresses";
const KEY_ADDRESS = "fd_current_address";
const KEY_LOCATION = "fd_current_location";

// Provider
export function AddressProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddressState] = useState("Nhập địa chỉ giao hàng");
  const [currentLocation, setCurrentLocationState] = useState<LocationCoords | null>(null);

  // Load from storage
  useEffect(() => {
    (async () => {
      try {
        const savedJson = await AsyncStorage.getItem(KEY_SAVED);
        const addressJson = await AsyncStorage.getItem(KEY_ADDRESS);
        const locationJson = await AsyncStorage.getItem(KEY_LOCATION);

        if (savedJson) setSaved(JSON.parse(savedJson));
        if (addressJson) setCurrentAddressState(addressJson);
        if (locationJson) setCurrentLocationState(JSON.parse(locationJson));
      } catch (err) {
        console.warn("⚠ Lỗi load địa chỉ:", err);
      }
    })();
  }, []);

  // Persist changes
  useEffect(() => {
    AsyncStorage.setItem(KEY_SAVED, JSON.stringify(saved)).catch(() => {});
  }, [saved]);

  useEffect(() => {
    AsyncStorage.setItem(KEY_ADDRESS, currentAddress).catch(() => {});
  }, [currentAddress]);

  useEffect(() => {
    AsyncStorage.setItem(KEY_LOCATION, JSON.stringify(currentLocation)).catch(() => {});
  }, [currentLocation]);

  // Mutations
  const setCurrentAddress = (addr: string) => setCurrentAddressState(addr);

  const setCurrentLocation = (coords: LocationCoords | null) =>
    setCurrentLocationState(coords);

  const addAddress = (addr: Omit<Address, "id">) => {
    const newAddress: Address = {
      id: `${Date.now()}`,
      ...addr,
    };

    setSaved((prev) => [newAddress, ...prev]);
    setCurrentAddressState(addr.address);
    setCurrentLocationState(addr.location ?? null);
  };

  const removeAddress = (id: string) => {
    setSaved((prev) => prev.filter((a) => a.id !== id));
  };

  // Export value
  const value = useMemo(
    () => ({
      currentAddress,
      currentLocation,
      saved,
      setCurrentAddress,
      setCurrentLocation,
      addAddress,
      removeAddress,
    }),
    [currentAddress, currentLocation, saved]
  );
  console.log(value)

  return (
    <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
  );
}

// Hook
export function useAddress() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error("useAddress must be used within AddressProvider");
  return ctx;
}
