import React from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { COLORS } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const getButtonStyle = () => {
    const styles: ViewStyle[] = [buttonStyles.button];
    
    if (fullWidth) {
      styles.push(buttonStyles.fullWidth);
    }
    
    switch (variant) {
      case 'secondary':
        styles.push(buttonStyles.secondaryButton);
        break;
      case 'danger':
        styles.push(buttonStyles.dangerButton);
        break;
      case 'success':
        styles.push(buttonStyles.successButton);
        break;
      case 'warning':
        styles.push(buttonStyles.warningButton);
        break;
      case 'outline':
        styles.push(buttonStyles.outlineButton);
        break;
      default:
        styles.push(buttonStyles.primaryButton);
    }
    
    if (disabled) {
      styles.push(buttonStyles.disabledButton);
    }
    
    return styles;
  };
  
  const getTextStyle = () => {
    const styles: TextStyle[] = [buttonStyles.buttonText];
    
    switch (variant) {
      case 'outline':
        styles.push(buttonStyles.outlineText);
        break;
      default:
        styles.push(buttonStyles.primaryText);
    }
    
    if (disabled) {
      styles.push(buttonStyles.disabledText);
    }
    
    return styles;
  };
  
  return (
    <Pressable
      style={({ pressed }) => [
        ...getButtonStyle(),
        style,
        pressed && buttonStyles.pressedButton, 
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' ? COLORS.primary : COLORS.white} />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
      )}
    </Pressable>
  );
}

const buttonStyles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  dangerButton: {
    backgroundColor: COLORS.error,
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  warningButton: {
    backgroundColor: COLORS.warning,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  pressedButton: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: COLORS.white,
  },
  outlineText: {
    color: COLORS.primary,
  },
  disabledText: {
    opacity: 0.8,
  },
});