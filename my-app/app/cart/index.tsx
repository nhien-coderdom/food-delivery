import { View, Text, StyleSheet, FlatList, Image, Pressable, useWindowDimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React from "react";
import { useCart } from "@/components/CartContext";
import { Ionicons } from "@expo/vector-icons";
import { shadows } from "@/lib/shadowStyles";
import { useRouter } from "expo-router";
// no API calls in this version; checkout is simulated

export default function CartScreen() {
  const { groups, totalPrice, updateQuantity, removeItem, clearCart, clearRestaurant } = useCart();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const formatVND = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  const checkoutGroup = (restaurantId: number, restaurantName: string) => {
    if (!restaurantId) return;
    Alert.alert(
      "Xác nhận",
      `Ứng dụng sẽ tạo 1 đơn riêng cho “${restaurantName}”. Bạn muốn tiếp tục?`,
      [
        { text: "Hủy" },
        {
          text: "Đặt nhóm này",
          onPress: () => clearRestaurant(restaurantId),
        },
      ]
    );
  };

  const checkoutAll = () => {
    if (groups.length === 0) return;
    const restaurantNames = groups
      .map((g) => `• ${g.restaurantName} (${g.itemCount} món)`) 
      .join("\n");
    Alert.alert(
      "Đặt tất cả",
      `Mỗi nhà hàng sẽ thành 1 đơn riêng:\n\n${restaurantNames}\n\nTổng: ${formatVND(totalPrice)}`,
      [
        { text: "Hủy" },
        {
          text: "Đặt tất cả",
          onPress: () => {
            clearCart();
            router.replace("/(tabs)");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/(tabs)")}> 
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </Pressable>
  <Text style={styles.title}>Giỏ hàng</Text>
        <View style={{ width: 22 }} />
      </View>
      {groups.length === 0 ? (
        <Text style={styles.empty}>Giỏ hàng trống</Text>
      ) : (
        <View style={[styles.main, isWide && styles.mainWide]}>
          <View style={[styles.listColumn, isWide && styles.listColumnWide]}>
            <FlatList
              data={groups}
              keyExtractor={(g) => String(g.restaurantId)}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item: group }) => (
                <View style={[styles.group, isWide && styles.groupWide]}>
                  <View style={styles.groupHeader}>
                    <Text style={[styles.groupTitle, isWide && styles.groupTitleWide]}>{group.restaurantName}</Text>
                    <Pressable onPress={() => clearRestaurant(group.restaurantId)}>
                      <Text style={styles.groupClear}>Xóa nhóm</Text>
                    </Pressable>
                  </View>
                  {group.items.map((it) => (
                    <View key={it.id} style={[styles.card, isWide && styles.cardWide]}>
                      <Image source={{ uri: it.image || "https://via.placeholder.com/80" }} style={[styles.image, isWide && styles.imageWide]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.name, isWide && styles.nameWide]} numberOfLines={2}>{it.name}</Text>
                        <Text style={[styles.price, isWide && styles.priceWide]}>{formatVND(it.price)}</Text>
                        <View style={styles.row}>
                          <Pressable style={styles.stepBtn} onPress={() => updateQuantity(it.restaurantId, it.dishId, it.quantity - 1)}>
                            <Text style={styles.stepText}>–</Text>
                          </Pressable>
                          <Text style={styles.qty}>{it.quantity}</Text>
                          <Pressable style={styles.stepBtn} onPress={() => updateQuantity(it.restaurantId, it.dishId, it.quantity + 1)}>
                            <Text style={styles.stepText}>+</Text>
                          </Pressable>
                        </View>
                      </View>
                      <Pressable style={{ padding: 8 }} onPress={() => removeItem(it.restaurantId, it.dishId)}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.groupFooter}>
                    <Text style={styles.groupSubtotal}>Tạm tính: {formatVND(group.subtotal)}</Text>
                    <Pressable style={styles.checkoutBtnSm} onPress={() => checkoutGroup(group.restaurantId, group.restaurantName)}>
                      <Text style={styles.checkoutText}>Đặt hàng ({group.itemCount})</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>

          {isWide && (
            <View style={styles.summaryColumn}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Tổng cộng</Text>
                <Text style={styles.summaryTotal}>{formatVND(totalPrice)}</Text>
                <Pressable style={[styles.btn, styles.clear]} onPress={clearCart}>
                  <Text style={styles.clearText}>Xóa toàn bộ giỏ</Text>
                </Pressable>
                <Pressable style={[styles.btn, styles.checkout, { marginTop: 10 }]} onPress={checkoutAll}> 
                  <Text style={styles.checkoutText}>Thanh toán</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      {!isWide && (
        <View style={styles.footer}>
          <Text style={styles.total}>Tổng tất cả: {formatVND(totalPrice)}</Text>
          <Pressable style={[styles.btn, styles.clear]} onPress={clearCart}>
            <Text style={styles.clearText}>Xóa toàn bộ giỏ</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.checkout]} onPress={checkoutAll}>
            <Text style={styles.checkoutText}>Thanh toán</Text>
          </Pressable>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  backBtn: { padding: 6, borderRadius: 8, backgroundColor: "#F3F4F6" },
  title: { fontSize: 26, fontWeight: "900", color: "#EA580C" },
  empty: { textAlign: "center", color: "#6B7280", marginTop: 40 },
  main: { width: "100%", alignSelf: "center", maxWidth: 1000 },
  mainWide: { flexDirection: "row", gap: 20 },
  listColumn: { flex: 1 },
  listColumnWide: { flex: 2 },
  summaryColumn: { flex: 1 },
  summaryCard: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, ...shadows.button, position: "sticky" as any, top: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 8 },
  summaryTotal: { fontSize: 24, fontWeight: "900", color: "#111827", marginBottom: 12 },
  group: { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 16, ...shadows.button },
  groupWide: { padding: 16 },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  groupTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  groupTitleWide: { fontSize: 18 },
  groupClear: { color: "#EF4444", fontWeight: "700" },
  card: { flexDirection: "row", gap: 12, backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 10, alignItems: "center" },
  cardWide: { padding: 14 },
  image: { width: 70, height: 70, borderRadius: 10 },
  imageWide: { width: 84, height: 84 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  nameWide: { fontSize: 16 },
  price: { fontSize: 14, color: "#FF6B35", fontWeight: "700", marginTop: 4 },
  priceWide: { fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#FFF1ED", alignItems: "center", justifyContent: "center" },
  stepText: { fontSize: 18, fontWeight: "900", color: "#FF6B35" },
  qty: { minWidth: 24, textAlign: "center", fontSize: 16, fontWeight: "700" },
  groupFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  groupSubtotal: { fontSize: 14, fontWeight: "800", color: "#111827" },
  footer: { borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 12, gap: 12 },
  total: { fontSize: 16, fontWeight: "800", color: "#111827" },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  clear: { backgroundColor: "#F3F4F6" },
  clearText: { color: "#6B7280", fontWeight: "700", textAlign: "center" },
  checkout: { backgroundColor: "#FF6B35" },
  checkoutText: { color: "#fff", fontWeight: "800" },
  checkoutBtnSm: { backgroundColor: "#FF6B35", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12, alignSelf: "flex-end" },
});
