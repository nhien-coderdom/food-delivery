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
import Platform from "react-native";

const formatVND = (n: number) =>
  n.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function PaymentScreen() {
  const router = useRouter();
  const { totalPrice, clearCart, currentRestaurant } = useCart();
  const [method, setMethod] = useState<"cash" | "vnpay" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
  if (!method) return Alert.alert("Vui lòng chọn phương thức thanh toán!");

  if (method === "cash") {
    Alert.alert(
      "Đặt hàng thành công",
      "Đơn hàng của bạn sẽ được thanh toán khi nhận hàng.",
      [
        {
          text: "OK",
          onPress: () => {
            clearCart();
            router.replace("/checkout/success");
          },
        },
      ]
    );
    return;
  }

  // VNPAY
  try {
    setLoading(true);
    const res = await fetch(`${API_URL}/api/vnpay/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: totalPrice,
        orderId: Date.now().toString(),
      }),
    });

    const json = await res.json();
    console.log("VNPAY data:", json);

    if (!json.paymentUrl) {
      Alert.alert("Lỗi", "Không thể tạo liên kết thanh toán VNPAY.");
      return;
    }

    // ✅ Web → dùng window.location.href để giữ nguyên tab
    if (Platform.OS === "web") {
      window.location.href = json.paymentUrl;
    } else {
      // ✅ App mobile → dùng AuthSession để redirect quay lại app
      const result = await WebBrowser.openAuthSessionAsync(
        json.paymentUrl,
        "http://localhost:8081/checkout/success"
      );

      if (result.type === "success" && result.url.includes("vnp_ResponseCode=00")) {
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
      <Text style={styles.title}>Chọn phương thức thanh toán</Text>

      <Pressable
        style={[styles.option, method === "cash" && styles.optionActive]}
        onPress={() => setMethod("cash")}
      >
        <Text style={styles.optionText}>💵 Thanh toán khi nhận hàng</Text>
      </Pressable>

      <Pressable
        style={[styles.option, method === "vnpay" && styles.optionActive]}
        onPress={() => setMethod("vnpay")}
      >
        <Text style={styles.optionText}>💳 Thanh toán qua VNPAY</Text>
      </Pressable>

      <Text style={styles.total}>
        Tổng thanh toán: {formatVND(totalPrice)}
      </Text>

      <Pressable style={styles.btn} onPress={handleConfirm} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Xác nhận thanh toán</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 20 },
  option: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  optionActive: {
    backgroundColor: "#FFEDD5",
    borderColor: "#FF6B35",
  },
  optionText: { fontSize: 16 },
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
