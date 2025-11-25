// app/drone-test/[orderId].tsx

import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import DroneViewer from "../../components/map/drone-test";
import { ActivityIndicator, View } from "react-native";

export default function DronePage() {
  const { orderId } = useLocalSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(
          `${process.env.EXPO_PUBLIC_STRAPI_URL}/api/orders/by-order-id/${orderId}`
        );
        const json = await res.json();
        setOrder(json.data);
      } catch (e) {
        console.log("❌ Failed to fetch order", e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <DroneViewer orderId={orderId as string} order={order} />;
}
