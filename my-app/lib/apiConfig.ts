import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Lấy đúng API URL cho từng platform
 * - Web: localhost:1337
 * - iOS Simulator: localhost:1337  
 * - Android Emulator: 10.0.2.2:1337 (là localhost của máy host)
 * - Android/iOS Device: IP của máy dev (từ Expo debugger)
 */
export const getApiUrl = (): string => {
  // Lấy từ env trước
  const envUrl = process.env.EXPO_PUBLIC_STRAPI_URL;
  
  // Nếu có env URL và không phải localhost, dùng nó
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    console.log('📱 Using env URL:', envUrl);
    return envUrl;
  }
  
  // Web: dùng localhost
  if (Platform.OS === 'web') {
    const url = envUrl || 'http://localhost:1337';
    console.log('🌐 Web - Using:', url);
    return url;
  }
  
  // Android Emulator: dùng 10.0.2.2 (localhost của máy host)
  if (Platform.OS === 'android') {
    // Nếu env có localhost, đổi thành 10.0.2.2
    if (envUrl && envUrl.includes('localhost')) {
      const url = envUrl.replace('localhost', '10.0.2.2');
      console.log('🤖 Android Emulator - Using:', url);
      return url;
    }
    const url = 'http://10.0.2.2:1337';
    console.log('🤖 Android - Using:', url);
    return url;
  }
  
  // iOS Simulator: có thể dùng localhost
  if (Platform.OS === 'ios') {
    const url = envUrl || 'http://localhost:1337';
    console.log('🍎 iOS - Using:', url);
    return url;
  }
  
  // Fallback: lấy IP từ Expo debugger (cho physical device)
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (debuggerHost) {
    const url = `http://${debuggerHost}:1337`;
    console.log('📱 Device - Using Expo host:', url);
    return url;
  }
  
  // Final fallback
  console.warn('⚠️ Could not determine API URL, using localhost');
  return 'http://localhost:1337';
};

export const API_URL = getApiUrl();

// Helper để lấy full image URL
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) {
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }
  
  // Nếu đã là URL đầy đủ, return luôn
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // Nếu là relative path, ghép với API_URL
  return `${API_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

// Log để debug
console.log('='.repeat(50));
console.log('🔗 API Configuration:');
console.log('Platform:', Platform.OS);
console.log('API URL:', API_URL);
console.log('Env URL:', process.env.EXPO_PUBLIC_STRAPI_URL);
console.log('='.repeat(50));
