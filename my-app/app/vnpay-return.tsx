import { useLocalSearchParams } from "expo-router";
import { View, Text } from "react-native";

export default function VnpayReturn() {
  const params = useLocalSearchParams();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Kết quả thanh toán</Text>
      <Text>{params.vnp_ResponseCode === "00" ? "✅ Thành công" : "❌ Thất bại"}</Text>
      <Text style={{ marginTop: 10 }}>{JSON.stringify(params, null, 2)}</Text>
    </View>
  );
}
