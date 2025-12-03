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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@/lib/apiConfig";
import { useAuth } from "@/app/context/AuthContext";

const MOBILE_CALLBACK_URL = "http://172.20.10.3:8081/checkout/result";

export default function CartScreen() {
  const router = useRouter();
  const {
    currentCart,
    totalPrice,
    updateQuantity,
    removeItem,
    updateNote,
    clearCart,
    currentRestaurant,
  } = useCart();

  const { currentAddress, currentLocation } = useAddress();
  const { user } = useAuth();

  const [receiver, setReceiver] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatVND = (n: number) =>
    n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

  // ===================== CHECKOUT =====================
  const checkout = async () => {
    if (!receiver.trim()) return Alert.alert("Lỗi", "Vui lòng nhập tên người nhận");
    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phone.trim() || !phoneRegex.test(phone)) {
      return Alert.alert("Lỗi", "Số điện thoại phải từ 9 - 11 chữ số!");
    }
    if (!currentAddress?.trim()) {
      return Alert.alert("Lỗi", "Bạn cần chọn địa chỉ giao hàng!");
    }
    if (!currentLocation?.latitude || !currentLocation?.longitude) {
      return Alert.alert("Lỗi", "Không lấy được vị trí của bạn!");
    }
    if (!currentRestaurant) {
      return Alert.alert("Lỗi", "Không xác định được nhà hàng.");
    }

    try {
      setLoading(true);
      const orderId = Date.now().toString();

      const payload = {
        amount: totalPrice,
        orderId,
        userId: user?.id,
        customerPhone: phone.trim(),
        deliveryAddress: currentAddress,
        restaurantId: currentRestaurant,
        note: "",
        coords: {
          lat: Number(currentLocation.latitude),
          lng: Number(currentLocation.longitude),
        },
        route: [],
        items: currentCart.map((i) => ({
          price: i.price,
          quantity: i.quantity,
          notes: i.notes || "",
          dishId: i.dishId,
        })),
        callbackUrl: MOBILE_CALLBACK_URL,
        platform: Platform.OS === "web" ? "web" : "app",
      };

      await AsyncStorage.setItem("draft_order", JSON.stringify(payload));

      const res = await fetch(`${API_URL}/api/vnpay/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Bad response");
      const json = await res.json();

      // ❗ FIX: chỉ check paymentUrl nếu là WEB
      if (Platform.OS === "web" && !json.paymentUrl) {
        return Alert.alert("Lỗi", "Không thể tạo giao dịch");
      }

      // =========================== WEB ===========================
      if (Platform.OS === "web") {
        window.location.href = json.paymentUrl;
        return;
      }

      // ========================= APP MODE ========================
      clearCart();
      await AsyncStorage.removeItem("draft_order");

      router.replace(`/checkout/success?orderId=${orderId}`);
      return;

    } catch (err) {
      console.error("checkout error", err);
      Alert.alert("Lỗi", "Không thể kết nối hệ thống thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  // ===================== UI =====================
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
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
            <FlatList
              data={currentCart}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 14 }}
              renderItem={({ item }) => (
                <View style={styles.cartCard}>
                  <Image source={{ uri: item.image }} style={styles.cartImg} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={styles.cartName}>
                      {item.name}
                    </Text>
                    <Text style={styles.cartPrice}>{formatVND(item.price)}</Text>

                    <TextInput
                      placeholder="Thêm ghi chú"
                      value={item.notes || ""}
                      onChangeText={(txt) => updateNote(item.dishId, txt)}
                      style={styles.noteInput}
                    />

                    <View style={styles.qtyWrap}>
                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateQuantity(item.dishId, Math.max(item.quantity - 1, 1))
                        }
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </Pressable>

                      <Text style={styles.qtyNum}>{item.quantity}</Text>

                      <Pressable
                        style={styles.qtyBtn}
                        onPress={() =>
                          updateQuantity(item.dishId, item.quantity + 1)
                        }
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    onPress={() => removeItem(item.dishId)}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="trash" size={20} color="#ff4d4d" />
                  </Pressable>
                </View>
              )}
            />

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

          

            <View style={styles.footer}>
              <Text style={styles.total}>Tổng: {formatVND(totalPrice)}</Text>

              <Pressable
                style={styles.btn}
                onPress={checkout}
                disabled={loading}
              >
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

      <DeliverTo
        visible={showDeliveryModal}
        onClose={() => setShowDeliveryModal(false)}
        showTriggerButton={false}
      />
    </SafeAreaView>
  );
}

// ===================== STYLES =====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    width: Platform.OS === "web" ? "70%" : "100%",
    maxWidth: Platform.OS === "web" ? 800 : "100%",
    alignSelf: Platform.OS === "web" ? "center" : "flex-start",
    paddingTop: Platform.OS === "ios" ? 16 : 0,
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
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 1px 4px rgba(0,0,0,0.05)" }
      : {
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }),
    gap: 14,
  },
  cartImg: { width: 80, height: 80, borderRadius: 12 },
  cartName: { fontSize: 16, fontWeight: "700" },
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
  qtyBtn: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9,
    backgroundColor: "#FFF1ED",
  },
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
  addressText: { flex: 1, fontSize: 14 },
  changeBtn: { color: "#FF6B35", fontWeight: "700" },

  cancelBtn: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#666" },

  footer: { marginTop: 10 },
  total: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  btn: {
    backgroundColor: "#FF6B35",
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
  },
  btnText: { fontSize: 16, fontWeight: "800", color: "#fff" },
});
