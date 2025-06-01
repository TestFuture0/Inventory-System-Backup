import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const { themeColors } = useTheme();

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
      backgroundColor: themeColors.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
      color: themeColors.text,
  },
});

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={themeColors.primary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}