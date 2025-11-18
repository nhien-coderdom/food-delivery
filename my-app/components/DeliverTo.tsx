import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAddress } from "@/app/context/AddressContext";
import { shadows } from "@/lib/shadowStyles";
import * as Location from "expo-location";

interface DeliverToProps {
  visible?: boolean; // dùng khi Cart muốn điều khiển modal
  onClose?: () => void;
  showTriggerButton?: boolean; // ẩn nút trigger khi ở Cart
}

export default function DeliverTo({
  visible,
  onClose,
  showTriggerButton = true,
}: DeliverToProps) {
  const { currentAddress, setCurrentAddress, setCurrentLocation } = useAddress();

  // kiểm tra nếu component cha điều khiển hay tự điều khiển
  const isControlledOpen = typeof visible === "boolean";
  const [internalOpen, setInternalOpen] = useState(false);

  const open = isControlledOpen ? visible! : internalOpen;

  const handleOpen = () => {
    if (isControlledOpen) return;  // Cart tự xử lý
    setInternalOpen(true);
  };

  const handleClose = () => {
    if (isControlledOpen) onClose?.();
    else setInternalOpen(false);
  };

  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    const key = process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY;
    if (Platform.OS === "android" && key) {
      try {
        Location.setGoogleApiKey(key);
      } catch (e) {
        console.warn("Google API Key setup failed:", e);
      }
    }
  }, []);

  const useCurrentLocation = async () => {
    try {
      setLocLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Quyền bị từ chối", "Hãy bật quyền vị trí để tiếp tục.");
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const position =
        lastKnown ||
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }));

      if (!position) {
        Alert.alert("Lỗi", "Không thể lấy vị trí GPS");
        return;
      }

      const { latitude, longitude } = position.coords;

      const expoResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = expoResults?.[0];

      const buildExpo = (r: any) => {
        if (!r) return "";

        const line1 = [r.streetNumber, r.street].filter(Boolean).join(" ").trim();
        const baseLine = line1 || r.name;

        return [
          baseLine,
          r.district,
          r.subregion,
          r.city,
          r.region,
          r.postalCode,
          r.country,
        ]
          .filter(Boolean)
          .join(", ");
      };

      let pretty = buildExpo(first);

      const weak = (s: string) => !s || s.split(",").length < 2;

      if (weak(pretty) && process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY) {
        try {
          const resp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.EXPO_PUBLIC_GOOGLE_GEOCODING_KEY}&language=vi`
          );
          const json = await resp.json();
          const gAddr = json?.results?.[0]?.formatted_address;
          if (gAddr) pretty = gAddr;
        } catch {}
      }

      if (weak(pretty)) {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "food-delivery-app", "Accept-Language": "vi" } }
          );
          const json = await resp.json();
          if (json?.display_name) pretty = json.display_name;
        } catch {}
      }

      if (weak(pretty)) {
        pretty = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      }

      setCurrentAddress(pretty);
      setCurrentLocation({ latitude, longitude });

      handleClose();
    } catch (err: any) {
      Alert.alert("Lỗi", err?.message || "Không thể lấy vị trí hiện tại");
    } finally {
      setLocLoading(false);
    }
  };

  return (
    <>
      {showTriggerButton && (
        <>
          <Text style={styles.caption}>Giao đến</Text>
          <Pressable style={styles.row} onPress={handleOpen}>
            <Text style={styles.address} numberOfLines={1}>{currentAddress}</Text>
            <Ionicons name="chevron-down" size={20} color="#FF6B35" />
          </Pressable>
        </>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Chọn địa chỉ giao hàng</Text>
              <Pressable onPress={handleClose}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
            </View>

            <Pressable
              style={[styles.useBtn, { backgroundColor: "#10B981" }]}
              onPress={useCurrentLocation}
              disabled={locLoading}
            >
              {locLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>📍 Dùng vị trí hiện tại</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 14, color: "#FF6B35", fontWeight: "700", letterSpacing: 1 },
  row: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  address: { fontSize: 15, fontWeight: "700", color: "#1F2937", maxWidth: 220 },
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center", alignItems: "center", paddingHorizontal: 20,
  },
  sheet: {
    width: "85%", maxWidth: 350, backgroundColor: "#fff",
    borderRadius: 18, padding: 20, ...shadows.large,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    width: "100%", marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  useBtn: { paddingVertical: 10, borderRadius: 10, width: "100%" },
  addBtnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
});
