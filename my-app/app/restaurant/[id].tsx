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

const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

// Hàm format tiền VND (giống formatVND)
const formatVND = (num: number) =>
  num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams(); // lấy documentId từ URL
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetchRestaurant() {
      try {
        const res = await fetch(
          `${API_URL}/api/restaurants?filters[documentId][$eq]=${id}&populate=dishes.image`
        );
        const json = await res.json();
        const data = json.data?.[0]; // lấy restaurant đầu tiên
        setRestaurant(data);
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
        <ActivityIndicator size="large" />
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{restaurant.name}</Text>

      {dishes.length === 0 ? (
        <Text style={styles.noDish}>No dishes found.</Text>
      ) : (
        <View style={styles.dishList}>
          {dishes.map((dish: any) => {
            const imgUrl = dish.image?.url
              ? `${API_URL}${dish.image.url}`
              : "https://via.placeholder.com/400x300?text=No+Image";
            return (
              <View key={dish.id} style={styles.card}>
                <Image source={{ uri: imgUrl }} style={styles.image} />
                <View style={styles.info}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  {dish.price && (
                    <Text style={styles.price}>{formatVND(dish.price)}</Text>
                  )}
                  {dish.description && (
                    <Text style={styles.desc}>{dish.description}</Text>
                  )}
                  <Pressable
                    onPress={() => alert(`Added ${dish.name} to cart`)}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>+ Add to Cart</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 20,
  },
  noDish: {
    textAlign: "center",
    color: "#6b7280",
  },
  dishList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  card: {
    width: 340,
    backgroundColor: "#f3f4f6",
    borderRadius: 16,
    margin: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 180,
  },
  info: {
    padding: 16,
  },
  dishName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  price: {
    color: "#16a34a",
    fontWeight: "600",
    marginVertical: 4,
  },
  desc: {
    color: "#4b5563",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
