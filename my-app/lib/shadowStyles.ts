import { Platform, ViewStyle } from 'react-native';

/**
 * Cross-platform shadow helper
 * - iOS/Android: Uses shadow* props
 * - Web: Uses boxShadow
 */
export const createShadow = (
  elevation: number,
  color: string = '#000',
  opacity: number = 0.1
): ViewStyle => {
  if (Platform.OS === 'web') {
    // Web: Use boxShadow
    const offsetY = Math.round(elevation / 2);
    const blurRadius = elevation;
    return {
      boxShadow: `0px ${offsetY}px ${blurRadius}px rgba(0, 0, 0, ${opacity})`,
    } as ViewStyle;
  }

  // iOS/Android: Use shadow* props
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: Math.round(elevation / 2) },
    shadowOpacity: opacity,
    shadowRadius: elevation / 2,
    elevation, // Android elevation
  };
};

// Predefined shadow presets
export const shadows = {
  small: createShadow(4, '#000', 0.05),
  medium: createShadow(8, '#000', 0.08),
  large: createShadow(12, '#000', 0.1),
  card: createShadow(8, '#000', 0.08),
  button: createShadow(6, '#000', 0.15),
};
