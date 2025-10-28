import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Dimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Navbar from "../../components/Navigation";

const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

// Format tiền VND
const formatVND = (num: number) =>
  num?.toLocaleString("vi-VN", { style: "currency", currency: "VND" });

export default function RestaurantDetail() {
  const { id } = useLocalSearchParams();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const screenWidth = Dimensions.get("window").width;
  const numColumns = screenWidth > 900 ? 5 : screenWidth > 600 ? 3 : 2;
  const cardWidth = (screenWidth - 32 - (numColumns - 1) * 8) / numColumns;

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
  const restaurantImg = restaurant.image?.url
    ? `${API_URL}${restaurant.image.url}`
    : "https://via.placeholder.com/400x300?text=No+Image";

  // Nếu description là object RichText (Strapi rich text)

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Navbar />
      <ScrollView contentContainerStyle={styles.container}>
        {/* 🏙 Ảnh nhà hàng */}
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: restaurantImg }}
            style={styles.restaurantImage}
            resizeMode="contain"
          />
        </View>

        {/* 🏠 Thông tin nhà hàng */}
        <View style={styles.headerContent}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.desc}>{restaurant.description || "No description available"}</Text>

          {/* ⭐ Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="star" color="#facc15" size={18} />
              <Text style={styles.infoText}>4.7</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="bicycle" color="#16a34a" size={18} />
              <Text style={styles.infoText}>Free</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" color="#ef4444" size={18} />
              <Text style={styles.infoText}>20 min</Text>
            </View>
          </View>

          {/* 🍔 Category chips (demo) */}
          <View style={styles.chipsRow}>
            {["Burger", "Sandwich", "Pizza", "Pasta"].map((c, i) => (
              <View key={i} style={[styles.chip, i === 0 && styles.activeChip]}>
                <Text
                  style={[
                    styles.chipText,
                    i === 0 && styles.activeChipText,
                  ]}
                >
                  {c}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 🍽 Danh sách món ăn */}
        <Text style={styles.sectionTitle}>
          {`Menu (${dishes.length})`}
        </Text>

        <View style={styles.dishGrid}>
          {dishes.length > 0 ? (
            dishes.map((dish: any) => {
              const imgUrl = dish.image?.url
                ? `${API_URL}${dish.image.url}`
                : "https://via.placeholder.com/200x150?text=No+Image";
              return (
                <View key={dish.id} style={[styles.dishCard, { width: cardWidth }]}>
                  <Image source={{ uri: imgUrl }} style={styles.dishImage} resizeMode="cover"/>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  {dish.price && (
                    <Text style={styles.dishPrice}>{formatVND(dish.price)}</Text>
                  )}

                  <Pressable
                    onPress={() => alert(`Added ${dish.name} to cart`)}
                    style={styles.addButton}
                  >
                    <Ionicons name="add" color="white" size={18} />
                  </Pressable>
                </View>
              );
            })
          ) : (
            <Text style={{ color: "#6b7280", paddingHorizontal: 16 }}>
              No dishes found.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: "100%",
    height: 200,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  restaurantImage: {
    width: "90%",
    height: "100%",
    borderRadius: 12,
  },
  headerContent: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  desc: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
  },
  chipText: {
    color: "#6b7280",
    fontSize: 14,
  },
  activeChip: {
    backgroundColor: "#f97316",
  },
  activeChipText: {
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dishGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
  },
  dishCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  dishImage: {
  width: "100%",
  height: 360,
  borderRadius: 12,
  marginBottom: 6,
  resizeMode: "cover",
},
  dishName: {
    fontWeight: "600",
    color: "#111827",
  },
  dishPrice: {
    color: "#16a34a",
    fontWeight: "500",
    marginTop: 2,
  },
  addButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "#f97316",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
