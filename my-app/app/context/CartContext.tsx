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
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string;
  dishId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  restaurantId: number;
  restaurantName: string;
  notes?: string;
}

export interface CartContextType {
  currentRestaurant: number | null;
  currentRestaurantName: string | null;

  selectRestaurant: (id: number, name: string) => void;

  items: CartItem[];
  itemCount: number;
  totalPrice: number;

  addItem: (item: Omit<CartItem, "id" | "quantity">) => void;
  removeItem: (dishId: number) => void;
  updateQuantity: (dishId: number, quantity: number) => void;
  updateNote: (dishId: number, notes: string) => void;

  clearCart: () => void;
  clearCartByRestaurant: (restaurantId: number) => void;
  clearAllCarts: () => void;
  getItemQuantity: (dishId: number) => number;

  currentCart: CartItem[];
  allCarts: Record<number, CartItem[]>;

  syncWithServer: () => Promise<void>;
  fetchRemoteCarts: () => Promise<void>;
}

const STORAGE_KEY = "@foodapp/carts";
const CartContext = createContext<CartContextType | undefined>(undefined);

// =============================================
// PROVIDER
// =============================================
export function CartProvider({ children }: { children: ReactNode }) {
  const { user, jwt } = useAuth();
  const [carts, setCarts] = useState<Record<number, CartItem[]>>({});
  const [currentRestaurant, setCurrentRestaurant] = useState<number | null>(null);
  const [currentRestaurantName, setCurrentRestaurantName] = useState<string | null>(null);

  const hydrated = useRef(false);

  // Load carts
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && mounted) setCarts(parsed);
        }
      } catch (e) {
        console.warn("Failed loading carts", e);
      } finally {
        if (mounted) hydrated.current = true;
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Persist local
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(carts)).catch((e) =>
      console.warn("Save failed", e)
    );
  }, [carts]);

  const selectRestaurant = (id: number, name: string) => {
    setCurrentRestaurant(id);
    setCurrentRestaurantName(name);
  };

  const currentCart = useMemo(() => {
    if (currentRestaurant == null) return [];
    return carts[currentRestaurant] || [];
  }, [currentRestaurant, carts]);

  const itemCount = currentCart.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = currentCart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // ADD ITEM
  const addItem: CartContextType["addItem"] = (item) => {
    const restId = item.restaurantId;

    if (currentRestaurant == null || currentRestaurant !== restId) {
      selectRestaurant(restId, item.restaurantName);
    }

    setCarts((prev) => {
      const cart = prev[restId] || [];
      const existing = cart.find((i) => i.dishId === item.dishId);

      const newCart = existing
        ? cart.map((i) =>
            i.dishId === item.dishId ? { ...i, quantity: i.quantity + 1 } : i
          )
        : [
            ...cart,
            {
              ...item,
              id: `${restId}-${item.dishId}-${Date.now()}`,
              quantity: 1,
              image: item.image || "",
              notes: "",
            },
          ];

      return { ...prev, [restId]: newCart };
    });
  };

  // REMOVE ITEM
  const removeItem = (dishId: number) => {
    if (currentRestaurant == null) return;
    setCarts((prev) => ({
      ...prev,
      [currentRestaurant]: prev[currentRestaurant].filter((i) => i.dishId !== dishId),
    }));
  };

  // UPDATE QUANTITY
  const updateQuantity = (dishId: number, quantity: number) => {
    if (currentRestaurant == null) return;
    setCarts((prev) => {
      const updatedCart =
        quantity <= 0
          ? prev[currentRestaurant].filter((i) => i.dishId !== dishId)
          : prev[currentRestaurant].map((i) =>
              i.dishId === dishId ? { ...i, quantity } : i
            );

      return { ...prev, [currentRestaurant]: updatedCart };
    });
  };

  // UPDATE NOTE
  const updateNote = (dishId: number, notes: string) => {
    if (currentRestaurant == null) return;
    setCarts((prev) => {
      const updated = prev[currentRestaurant].map((i) =>
        i.dishId === dishId ? { ...i, notes } : i
      );
      return { ...prev, [currentRestaurant]: updated };
    });
  };

  // CLEAR CART BY RESTAURANT (for checkout success/deeplink)
  const clearCartByRestaurant = (restaurantId: number) => {
    if (!restaurantId) return;

    setCarts((prev) => {
      const clone = { ...prev };
      delete clone[restaurantId];
      return clone;
    });

    if (currentRestaurant === restaurantId) {
      setCurrentRestaurant(null);
      setCurrentRestaurantName(null);
    }
  };

  // CLEAR CART
  const clearCart = () => {
    if (currentRestaurant == null) return;
    clearCartByRestaurant(currentRestaurant);
  };

  const clearAllCarts = () => setCarts({});

  const getItemQuantity = (dishId: number) =>
    currentCart.find((i) => i.dishId === dishId)?.quantity ?? 0;

  // SYNC LOCAL → SERVER
  const syncWithServer = async () => {
    if (!user || !jwt) return;
    try {
      await fetch(`${API_URL}/cart/sync`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ carts }),
      });
    } catch (e) {
      console.warn("Sync failed:", e);
    }
  };

  // FETCH SERVER → LOCAL
  const fetchRemoteCarts = async () => {
    if (!user || !jwt) return;

    try {
      const res = await fetch(`${API_URL}/cart/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });

      const data: any[] = await res.json();
      if (!Array.isArray(data)) return;

      const formatted: Record<number, CartItem[]> = {};

      data.forEach((cart: any) => {
        const restId: number = cart.restaurant?.id || cart.restaurant;
        const restName: string =
          cart.restaurant?.name || cart.restaurantName || "Unknown";

        const items: CartItem[] = (cart.items || []).map((i: any): CartItem => ({
          id: i.id || `${restId}-${i.dishId}-${Date.now()}`,
          dishId: i.dishId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image || i.dish?.image || "",
          restaurantId: restId,
          restaurantName: restName,
          notes: i.notes || "",
        }));

        formatted[restId] = items;
      });

      setCarts(formatted);
    } catch (e) {
      console.warn("Fetch error:", e);
    }
  };

  return (
    <CartContext.Provider
      value={{
        currentRestaurant,
        currentRestaurantName,
        selectRestaurant,
        items: currentCart,
        itemCount,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        updateNote,
        clearCart,
        clearCartByRestaurant,
        clearAllCarts,
        getItemQuantity,
        currentCart,
        allCarts: carts,
        syncWithServer,
        fetchRemoteCarts,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

// Default export for expo-router route handling
export default CartProvider;
