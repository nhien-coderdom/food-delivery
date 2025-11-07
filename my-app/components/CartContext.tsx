import { createContext, useContext, useMemo, useState, ReactNode, useEffect, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  id: string; // unique cart line id
  dishId: number; // id of the dish
  name: string;
  price: number; // unit price
  quantity: number;
  restaurantId: number;
  restaurantName: string;
  image?: string;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  groups: Array<{ restaurantId: number; restaurantName: string; items: CartItem[]; itemCount: number; subtotal: number }>;
  addItem: (item: Omit<CartItem, "quantity" | "id">) => void;
  removeItem: (restaurantId: number, dishId: number) => void;
  updateQuantity: (restaurantId: number, dishId: number, quantity: number) => void;
  clearCart: () => void;
  clearRestaurant: (restaurantId: number) => void;
  getItemQuantity: (restaurantId: number, dishId: number) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = "@foodapp/cart-items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  // Restore persisted cart once on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch (err) {
        console.warn("Failed to load cart from storage", err);
      } finally {
        hydrated.current = true;
      }
    })();
  }, []);

  // Persist cart whenever it changes after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((err) => {
      console.warn("Failed to persist cart", err);
    });
  }, [items]);

  const itemCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, it) => sum + it.price * it.quantity, 0), [items]);
  const groups = useMemo(() => {
    const map = new Map<number, { restaurantId: number; restaurantName: string; items: CartItem[] }>();
    for (const it of items) {
      const g = map.get(it.restaurantId) || { restaurantId: it.restaurantId, restaurantName: it.restaurantName, items: [] };
      g.items.push(it);
      map.set(it.restaurantId, g);
    }
    return Array.from(map.values()).map((g) => ({
      ...g,
      itemCount: g.items.reduce((s, i) => s + i.quantity, 0),
      subtotal: g.items.reduce((s, i) => s + i.quantity * i.price, 0),
    }));
  }, [items]);

  const addItem: CartContextType["addItem"] = (newItem) => {
    setItems((prev) => {
      const exists = prev.find((it) => it.dishId === newItem.dishId && it.restaurantId === newItem.restaurantId);
      if (exists) {
        return prev.map((it) =>
          it.dishId === newItem.dishId && it.restaurantId === newItem.restaurantId
            ? { ...it, quantity: it.quantity + 1 }
            : it
        );
      }
      const line: CartItem = { id: `${newItem.restaurantId}-${newItem.dishId}-${Date.now()}`, quantity: 1, ...newItem };
      return [...prev, line];
    });
  };

  const removeItem: CartContextType["removeItem"] = (restaurantId, dishId) => {
    setItems((prev) => prev.filter((it) => !(it.restaurantId === restaurantId && it.dishId === dishId)));
  };

  const updateQuantity: CartContextType["updateQuantity"] = (restaurantId, dishId, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((it) => !(it.restaurantId === restaurantId && it.dishId === dishId))
        : prev.map((it) => (it.restaurantId === restaurantId && it.dishId === dishId ? { ...it, quantity } : it))
    );
  };

  const clearCart = () => setItems([]);
  const clearRestaurant: CartContextType["clearRestaurant"] = (restaurantId) => {
    setItems((prev) => prev.filter((it) => it.restaurantId !== restaurantId));
  };

  const getItemQuantity = (restaurantId: number, dishId: number) =>
    items.find((it) => it.restaurantId === restaurantId && it.dishId === dishId)?.quantity ?? 0;

  const value: CartContextType = {
    items,
    itemCount,
    totalPrice,
    groups,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    clearRestaurant,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
