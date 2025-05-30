import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    marginBottom: 16,
    boxShadow: `0px 2px 8px ${COLORS.shadow}`,
  },
});