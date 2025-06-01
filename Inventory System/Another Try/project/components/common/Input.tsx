import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Text,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  ...restProps
}: InputProps) {
  const { themeColors } = useTheme();

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
      color: themeColors.text,
  },
  inputContainer: {
    position: 'relative',
    borderWidth: 1,
      borderColor: error ? themeColors.error : themeColors.border,
    borderRadius: 8,
      backgroundColor: themeColors.surface,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
      color: themeColors.text,
    minHeight: 48,
  },
  errorText: {
      color: themeColors.error,
    fontSize: 12,
    marginTop: 4,
  },
  iconLeft: {
    position: 'absolute',
    left: 12,
    height: '100%',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconRight: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    zIndex: 1,
  },
});

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputContainer}>
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput 
          style={[
            styles.input, 
            leftIcon ? { paddingLeft: 40 } : null,
            rightIcon ? { paddingRight: 40 } : null,
          ]}
          placeholderTextColor={themeColors.textLight}
          {...restProps}
        />
        {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}