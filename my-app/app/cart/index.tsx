import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCart } from "@/app/context/CartContext";
import { useAddress } from "@/app/context/AddressContext";
import DeliverTo from "@/components/DeliverTo";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "@/lib/apiConfig";
import { useAuth } from "@/app/context/AuthContext";

export default function CartScreen() {
  const router = useRouter();
  const { currentCart, totalPrice, updateQuantity, removeItem, updateNote, clearCart, currentRestaurant, currentRestaurantName } = useCart();
  const { currentAddress, currentLocation } = useAddress();
  const { user } = useAuth();

  const [receiver, setReceiver] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatVND = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  // ===================== CHECKOUT HANDLER =====================
  const checkout = async () => {
    if (!receiver.trim()) return Alert.alert("Lỗi", "Vui lòng nhập tên người nhận");
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phone.trim() || !phoneRegex.test(phone)) {
      return Alert.alert("Lỗi", "Số điện thoại phải từ 9 - 11 chữ số!");
    }
    if (!currentAddress?.trim()) return Alert.alert("Lỗi", "Bạn cần chọn địa chỉ giao hàng!");

    const lat = currentLocation?.latitude ?? "";
    const lng = currentLocation?.longitude ?? "";

    try {
      setLoading(true);

      const payload = {
        amount: totalPrice,
        orderId: Date.now().toString(),
        userId: user?.id,
        customerName: receiver.trim(),
        customerPhone: phone.trim(),
        deliveryAddress: currentAddress,
        restaurantId: currentRestaurant,
        restaurantName: currentRestaurantName || "Nhà hàng",
        coords: { lat, lng },
        items: currentCart,
      };

      const res = await fetch(`${API_URL}/api/vnpay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.paymentUrl) return Alert.alert("Lỗi", "Không thể tạo giao dịch");

      // ============ WEB MODE ============
      if (Platform.OS === "web") {
        window.location.href = json.paymentUrl;
      }
      // ============ MOBILE MODE ============
      else {
        const result = await WebBrowser.openAuthSessionAsync(
          json.paymentUrl,
          "myapp://checkout/success"
        );

        if (result.type === "success" && result.url.includes("vnp_ResponseCode=00")) {
          clearCart();
          router.replace(`/checkout/success?lat=${lat}&lng=${lng}`);
        }
      }
    } catch (err) {
      Alert.alert("Lỗi", "Không thể kết nối hệ thống thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  // ===================== UI =====================
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/(tabs)")}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </Pressable>
          <Text style={styles.h1}>Giỏ hàng</Text>
          <View style={{ width: 24 }} />
        </View>

        {currentCart?.length === 0 ? (
          <Text style={styles.empty}>Giỏ hàng trống</Text>
        ) : (
          <>
            {/* Cart Items */}
            <FlatList
              data={currentCart}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 14 }}
              renderItem={({ item }) => (
                <View style={styles.cartCard}>
                  <Image source={{ uri: item.image }} style={styles.cartImg} />

                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.cartName}>{item.name}</Text>

                    <Text style={styles.cartPrice}>{formatVND(item.price)}</Text>

                    {/* Notes */}
                    <TextInput
                      placeholder="Thêm ghi chú (Không cay, ít đá...)"
                      value={item.notes || ""}
                      onChangeText={(txt) => updateNote(item.dishId, txt)}
                      style={styles.noteInput}
                      placeholderTextColor="#999"
                    />

                    {/* Quantity */}
                    <View style={styles.qtyWrap}>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.dishId, Math.max(item.quantity - 1, 1))}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyNum}>{item.quantity}</Text>

                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.dishId, item.quantity + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Remove */}
                  <Pressable onPress={() => removeItem(item.dishId)} style={styles.removeBtn}>
                    <Ionicons name="trash" size={20} color="#ff4d4d" />
                  </Pressable>
                </View>
              )}
            />

            {/* Delivery Info */}
            <Text style={styles.label}>Thông tin giao hàng</Text>

            <TextInput
              style={styles.input}
              placeholder="Tên người nhận"
              value={receiver}
              onChangeText={setReceiver}
            />

            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              keyboardType="number-pad"
              value={phone}
              maxLength={11}
              onChangeText={setPhone}
            />

            <View style={styles.addressBox}>
              <Text style={styles.addressText}>
                {currentAddress || "Chưa chọn địa chỉ"}
              </Text>
              <Pressable onPress={() => setShowDeliveryModal(true)}>
                <Text style={styles.changeBtn}>Thay đổi</Text>
              </Pressable>
            </View>

            {/* Total & Order */}
            <View style={styles.footer}>
              <Text style={styles.total}>Tổng: {formatVND(totalPrice)}</Text>

              <Pressable style={styles.btn} onPress={checkout} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Thanh toán ngay</Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Address Modal */}
      <DeliverTo
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        showTriggerButton={false}
      />
    </SafeAreaView>
  );
}

/* ===================== STYLES ===================== */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  container: {
    flex: 1,
    paddingHorizontal: 16,
    width: Platform.OS === "web" ? "70%" : "100%",
    maxWidth: Platform.OS === "web" ? 800 : "100%",
    alignSelf: Platform.OS === "web" ? "center" : "flex-start",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },

  h1: { fontSize: 24, fontWeight: "900", color: "#FF6B35" },
  empty: { textAlign: "center", marginTop: 50, fontSize: 16, color: "#777" },

  cartCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    gap: 14,
  },

  cartImg: { width: 80, height: 80, borderRadius: 12, backgroundColor: "#f3f3f3" },
  cartName: { fontSize: 16, fontWeight: "700", color: "#222" },
  cartPrice: { fontSize: 15, fontWeight: "600", color: "#FF6B35", marginTop: 3 },

  noteInput: {
    fontSize: 13,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#fafafa",
  },

  qtyWrap: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 10 },
  qtyBtn: { width: 34, height: 34, justifyContent: "center", alignItems: "center", borderRadius: 9, backgroundColor: "#FFF1ED" },
  qtyBtnText: { fontSize: 20, fontWeight: "900", color: "#FF6B35" },
  qtyNum: { fontSize: 16, fontWeight: "700", width: 26, textAlign: "center" },
  removeBtn: { padding: 5 },

  label: { fontSize: 15, fontWeight: "700", marginTop: 10, marginBottom: 6 },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
    width: "100%",
  },

  addressBox: {
    borderWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#FAFAFA",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  addressText: { flex: 1, fontSize: 14, color: "#222" },
  changeBtn: { color: "#FF6B35", fontWeight: "700", marginLeft: 8 },

  footer: { marginTop: 10 },
  total: { fontSize: 18, fontWeight: "800", marginBottom: 12 },

  btn: { backgroundColor: "#FF6B35", paddingVertical: 14, alignItems: "center", borderRadius: 12 },
  btnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
