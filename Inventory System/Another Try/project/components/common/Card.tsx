import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { themeColors } = useTheme();

  const cardStyle = {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'android' ? {
      elevation: 2,
    } : {
      shadowColor: themeColors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    }),
  };

  return <View style={[cardStyle, style]}>{children}</View>;
}

// StyleSheet.create is not strictly necessary here anymore if all styles are dynamic or simple
// but can be kept if there are static styles or for organization.
// For this example, we are making the card style fully dynamic based on the theme.