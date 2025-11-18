import { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCart } from "@/app/context/CartContext";
import { shadows } from "@/lib/shadowStyles";

export default function CartButton() {
  const { items, itemCount, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const [visible, setVisible] = useState(false);

  if (itemCount === 0) return null;

  return (
    <>
      <Pressable style={styles.floating} onPress={() => setVisible(true)}>
        <View style={{ position: "relative" }}>
          <Ionicons name="cart" size={24} color="#fff" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{itemCount}</Text>
          </View>
        </View>
      </Pressable>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Giỏ hàng ({itemCount})</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Ionicons name="close" size={26} color="#111827" />
              </Pressable>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              {items.map((it) => (
                <View key={it.id} style={styles.item}>
                  <Image source={{ uri: it.image || "https://via.placeholder.com/80" }} style={styles.image} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                    <Text style={styles.itemPrice}>${it.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(it.restaurantId, it.dishId, it.quantity - 1)}>
                      <Ionicons name="remove" size={16} color="#FF6B35" />
                    </Pressable>
                    <Text style={styles.qtyText}>{it.quantity}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => updateQuantity(it.restaurantId, it.dishId, it.quantity + 1)}>
                      <Ionicons name="add" size={16} color="#FF6B35" />
                    </Pressable>
                  </View>
                  <Pressable style={{ padding: 8 }} onPress={() => removeItem(it.restaurantId, it.dishId)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tổng cộng</Text>
                <Text style={styles.totalValue}>${totalPrice.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Pressable style={[styles.btn, styles.clear]} onPress={clearCart}>
                  <Text style={styles.clearText}>Xóa hết</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.checkout]} onPress={() => { setVisible(false); alert("Checkout coming soon"); }}>
                  <Text style={styles.checkoutText}>Thanh toán</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF6B35",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    ...shadows.large,
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%", paddingTop: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginTop: 12, gap: 12 },
  image: { width: 60, height: 60, borderRadius: 8 },
  itemName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  itemPrice: { marginTop: 4, fontSize: 14, color: "#FF6B35", fontWeight: "600" },
  qtyBox: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 8, paddingHorizontal: 4, gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 6, backgroundColor: "#FFF1ED", justifyContent: "center", alignItems: "center" },
  qtyText: { minWidth: 20, textAlign: "center", fontSize: 16, fontWeight: "600", color: "#111827" },
  footer: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  totalValue: { fontSize: 22, fontWeight: "700", color: "#FF6B35" },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  clear: { backgroundColor: "#F3F4F6" },
  clearText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  checkout: { backgroundColor: "#FF6B35", ...shadows.medium },
  checkoutText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
