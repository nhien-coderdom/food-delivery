import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Lấy API URL cố định cho Strapi
 */
export const getApiUrl = (): string => {
  const fixedUrl = 'http://10.10.30.182:1337';

  console.log('='.repeat(50));
  console.log('🔗 API Configuration (fixed URL):');
  console.log('Platform:', Platform.OS);
  console.log('API URL:', fixedUrl);
  console.log('='.repeat(50));

  return fixedUrl;
};

export const API_URL = getApiUrl();

/**
 * Helper để lấy full image URL
 */
export const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) {
    return 'https://via.placeholder.com/400x300?text=No+Image';
  }

  // Nếu đã là URL đầy đủ, return luôn
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Nếu là relative path, ghép với API_URL cố định
  return `${API_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};
