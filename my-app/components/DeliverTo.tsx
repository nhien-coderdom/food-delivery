import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, FlatList, ActivityIndicator, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAddress } from "@/components/AddressContext";
import { shadows } from "@/lib/shadowStyles";
import * as Location from "expo-location";

export default function DeliverTo() {
  const { currentAddress, saved, setCurrentAddress, addAddress, removeAddress } = useAddress();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [addr, setAddr] = useState("");
  const [locLoading, setLocLoading] = useState(false);

  // Optional: use Google Geocoding on Android if key provided (gives better address details on some devices)
  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY;
    if (Platform.OS === "android" && key) {
      try { Location.setGoogleApiKey(key); } catch {}
    }
  }, []);

  const useCurrentLocation = async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Cần quyền vị trí", "Vui lòng cấp quyền vị trí để dùng địa chỉ hiện tại.");
        return;
      }
      // Try last known first for speed, then fall back to high-accuracy fetch
      const lastKnown = await Location.getLastKnownPositionAsync();
      const position = lastKnown || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
      const { latitude, longitude } = position.coords;

      // 1) Try Expo reverse geocoding first
      const expoResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      const expoFirst = expoResults?.[0];

      const buildFromExpo = (r: Location.LocationGeocodedAddress | undefined) => {
        if (!r) return '';
        const line1 = [r.streetNumber, r.street].filter(Boolean).join(' ').trim();
        const parts = [
          line1 || r.name,
          r.district,
          r.subregion,
          r.city,
          r.region,
          r.postalCode,
          r.country,
        ].filter(Boolean);
        return parts.join(', ');
      };

      let pretty = buildFromExpo(expoFirst);

      const isInsufficient = (s: string) => !s || s.split(',').length < 2; // quá ít thông tin => chưa đủ cụ thể

      // 2) If not good enough, try Google Geocoding if key is provided
      if (isInsufficient(pretty) && process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY) {
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY}&language=vi`;
          const resp = await fetch(url);
          const data = await resp.json();
          const formatted = data?.results?.[0]?.formatted_address as string | undefined;
          if (formatted) pretty = formatted;
        } catch {}
      }

      // 3) If still not good, use OpenStreetMap Nominatim as a free fallback
      if (isInsufficient(pretty)) {
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
          const resp = await fetch(url, {
            headers: {
              'User-Agent': 'food-delivery-demo/1.0',
              'Accept-Language': 'vi',
            },
          });
          const data = await resp.json();
          const display = data?.display_name as string | undefined;
          if (display) pretty = display;
        } catch {}
      }

      // 4) Absolute last fallback: lat,lng
      if (isInsufficient(pretty)) {
        pretty = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }
      setCurrentAddress(pretty);
      setOpen(false);
    } catch (e: any) {
      Alert.alert(
        "Không lấy được vị trí",
        (e?.message || "Vui lòng thử lại sau") +
          (Platform.OS === "android" ? "\nGợi ý: Bật dịch vụ vị trí và Google Play services, chọn độ chính xác cao." : "")
      );
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <>
      <Text style={styles.caption}>Giao đến</Text>
      <Pressable style={styles.row} onPress={() => setOpen(true)}>
        <Text style={styles.address} numberOfLines={1}>{currentAddress}</Text>
        <Ionicons name="chevron-down" size={24} color="#FF6B35" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chọn địa chỉ giao hàng</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <View style={styles.form}>
              <TextInput
                placeholder="Tên địa chỉ (Ví dụ: Nhà, Công ty, Trường học)"
                value={label}
                onChangeText={setLabel}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                placeholder="Địa chỉ cụ thể"
                value={addr}
                onChangeText={setAddr}
                style={styles.input}
                placeholderTextColor="#9CA3AF"
              />
              <Pressable
                style={[styles.addBtn, !(label && addr) && styles.addBtnDisabled]}
                disabled={!(label && addr)}
                onPress={() => {
                  addAddress({ label, address: addr });
                  setLabel("");
                  setAddr("");
                }}
              >
                <Text style={styles.addBtnText}>Thêm địa chỉ</Text>
              </Pressable>
              <Pressable style={[styles.addBtn, { backgroundColor: "#10B981" }]} onPress={useCurrentLocation} disabled={locLoading}>
                {locLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.addBtnText}>Đang lấy vị trí…</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="locate" size={16} color="#fff" />
                    <Text style={styles.addBtnText}>Dùng vị trí hiện tại</Text>
                  </View>
                )}
              </Pressable>
            </View>

            <FlatList
              data={saved}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={styles.itemAddr} numberOfLines={2}>{item.address}</Text>
                  </View>
                  <Pressable style={styles.useBtn} onPress={() => { setCurrentAddress(item.address); setOpen(false); }}>
                    <Text style={styles.useBtnText}>Dùng</Text>
                  </Pressable>
                  <Pressable style={styles.removeBtn} onPress={() => removeAddress(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.empty}>Chưa có địa chỉ nào. Hãy thêm mới bên trên.</Text>}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 14, color: "#FF6B35", fontWeight: "600", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  address: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginRight: 4, maxWidth: 220 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  sheet: { backgroundColor: "#fff", borderRadius: 16, padding: 16, maxHeight: "90%", ...shadows.large },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  form: { gap: 8, marginBottom: 12 },
  input: { backgroundColor: "#F3F4F6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#111827" },
  addBtn: { backgroundColor: "#FF6B35", paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  addBtnDisabled: { backgroundColor: "#FFB9A0" },
  addBtnText: { color: "#fff", fontWeight: "700" },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  itemLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  itemAddr: { fontSize: 13, color: "#4B5563", marginTop: 2 },
  useBtn: { backgroundColor: "#10B981", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  useBtnText: { color: "#fff", fontWeight: "700" },
  removeBtn: { padding: 8 },
  empty: { textAlign: "center", color: "#6B7280", paddingTop: 8 },
});
