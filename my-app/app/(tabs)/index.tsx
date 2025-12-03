import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  Image,
  ScrollView as RNScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RestaurantList from "../../components/RestaurantList";
import DeliverTo from "@/components/DeliverTo";
import { useCart } from "../context/CartContext";
import { Link, Href, useRouter } from "expo-router";
import { useUser } from "@clerk/clerk-expo";
import { shadows } from "@/lib/shadowStyles";
import { API_URL, getImageUrl } from "@/lib/apiConfig";
import { useAddress } from "@/app/context/AddressContext";
import { useAuth } from "@/app/context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import Navigation from "@/components/Navigation";

export default function HomePage() {
  const { user } = useUser();
  const { jwt } = useAuth();
  const router = useRouter();
  const { currentAddress } = useAddress();

  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [dishResults, setDishResults] = useState<any[]>([]);
  const [restaurantResults, setRestaurantResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Scroll Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const navbarTranslate = scrollY.interpolate({
    inputRange: [0, 120],
    outputRange: [0, -120],
    extrapolate: "clamp",
  });

  const {
    itemCount,
    addItem,
    updateQuantity,
    currentCart,
  } = useCart();

  /* -------------------------------------------------------------------------- */
  /*                            🔍 SEARCH DISH + RESTO                           */
  /* -------------------------------------------------------------------------- */
  async function performSearch(text: string) {
    const trimmed = text.trim();

    if (!trimmed || !jwt) {
      setDishResults([]);
      setRestaurantResults([]);
      return;
    }

    setSearching(true);
    try {
      // DISHES
      const dishRes = await fetch(
        `${API_URL}/api/dishes?filters[name][$containsi]=${encodeURIComponent(
          trimmed
        )}` +
          `&populate[image][fields][0]=url` +
          `&populate[category][fields][0]=name` +
          `&populate[restaurant][fields][0]=name` +
          `&populate[restaurant][fields][1]=documentId`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      // RESTAURANTS
      const restRes = await fetch(
        `${API_URL}/api/restaurants?filters[name][$containsi]=${encodeURIComponent(
          trimmed
        )}` + `&populate[image][fields][0]=url`,
        { headers: { Authorization: `Bearer ${jwt}` } }
      );

      const dishesJson = await dishRes.json();
      const restJson = await restRes.json();

      setDishResults(dishesJson.data ?? []);
      setRestaurantResults(restJson.data ?? []);
    } catch (e) {
      console.log("Search ERROR:", e);
    }
    setSearching(false);
  }

  useEffect(() => {
    const delay = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(delay);
  }, [query, jwt]);

  /* -------------------------------------------------------------------------- */
  /*                           📦 LOAD CATEGORIES                                */
  /* -------------------------------------------------------------------------- */
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        const json = await res.json();

        const formatted = json.data.map((c: any) => ({
          id: c.documentId,
          name: c.Name || c.name,
          icon: c.icon ?? "fast-food",
        }));

        setCategories([{ id: "all", name: "All", icon: "flame" }, ...formatted]);
      } catch (e) {
        console.log("Category ERROR:", e);
      } finally {
        setLoadingCategories(false);
      }
    }

    if (jwt) load();
  }, [jwt]);

  // USER NAME
  const firstName =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Friend";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF" }}>
      <View style={{ flex: 1, backgroundColor: "#FFF" }}>
        {/* NAVBAR */}
        <Animated.View
          style={[
            styles.navWrapper,
            {
              transform: [{ translateY: navbarTranslate }],
            },
          ]}
        >
          <Navigation />
        </Animated.View>

        {/* MAIN CONTENT */}
        <Animated.ScrollView
          style={{ flex: 1 }}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
        >
          {/* tránh navbar đè lên */}
          <View style={{ height: 130 }} />

          {/* HEADER (khi search thì bỏ shadow/card để không bị box tối) */}
          <View
            style={[
              styles.headerBase,
              query.length === 0 && styles.headerCard,
            ]}
          >
            <View style={styles.headerTop}>
              <DeliverTo />

              <Link href={("/cart" as Href)} asChild>
                <TouchableOpacity style={styles.profileButton}>
                  {itemCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{itemCount}</Text>
                    </View>
                  )}
                  <Ionicons name="cart" size={28} color="#1F2937" />
                </TouchableOpacity>
              </Link>
            </View>

            <Text style={styles.greeting}>Hi {firstName}! 👋</Text>

            {/* SEARCH INPUT */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#9CA3AF"
                style={styles.searchIcon}
              />
              <TextInput
                placeholder="Tìm món ăn, nhà hàng..."
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* 🔍 SEARCH RESULTS */}
            {query.length > 0 && (
              <View style={styles.searchResultBox}>
                {searching && (
                  <Text style={{ paddingVertical: 6 }}>Đang tìm kiếm...</Text>
                )}

                {/* DISH RESULTS */}
                {dishResults.length > 0 && (
                  <>
                    <Text style={styles.sectionTitle}>Món ăn</Text>

                    {dishResults.map((dish: any) => {
                      const imgUrl = getImageUrl(dish.image?.url);
                      const qty =
                        currentCart?.find((it) => it.dishId === dish.id)
                          ?.quantity ?? 0;

                      return (
                        <Pressable
                          key={dish.id}
                          style={styles.rowCard}
                          onPress={() =>
                            router.push(
                              `/restaurant/${dish.restaurant?.documentId}`
                            )
                          }
                        >
                          {/* IMAGE */}
                          <Image
                            source={{ uri: imgUrl }}
                            style={styles.rowImage}
                          />

                          {/* TEXT BLOCK */}
                          <View style={styles.rowMiddle}>
                            <Text style={styles.rowTitle}>{dish.name}</Text>
                            <Text style={styles.rowSubtitle}>
                              {dish.category?.name ?? ""}
                            </Text>
                            <Text style={styles.rowFinalPrice}>
                              {dish.price?.toLocaleString("vi-VN", {
                                style: "currency",
                                currency: "VND",
                              })}
                            </Text>
                            {dish.restaurant?.name && (
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "#6B7280",
                                  marginTop: 2,
                                }}
                              >
                                {dish.restaurant.name}
                              </Text>
                            )}
                          </View>

                          {/* BUTTONS giống RestaurantDetail */}
                          <View style={styles.rowRight}>
                            {qty === 0 ? (
                              <Pressable
                                onPress={() =>
                                  addItem({
                                    dishId: dish.id,
                                    name: dish.name,
                                    price: dish.price ?? 0,
                                    restaurantId: dish.restaurant?.id,
                                    restaurantName: dish.restaurant?.name,
                                    image: imgUrl,
                                  })
                                }
                                style={styles.addBtn}
                              >
                                <Ionicons name="add" size={18} color="#fff" />
                              </Pressable>
                            ) : (
                              <View style={styles.qtyRow}>
                                <Pressable
                                  style={styles.qtyBtn}
                                  onPress={() =>
                                    updateQuantity(dish.id, qty - 1)
                                  }
                                >
                                  <Text style={styles.qtyText}>−</Text>
                                </Pressable>

                                <Text style={styles.qtyNumber}>{qty}</Text>

                                <Pressable
                                  style={styles.qtyBtn}
                                  onPress={() =>
                                    updateQuantity(dish.id, qty + 1)
                                  }
                                >
                                  <Text style={styles.qtyText}>+</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </>
                )}

                {/* RESTAURANT RESULTS */}
                {restaurantResults.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                      Nhà hàng
                    </Text>

                    {restaurantResults.map((rest: any) => (
                      <Pressable
                        key={rest.documentId ?? rest.id}
                        style={styles.restRow}
                        onPress={() =>
                          router.push(`/restaurant/${rest.documentId}`)
                        }
                      >
                        <Image
                          source={{ uri: getImageUrl(rest.image?.url) }}
                          style={styles.restImg}
                        />
                        <Text style={styles.restName}>{rest.name}</Text>
                      </Pressable>
                    ))}
                  </>
                )}

                {!searching &&
                  dishResults.length === 0 &&
                  restaurantResults.length === 0 && (
                    <Text style={{ paddingVertical: 10 }}>
                      Không tìm thấy kết quả
                    </Text>
                  )}
              </View>
            )}

            {/* CATEGORIES (ẩn khi đang search) */}
            {query.length === 0 && (
              <>
                <View style={styles.categoriesHeader}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                </View>

                <RNScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScroll}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory === cat.id &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon}
                        size={24}
                        color={selectedCategory === cat.id ? "#FFF" : "#FF6B35"}
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === cat.id &&
                            styles.categoryTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </RNScrollView>
              </>
            )}
          </View>

          {/* RESTAURANT LIST (chỉ hiện khi không search) */}
          {query.length === 0 && (
            <>
              <View style={styles.restaurantsHeader}>
                <Text style={styles.sectionTitle}>Open Restaurants</Text>
              </View>

              <RestaurantList query={query} category={selectedCategory} />
            </>
          )}
        </Animated.ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  STYLES                                     */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  navWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#fff",
    elevation: 10,
  },

  // header gốc
  headerBase: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 25,
  },

  // card + shadow, chỉ dùng khi KHÔNG search
  headerCard: {
    paddingTop: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...shadows.small,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  profileButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },

  badgeText: { color: "#FFF", fontSize: 10, fontWeight: "700" },

  greeting: { fontSize: 16, color: "#1F2937", marginBottom: 20 },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 10,
    borderWidth: 0,
  borderColor: "transparent",
  },

  searchIcon: { marginRight: 10 },
  
  searchInput: {
    flex: 1,
  fontSize: 15,
  color: "#1F2937",
  borderWidth: 0,
  borderColor: "transparent",
  paddingVertical: 0,
},

  searchResultBox: {
    marginTop: 8,
  },

  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937" },

  categoriesHeader: {
    marginTop: 10,
    marginBottom: 14,
  },

  categoriesScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B35",
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
  },

  categoryButtonActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },

  categoryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
  },

  categoryTextActive: { color: "#FFF" },

  restaurantsHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },

  /* ---------- UI ROW GIỐNG RestaurantDetail ---------- */
  rowCard: {
    flexDirection: "row",
    paddingVertical: 18,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  rowImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f3f4f6",
  },

  rowMiddle: { flex: 1 },

  rowTitle: { fontSize: 16, fontWeight: "600" },
  rowSubtitle: { fontSize: 13, color: "#6B7280" },

  rowFinalPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 4,
  },

  rowRight: { justifyContent: "center", alignItems: "center" },

  addBtn: {
    backgroundColor: "#FF6B35",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  qtyBtn: {
    backgroundColor: "#F3F4F6",
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  qtyText: { fontSize: 18, fontWeight: "700", color: "#FF6B35" },

  qtyNumber: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
  },

  /* RESTAURANT RESULT ROW */
  restRow: {
    flexDirection: "row",
    paddingVertical: 10,
    alignItems: "center",
  },

  restImg: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },

  restName: { fontSize: 15, fontWeight: "700" },
});
