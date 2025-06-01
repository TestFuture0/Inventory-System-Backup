import React from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Pressable,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';

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
  icon?: React.ReactNode;
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
  icon,
}: ButtonProps) {
  const { themeColors } = useTheme();

  const buttonStyles = StyleSheet.create({
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
      flexDirection: 'row',
    },
    fullWidth: {
      width: '100%',
    },
    primaryButton: {
      backgroundColor: themeColors.primary,
    },
    secondaryButton: {
      backgroundColor: themeColors.secondary,
    },
    dangerButton: {
      backgroundColor: themeColors.error,
    },
    successButton: {
      backgroundColor: themeColors.success,
    },
    warningButton: {
      backgroundColor: themeColors.warning,
    },
    outlineButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: themeColors.primary,
    },
    disabledButton: {
      opacity: 0.6,
      backgroundColor: themeColors.disabled,
    },
    pressedButton: {
      opacity: 0.8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
      marginLeft: icon ? 8 : 0,
    },
    primaryText: {
      color: themeColors.white,
    },
    outlineText: {
      color: themeColors.primary,
    },
    disabledText: {
      color: themeColors.textLight,
      opacity: 0.8,
    },
  });

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
  
  const loaderColor = variant === 'outline' ? themeColors.primary : themeColors.white;
  
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
        <ActivityIndicator size="small" color={loaderColor} />
      ) : (
        <>
          {icon}
        <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}