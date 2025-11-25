import { Platform } from "react-native";
import Constants from "expo-constants";

/** 
 * 🔥 ĐỔI IP Ở ĐÂY DUY NHẤT
 * IP MÁY DEV của bạn (LAN)
 * Ví dụ: http://10.10.30.181/
 */
const LOCAL_IP = "http://10.10.30.181/";
const DEFAULT_API = `http://${LOCAL_IP}:1337`;

/**
 * 🎯 Hàm quyết định API URL cho Web / Android / iOS
 */
export const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_STRAPI_URL;

  // Nếu có ENV URL và nó KHÔNG phải localhost → dùng luôn
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    console.log("🌍 Using ENV URL:", envUrl);
    return envUrl;
  }

  // -------------------------
  // 🌐 WEB (luôn chạy trên localhost)
  // -------------------------
  if (Platform.OS === "web") {
    console.log("🌐 Web using:", DEFAULT_API);
    return envUrl || DEFAULT_API;
  }

  // -------------------------
  // 🤖 ANDROID DEVICE / EMULATOR
  // -------------------------
  if (Platform.OS === "android") {
    if (envUrl && envUrl.includes("localhost")) {
      const mapped = envUrl.replace("localhost", LOCAL_IP);
      console.log("🤖 Android replace localhost →", mapped);
      return mapped;
    }
    console.log("🤖 Android using:", DEFAULT_API);
    return DEFAULT_API;
  }

  // -------------------------
  // 🍎 iOS SIMULATOR / DEVICE
  // -------------------------
  if (Platform.OS === "ios") {
    console.log("🍎 iOS using:", envUrl || DEFAULT_API);
    return envUrl || DEFAULT_API;
  }

  // -------------------------
  // 📱 PHYSICAL DEVICE (Expo Go)
  // -------------------------
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    const url = `http://${host}:1337`;
    console.log("📱 Expo device using host:", url);
    return url;
  }

  console.warn("⚠️ Fallback API:", DEFAULT_API);
  return DEFAULT_API;
};

// FINAL URL EXPORT
export const API_URL = getApiUrl();

/** 
 * 🖼️ Format URL ảnh
 */
export const getImageUrl = (imagePath?: string | null): string => {
  if (!imagePath) return "https://via.placeholder.com/400x300?text=No+Image";

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${API_URL}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`;
};

// DEBUG
console.log("==================================================");
console.log("🔗 API Platform:", Platform.OS);
console.log("🔗 API URL Selected:", API_URL);
console.log("🔗 ENV URL:", process.env.EXPO_PUBLIC_STRAPI_URL);
console.log("==================================================");
