import { View, Text, Button } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { createVnpPayment } from "../../lib/payment";

export default function PaymentTest() {
  const handlePay = async () => {
    try {
      const data = await createVnpPayment(10000); // 10k test
      await WebBrowser.openBrowserAsync(data.paymentUrl);
    } catch (e) {
      console.log("Error:", e);
    }
  };

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>Test Thanh Toán VNPAY</Text>
      <Button title="Thanh toán 10,000đ" onPress={handlePay} />
    </View>
  );
}
