import { View, Text, StyleSheet, Pressable } from "react-native";
import { useCart } from "@/components/CartContext";
import { shadows } from "@/lib/shadowStyles";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function CartBar() {
  const { itemCount, totalPrice } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (itemCount === 0) return null;

  return (
    <View style={[
      styles.container,
  { bottom: Math.max(2, insets.bottom + 2) },
    ]}>
      <View>
        <Text style={styles.items}>{itemCount} món</Text>
        <Text style={styles.total}>
          {totalPrice.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Đi tới giỏ hàng"
        onPress={() => router.push("/cart" as Href)}
        style={({ pressed, hovered }) => [
          styles.buttonBase,
          hovered ? styles.buttonHover : null,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Ionicons name="cart-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
        <Text style={styles.buttonText}>Xem giỏ hàng</Text>
        <Ionicons name="chevron-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 50,
    ...shadows.large,
  },
  items: { color: "#A7F3D0", fontSize: 12, fontWeight: "700", opacity: 0.95 },
  total: { color: "#ffffff", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  buttonBase: {
    backgroundColor: "#10B981",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonHover: { backgroundColor: "#0EA371" },
  buttonPressed: { opacity: 0.9 },
  buttonText: { color: "#fff", fontWeight: "800" },
});
