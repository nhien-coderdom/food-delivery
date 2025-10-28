import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";

const API_URL = process.env.EXPO_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export default function RestaurantList({ query = "" }) {
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
        <ActivityIndicator size="large" />
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: "red" }}>Error: {error}</Text>
      </View>
    );

  if (!restaurants || restaurants.length === 0)
    return (
      <View style={styles.center}>
        <Text>No restaurants found</Text>
      </View>
    );

  // ✅ Lọc theo query, dựa trên name trực tiếp
  const filtered = (restaurants || []).filter((r: any) =>
    r?.name?.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0)
    return (
      <View style={styles.center}>
        <Text>No Restaurants Found</Text>
      </View>
    );

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {filtered.map((res: any) => {
        const imgUrl = res?.image?.url
          ? `${API_URL}${res.image.url}`
          : "https://via.placeholder.com/400x300?text=No+Image";

        return (
          <View key={res.id} style={styles.card}>
            <Image source={{ uri: imgUrl }} style={styles.image} />
            <View style={styles.cardContent}>
              <Text style={styles.name}>{res.name || "Unnamed"}</Text>
              <Text style={styles.desc}>
                {res.description || "No description available"}
              </Text>
              <Link href={`../restaurant/${res.documentId}`} asChild>
                <Pressable style={styles.button}>
                  <Text style={styles.buttonText}>View</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
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
  cardContent: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  desc: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});
