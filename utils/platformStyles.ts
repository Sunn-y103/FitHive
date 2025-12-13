import { Platform, StatusBar, ViewStyle, TextStyle } from 'react-native';

/**
 * Platform-specific style utilities
 * Provides consistent Android/iOS styling across all screens
 */

/**
 * Get safe area padding top for Android (accounts for status bar)
 */
export const getSafeAreaPaddingTop = (): number => {
  return Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
};

/**
 * Common screen padding
 */
export const screenPadding = {
  horizontal: 20,
  top: Platform.OS === 'android' ? 16 : 20,
  bottom: Platform.OS === 'android' ? 120 : 100,
};

/**
 * Common card spacing
 */
export const cardSpacing = {
  marginBottom: Platform.OS === 'android' ? 24 : 20,
  padding: Platform.OS === 'android' ? 22 : 20,
};

/**
 * Common section spacing
 */
export const sectionSpacing = {
  marginBottom: Platform.OS === 'android' ? 28 : 24,
  headerMarginBottom: Platform.OS === 'android' ? 20 : 16,
};

/**
 * Common text styles with platform-specific adjustments
 */
export const textStyles = {
  title: {
    fontSize: Platform.OS === 'android' ? 22 : 24,
    lineHeight: Platform.OS === 'android' ? 28 : 30,
  } as TextStyle,
  subtitle: {
    fontSize: Platform.OS === 'android' ? 17 : 18,
    lineHeight: Platform.OS === 'android' ? 22 : 24,
  } as TextStyle,
  body: {
    fontSize: Platform.OS === 'android' ? 13 : 14,
    lineHeight: Platform.OS === 'android' ? 18 : 20,
  } as TextStyle,
  small: {
    fontSize: Platform.OS === 'android' ? 11 : 12,
    lineHeight: Platform.OS === 'android' ? 16 : 18,
  } as TextStyle,
};

/**
 * Card shadow/elevation styles
 * Returns platform-specific shadow/elevation properties
 */
export const getCardShadow = (elevation: number = 4) => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    } as ViewStyle;
  } else {
    return {
      elevation: elevation,
    } as ViewStyle;
  }
};

/**
 * Enhanced card shadow for prominent cards
 */
export const getEnhancedCardShadow = () => getCardShadow(6);

/**
 * Standard card shadow
 */
export const getStandardCardShadow = () => getCardShadow(4);

/**
 * Light card shadow
 */
export const getLightCardShadow = () => getCardShadow(2);

/**
 * Container style with safe area padding
 */
export const getSafeContainerStyle = (): ViewStyle => ({
  flex: 1,
  backgroundColor: '#F7F7FA',
  ...(Platform.OS === 'android' && {
    paddingTop: getSafeAreaPaddingTop(),
  }),
});

/**
 * Scroll content style with consistent padding
 */
export const getScrollContentStyle = (): ViewStyle => ({
  paddingHorizontal: screenPadding.horizontal,
  paddingTop: screenPadding.top,
  paddingBottom: screenPadding.bottom,
});

/**
 * Header style with platform-specific spacing
 */
export const getHeaderStyle = (): ViewStyle => ({
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: Platform.OS === 'android' ? 20 : 16,
});

/**
 * Separator style with platform-specific spacing
 */
export const getSeparatorStyle = (): ViewStyle => ({
  height: 1,
  backgroundColor: '#E0E0E0',
  marginVertical: Platform.OS === 'android' ? 24 : 20,
});

