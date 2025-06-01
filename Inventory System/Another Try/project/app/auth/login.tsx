import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';

export default function Login() {
  const { signIn, isLoading } = useAuth();
  const { themeColors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Email and password are required');
      return;
    }
    setErrorMessage('');
    try {
      await signIn(email, password);
    } catch (error: any) {
      setErrorMessage(error.message || 'An error occurred during login');
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    container: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.xxl,
    },
    title: {
      fontSize: FONT_SIZE.xxxl,
      fontFamily: 'Inter-Bold',
      color: themeColors.primary,
      marginBottom: SPACING.sm,
    },
    subtitle: {
      fontSize: FONT_SIZE.md,
      color: themeColors.textLight,
      fontFamily: 'Inter-Regular',
    },
    formContainer: {
      width: '100%',
    },
    errorContainer: {
      backgroundColor: themeColors.errorContainer,
      padding: SPACING.md,
      borderRadius: BORDER_RADIUS.sm,
      marginBottom: SPACING.md,
    },
    errorText: {
      color: themeColors.onErrorContainer,
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
    },
    button: {
      marginTop: SPACING.lg,
    },
    inputRightIconContainer: {
      padding: SPACING.sm,
      justifyContent: 'center',
      alignItems: 'center',
    }
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Truck Center</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </View>

          <View style={styles.formContainer}>
            {errorMessage ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Input
              label="Email"
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => { setEmail(text); setErrorMessage(''); }}
              leftIcon={<Mail size={20} color={themeColors.textLight} />}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => { setPassword(text); setErrorMessage(''); }}
              leftIcon={<Lock size={20} color={themeColors.textLight} />}
              rightIcon={
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.inputRightIconContainer}>
                  {showPassword ? (
                    <Eye size={20} color={themeColors.textLight} />
                  ) : (
                    <EyeOff size={20} color={themeColors.textLight} />
                  )}
                </Pressable>
              }
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading || !email || !password}
              fullWidth
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}