import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    // 🧩 Kiểm tra phản hồi từ VNPAY (VD: ?vnp_ResponseCode=00)
    if (params?.vnp_ResponseCode) {
      if (params.vnp_ResponseCode === "00") {
        setStatus("success");
      } else {
        setStatus("failed");
      }
    } else {
      // Nếu không có query, mặc định hiển thị success cho các đơn nội bộ (COD,...)
      setStatus("success");
    }
  }, [params]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text>Đang xử lý thanh toán...</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 24,
      }}
    >
      {status === "success" ? (
        <>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#16a34a", marginBottom: 10 }}>
            🎉 Đặt hàng thành công!
          </Text>
          <Text style={{ color: "#4B5563", textAlign: "center", marginBottom: 20 }}>
            Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.
          </Text>
        </>
      ) : (
        <>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#ef4444", marginBottom: 10 }}>
            ❌ Thanh toán thất bại!
          </Text>
          <Text style={{ color: "#4B5563", textAlign: "center", marginBottom: 20 }}>
            Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.
          </Text>
        </>
      )}

      <Pressable
        onPress={() => router.replace("./(tabs) ")}
        style={{
          backgroundColor: status === "success" ? "#FF6B35" : "#9CA3AF",
          paddingVertical: 12,
          paddingHorizontal: 28,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>Về trang chủ</Text>
      </Pressable>
    </View>
  );
}
