export const lightColors = {
  // Primary colors
  primary: '#0466C8',
  primaryLight: '#4D8FD6',
  primaryDark: '#034E9A',
  onPrimary: '#FFFFFF',
  
  // Secondary colors
  secondary: '#33415C',
  secondaryLight: '#5D687F',
  secondaryDark: '#1F2733',
  onSecondary: '#FFFFFF',
  
  // Accent colors
  accent: '#F7B267',
  accentLight: '#F9CA93',
  accentDark: '#F59935',
  onAccent: '#000000',
  
  // Semantic colors
  success: '#38B000',
  successLight: '#5FCF33',
  successDark: '#2D8C00',
  onSuccess: '#FFFFFF',
  
  warning: '#FFBD00',
  warningLight: '#FFCD42',
  warningDark: '#CC9700',
  onWarning: '#000000',
  
  error: '#D62828',
  errorLight: '#E05353',
  errorDark: '#AC2020',
  onError: '#FFFFFF',
  errorContainer: '#FDECEA',
  onErrorContainer: '#AC2020',
  
  // Neutral colors
  white: '#FFFFFF',
  background: '#F8F9FA',
  onBackground: '#212529',
  surface: '#FFFFFF',
  onSurface: '#212529',
  text: '#212529',
  textLight: '#495057',
  border: '#DEE2E6',
  disabled: '#ADB5BD',
  gray: '#6C757D',
  lightGray: '#F5F5F5',
  shadow: '#000000',
};

export const darkColors = {
  // Primary colors - Adjust if needed for dark mode, often can remain similar
  primary: '#0466C8', // Keep primary, or use a slightly desaturated version
  primaryLight: '#4D8FD6',
  primaryDark: '#034E9A',
  onPrimary: '#FFFFFF',
  
  // Secondary colors - Adjust if needed
  secondary: '#4A5568', // Lighter secondary for dark background
  secondaryLight: '#647083',
  secondaryDark: '#2D3748',
  onSecondary: '#E0E0E0',
  
  // Accent colors - May need to be brighter or adjusted for dark mode
  accent: '#F7B267',
  accentLight: '#F9CA93',
  accentDark: '#F59935',
  onAccent: '#121212',
  
  // Semantic colors
  success: '#38B000',
  successLight: '#5FCF33',
  successDark: '#2D8C00',
  onSuccess: '#FFFFFF',
  
  warning: '#FFBD00',
  warningLight: '#FFCD42',
  warningDark: '#CC9700',
  onWarning: '#121212',
  
  error: '#CF6679',
  errorLight: '#E08791',
  errorDark: '#B00020',
  onError: '#121212',
  
  // Specific for dark glass theme - more contrast might be needed for some "on" colors
  errorContainer: '#B00020',
  onErrorContainer: '#FCE8E7',
  
  // Neutral colors for "dark black glass"
  white: '#FFFFFF', // White text will be used on dark backgrounds
  background: '#121212', // Very dark, almost black background (Instagram like)
  onBackground: '#E0E0E0',
  surface: '#1E1E1E',    // Slightly lighter dark gray for cards/surfaces (glass effect)
  onSurface: '#E0E0E0',
  text: '#E0E0E0',       // Light gray text for readability
  textLight: '#A0A0A0',   // Even lighter gray for secondary text
  border: '#2C2C2C',     // Dark border, subtle
  disabled: '#4A4A4A',   // Disabled state for dark mode
  gray: '#757575',
  lightGray: '#3A3A3A', // Darker "lightGray" for dark mode specific uses
  shadow: '#000000',     // Shadow might need to be less prominent or a very dark gray
};

// Default export can be lightColors, or you can remove it if ThemeProvider handles it.
export const COLORS = lightColors;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  circular: 9999,
};