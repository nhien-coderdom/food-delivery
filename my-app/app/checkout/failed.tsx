import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";

export default function SuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    if (params?.vnp_ResponseCode) {
      if (params.vnp_ResponseCode === "00") setStatus("success");
      else setStatus("failed");
    } else {
      setStatus("success");
    }
  }, [params]);

  if (status === "loading") {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text>Đang xử lý thanh toán...</Text>
      </View>
    );
  }

  const handleTrackOrder = () => {
    router.replace({
      pathname: "./drone-tracking/[orderId]",
      params: { orderId: params.vnp_TxnRef },
    });
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-6">

      {/* SUCCESS UI */}
      {status === "success" ? (
        <>
          <Text className="text-5xl mb-3">🎉</Text>
          <Text className="text-2xl font-bold text-green-600 mb-2">
            Đặt hàng thành công!
          </Text>

          <Text className="text-gray-600 text-center mb-6">
            Cửa hàng đang nhận đơn. Bạn có thể theo dõi quá trình drone giao hàng.
          </Text>

          <Pressable
            onPress={handleTrackOrder}
            className="bg-orange-500 py-3 px-6 rounded-lg w-full"
          >
            <Text className="text-white font-bold text-center">
              Theo dõi đơn hàng
            </Text>
          </Pressable>
        </>

      ) : (
        /* FAILED UI */
        <>
          <Text className="text-5xl mb-3">⚠️</Text>

          <Text className="text-2xl font-bold text-red-600 mb-2">
            Thanh toán thất bại
          </Text>

          <Text className="text-gray-600 text-center mb-6 px-4">
            Rất tiếc, giao dịch không thành công. Vui lòng kiểm tra lại phương thức thanh toán hoặc thử lại sau vài phút.
          </Text>

          <Pressable
            onPress={() => router.replace("/")}
            className="bg-red-500 py-3 px-8 rounded-lg w-full mb-3"
          >
            <Text className="text-white font-bold text-center">
              Thử lại giao dịch
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.replace("/")}
            className="border border-gray-400 py-3 px-8 rounded-lg w-full"
          >
            <Text className="text-gray-700 font-bold text-center">
              Về trang chủ
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
