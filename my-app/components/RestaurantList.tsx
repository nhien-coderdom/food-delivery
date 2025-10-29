import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Platform,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_URL, getImageUrl } from "@/lib/apiConfig";
import { shadows } from "@/lib/shadowStyles";

// Responsive columns based on screen width
const getNumColumns = () => {
  const { width } = Dimensions.get("window");
  if (width > 1200) return 4; // Large desktop
  if (width > 768) return 3;  // Tablet/small desktop
  return 2;                    // Mobile
};

interface RestaurantListProps {
  query?: string;
  category?: string;
}

export default function RestaurantList({
  query = "",
  category = "all",
}: RestaurantListProps) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_URL}/api/restaurants?populate=image`);
        const json = await res.json();

        console.log("🍔 Strapi data:", json);

        setRestaurants(Array.isArray(json.data) ? json.data : []);
      } catch (err: any) {
        console.error("❌ Error fetching restaurants:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );

  if (!restaurants || restaurants.length === 0)
    return (
      <View style={styles.center}>
        <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>No restaurants found</Text>
      </View>
    );

  // ✅ Lọc theo query
  const filtered = (restaurants || []).filter((r: any) =>
    r?.name?.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0)
    return (
      <View style={styles.center}>
        <Ionicons name="search-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>No Restaurants Found</Text>
      </View>
    );

  const renderRestaurant = ({ item: res }: { item: any }) => {
    const imgUrl = getImageUrl(res?.image?.url);

    // Random data cho demo (sau này sẽ lấy từ API)
    const rating = (4.0 + Math.random() * 0.9).toFixed(1);
    const deliveryTime = Math.floor(Math.random() * 20) + 15;
    const isFree = Math.random() > 0.5;

    return (
      <Link href={`../restaurant/${res.documentId}`} asChild>
        <Pressable style={styles.card}>
          <Image 
            source={{ uri: imgUrl }} 
            style={styles.cardImage}
            resizeMode="cover"
          />
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {res.name || "Unnamed"}
              </Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={12} color="#FFB800" />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            </View>
            <Text style={styles.restaurantCategory}>
              Burger • Chiken • Riche • Wings
            </Text>
            <View style={styles.footer}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingValue}>{rating}</Text>
              </View>
              {isFree && (
                <View style={styles.freeBadge}>
                  <Ionicons name="bicycle" size={14} color="#10B981" />
                  <Text style={styles.freeText}>Free</Text>
                </View>
              )}
              <View style={styles.timeContainer}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.timeText}>{deliveryTime} min</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      {filtered.map((res) => {
        const imgUrl = getImageUrl(res?.image?.url);

        const rating = (4.0 + Math.random() * 0.9).toFixed(1);
        const deliveryTime = Math.floor(Math.random() * 20) + 15;
        const isFree = Math.random() > 0.5;

        return (
          <Link key={res.id} href={`../restaurant/${res.documentId}`} asChild>
            <Pressable style={styles.card}>
              <Image 
                source={{ uri: imgUrl }} 
                style={styles.cardImage}
                resizeMode="cover"
              />
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {res.name || "Unnamed"}
                  </Text>
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#FFB800" />
                    <Text style={styles.ratingText}>{rating}</Text>
                  </View>
                </View>
                <Text style={styles.restaurantCategory}>
                  Burger • Chiken • Riche • Wings
                </Text>
                <View style={styles.footer}>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={14} color="#FFB800" />
                    <Text style={styles.ratingValue}>{rating}</Text>
                  </View>
                  {isFree && (
                    <View style={styles.freeBadge}>
                      <Ionicons name="bicycle" size={14} color="#10B981" />
                      <Text style={styles.freeText}>Free</Text>
                    </View>
                  )}
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.timeText}>{deliveryTime} min</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create<{
  center: ViewStyle;
  errorText: TextStyle;
  emptyText: TextStyle;
  container: ViewStyle;
  card: ViewStyle;
  cardImage: ImageStyle;
  cardContent: ViewStyle;
  cardHeader: ViewStyle;
  ratingBadge: ViewStyle;
  ratingText: TextStyle;
  restaurantName: TextStyle;
  restaurantDesc: TextStyle;
  restaurantCategory: TextStyle;
  footer: ViewStyle;
  ratingContainer: ViewStyle;
  ratingValue: TextStyle;
  freeBadge: ViewStyle;
  freeText: TextStyle;
  timeContainer: ViewStyle;
  timeText: TextStyle;
}>({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 12,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
  },
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 16,
  },
  card: {
    width: Platform.select({
      web: "calc(33.333% - 12px)", // 3 columns on web
      default: "100%", // 1 column on mobile
    }) as any,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
    ...shadows.card,
    marginBottom: 16,
  },
  cardImage: {
    width: "100%",
    height: Platform.select({
      web: 160,
      default: 200, // Higher image on mobile
    }) as number,
    backgroundColor: "#F3F4F6",
  },
  cardContent: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    marginLeft: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  restaurantDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: 12,
    minHeight: 32,
  },
  restaurantCategory: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 4,
  },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
    fontWeight: "500",
  },
});
