import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useCart } from "@/components/CartContext";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "@/lib/apiConfig";
import { Platform } from "react-native";
import { useAuth } from "../context/AuthContext";

const formatVND = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function PaymentScreen() {
  const router = useRouter();
  const { totalPrice, clearCart, currentRestaurant, items: cartItems } = useCart();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  console.log("🧭 user from AuthContext:", user);
console.log("📦 cart items:", cartItems);
console.log("🏪 restaurant:", currentRestaurant);

  const handleConfirm = async () => {
  try {
    setLoading(true);

    const res = await fetch(`${API_URL}/api/vnpay/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: totalPrice,
        orderId: Date.now().toString(),
        userId: user?.id, // 👈 thêm ID người dùng từ AuthContext
        restaurantId: currentRestaurant, // 👈 ID nhà hàng hiện tại
        items: cartItems, // 👈 danh sách món ăn từ giỏ hàng
      }),
    });

    const json = await res.json();
    console.log("VNPAY data:", json);

    if (!json.paymentUrl) {
      Alert.alert("Lỗi", json.error?.message || "Không thể tạo liên kết VNPAY.");
      return;
    }

    // ✅ Mở trang thanh toán
    if (Platform.OS === "web") {
      window.location.href = json.paymentUrl;
    } else {
      const result = await WebBrowser.openAuthSessionAsync(
        json.paymentUrl,
        "http://localhost:8081/checkout/success"
      );

      if (
        result.type === "success" &&
        result.url.includes("vnp_ResponseCode=00")
      ) {
        clearCart();
        router.replace("/checkout/success");
      }
    }
  } catch (err) {
    console.error("Lỗi VNPAY:", err);
    Alert.alert("Lỗi", "Không thể kết nối đến VNPAY.");
  } finally {
    setLoading(false);
  }
};



  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thanh toán qua VNPAY</Text>

      <Text style={styles.total}>
        Tổng thanh toán: {formatVND(totalPrice)}
      </Text>

      <Pressable style={styles.btn} onPress={handleConfirm} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Thanh toán ngay</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  total: { textAlign: "right", fontSize: 16, fontWeight: "800", marginTop: 20 },
  btn: {
    backgroundColor: "#FF6B35",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
  },
  btnText: { color: "#fff", fontWeight: "800" },
});
