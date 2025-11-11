import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/apiConfig";
import { useAuth } from "../app/context/AuthContext";

export interface CartItem {
  id: string; // unique line id
  dishId: number;
  name: string;
  price: number;
  quantity: number;
  restaurantId: number;
  restaurantName: string;
  image?: string;
}

export interface CartContextType {
  currentRestaurant: number | null;
  currentRestaurantName: string | null;
  selectRestaurant: (id: number, name: string) => void;

  items: CartItem[];
  itemCount: number;
  totalPrice: number;

  addItem: (item: Omit<CartItem, "quantity" | "id">) => void;
  removeItem: (dishId: number) => void;
  updateQuantity: (dishId: number, quantity: number) => void;

  clearCart: () => void;
  getItemQuantity: (dishId: number) => number;

  currentCart?: CartItem[];
  allCarts?: Record<number, CartItem[]>;
  clearAllCarts?: () => void;

  syncWithServer: () => Promise<void>;
  fetchRemoteCarts: () => Promise<void>;
}

const STORAGE_KEY = "@foodapp/carts-by-restaurant";
const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, jwt } = useAuth();

  const [carts, setCarts] = useState<Record<number, CartItem[]>>({});
  const [currentRestaurant, setCurrentRestaurant] = useState<number | null>(
    null
  );
  const [currentRestaurantName, setCurrentRestaurantName] = useState<
    string | null
  >(null);

  const hydrated = useRef(false);

  // 🔁 Load từ AsyncStorage khi mở app
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object") {
            setCarts(parsed);
          }
        }
      } catch (err) {
        console.warn("⚠️ Failed to load carts:", err);
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  // 💾 Lưu cart xuống storage khi thay đổi
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch((err) => {
      console.warn("⚠️ Failed to persist carts:", err);
    });
  }, [carts]);

  // 🧭 Chọn nhà hàng hiện tại
  const selectRestaurant = (id: number, name: string) => {
    setCurrentRestaurant(id);
    setCurrentRestaurantName(name);
  };

  // 🧮 Lấy giỏ hàng hiện tại
  const currentCart: CartItem[] = useMemo(() => {
    if (!currentRestaurant) return [];
    const cart = carts[currentRestaurant];
    return Array.isArray(cart) ? cart : [];
  }, [currentRestaurant, carts]);

  // 🧾 Tổng số lượng và tổng tiền
  const itemCount = useMemo(
    () => currentCart.reduce((s, i) => s + i.quantity, 0),
    [currentCart]
  );
  const totalPrice = useMemo(
    () => currentCart.reduce((s, i) => s + i.price * i.quantity, 0),
    [currentCart]
  );

  // ➕ Thêm món
  const addItem: CartContextType["addItem"] = (newItem) => {
    const restaurantId = newItem.restaurantId;
    if (!restaurantId) return;

    if (!currentRestaurant || currentRestaurant !== restaurantId) {
      setCurrentRestaurant(restaurantId);
      setCurrentRestaurantName(newItem.restaurantName);
    }

    setCarts((prev) => {
      const existingCart = prev[restaurantId] || [];
      const exists = existingCart.find((it) => it.dishId === newItem.dishId);

      const updated = exists
        ? existingCart.map((it) =>
            it.dishId === newItem.dishId
              ? { ...it, quantity: it.quantity + 1 }
              : it
          )
        : [
            ...existingCart,
            {
              id: `${restaurantId}-${newItem.dishId}-${Date.now()}`,
              quantity: 1,
              ...newItem,
            },
          ];

      return { ...prev, [restaurantId]: updated };
    });
  };

  // ❌ Xóa món
  const removeItem: CartContextType["removeItem"] = (dishId) => {
    if (!currentRestaurant) return;
    setCarts((prev) => {
      const current = prev[currentRestaurant] || [];
      const updated = current.filter((it) => it.dishId !== dishId);
      return { ...prev, [currentRestaurant]: updated };
    });
  };

  // 🔁 Cập nhật số lượng
  const updateQuantity: CartContextType["updateQuantity"] = (
    dishId,
    quantity
  ) => {
    if (!currentRestaurant) return;
    setCarts((prev) => {
      const current = prev[currentRestaurant] || [];
      const updated =
        quantity <= 0
          ? current.filter((it) => it.dishId !== dishId)
          : current.map((it) =>
              it.dishId === dishId ? { ...it, quantity } : it
            );
      return { ...prev, [currentRestaurant]: updated };
    });
  };

  // 🧹 Xóa giỏ hiện tại
  const clearCurrentCart = () => {
    if (!currentRestaurant) return;
    setCarts((prev) => {
      const copy = { ...prev };
      delete copy[currentRestaurant];
      return copy;
    });
  };

  // 🚮 Xóa tất cả giỏ
  const clearAllCarts = () => setCarts({});

  // 🔍 Lấy số lượng 1 món trong currentCart
  const getItemQuantity: CartContextType["getItemQuantity"] = (dishId) =>
    currentCart.find((it) => it.dishId === dishId)?.quantity ?? 0;

  // ☁️ Đồng bộ lên Strapi
  const syncWithServer = async () => {
    if (!jwt || !user) {
      console.warn("⚠️ No JWT or user, skip sync");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cart/sync`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ carts }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn("❌ Sync failed:", text);
      } else {
        console.log("✅ Cart synced successfully");
      }
    } catch (err) {
      console.warn("⚠️ Sync error:", err);
    }
  };

  // ☁️ Lấy giỏ từ Strapi khi user login
  const fetchRemoteCarts = async () => {
    if (!jwt || !user) return;
    try {
      const res = await fetch(`${API_URL}/cart/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const normalized: Record<number, CartItem[]> = {};
        for (const c of data) {
          const restId = c.restaurant?.id || c.restaurant;
          normalized[restId] = c.items || [];
        }
        setCarts(normalized);
        console.log("✅ Loaded carts from Strapi");
      }
    } catch (err) {
      console.warn("⚠️ Failed to fetch remote carts:", err);
    }
  };

  // 🔁 Tự động tải carts từ Strapi khi user login
  useEffect(() => {
    if (user && jwt) {
      fetchRemoteCarts();
    }
  }, [user, jwt]);

  const clearCart = clearCurrentCart;
  const items = currentCart;

  const value: CartContextType = {
    currentRestaurant,
    currentRestaurantName,
    selectRestaurant,
    items,
    itemCount,
    totalPrice,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    currentCart,
    allCarts: carts,
    clearAllCarts,
    syncWithServer,
    fetchRemoteCarts,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx)
    throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
