import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { API_URL, getImageUrl } from "@/lib/apiConfig";
import { useCart } from "@/app/context/CartContext";
import CartBar from "@/components/CartBar";
import { shadows } from "@/lib/shadowStyles";
import { useRouter, type Href } from "expo-router";

// Format tiền VND
const formatVND = (num: number) =>
  num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function RestaurantDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, getItemQuantity, updateQuantity } = useCart();

  useEffect(() => {
    if (!id) return;

    async function fetchRestaurant() {
      try {
        const res = await fetch(
          `${API_URL}/api/restaurants?filters[documentId][$eq]=${id}&populate[image]=true&populate[dishes][populate][image]=true`
        );
        const json = await res.json();
        console.log("Fetched restaurant:", JSON.stringify(json, null, 2));
        setRestaurant(json.data?.[0]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRestaurant();
  }, [id]);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
      </View>
    );

  if (!restaurant)
    return (
      <View style={styles.center}>
        <Text>Restaurant not found.</Text>
      </View>
    );

  const dishes = restaurant.dishes || [];

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Back to Home */}
      <View style={{ padding: 12 }}>
        <Pressable onPress={() => router.replace("/(tabs)" as Href)} style={styles.backBtn}>
          <Text style={styles.backText}>{"«"}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{restaurant.name}</Text>
        <Text style={styles.description}>{restaurant.description}</Text>

        {dishes.length === 0 ? (
          <Text style={styles.noDish}>No dishes found.</Text>
        ) : (
          <View style={styles.dishList}>
            {dishes.map((dish: any) => {
              const imgUrl = getImageUrl(dish.image?.url);
              const qty = getItemQuantity(restaurant.id, dish.id);
              return (
                <View key={dish.id} style={styles.card}>
                  <Image 
                    source={{ uri: imgUrl }} 
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <View style={styles.info}>
                    <Text style={styles.dishName}>{dish.name}</Text>
                    {dish.price && (
                      <Text style={styles.dishPrice}>{formatVND(dish.price)}</Text>
                    )}
                    {qty === 0 ? (
                      <Pressable
                        onPress={() =>
                          addItem({
                            dishId: dish.id,
                            name: dish.name,
                            price: dish.price ?? 0,
                            restaurantId: restaurant.id,
                            restaurantName: restaurant.name,
                            image: imgUrl,
                          })
                        }
                        style={styles.addButton}
                      >
                        <Text style={styles.addButtonText}>Thêm</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.stepper}>
                        <Pressable style={styles.stepBtn} onPress={() => updateQuantity(restaurant.id, dish.id, qty - 1)}>
                          <Text style={styles.stepText}>–</Text>
                        </Pressable>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <Pressable style={styles.stepBtn} onPress={() => updateQuantity(restaurant.id, dish.id, qty + 1)}>
                          <Text style={styles.stepText}>+</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
  <CartBar />
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 24, fontWeight: "800", color: "#111827" },
  container: {
    paddingBottom: 40,
    backgroundColor: "#fff",
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#16a34a",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },
  noDish: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 16,
  },
  dishList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
  },
  card: {
    width: 340,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    overflow: "hidden",
    ...shadows.card,
  },
  image: {
    width: "100%",
    height: 200,
  },
  info: {
    padding: 12,
  },
  dishName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  dishPrice: {
    fontSize: 16,
    color: "#16a34a",
    fontWeight: "500",
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E5F5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#10B981",
  },
  qtyText: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
});