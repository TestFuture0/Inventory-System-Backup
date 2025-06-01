import React, { useEffect } from 'react';
import { Stack, SplashScreen, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function Screens() {
  const { session, isLoading } = useAuth();
  const { themeColors } = useTheme();
  const antdRouter = useRouter();
  console.log('[Screens] isLoading:', isLoading, 'Session:', !!session);

  useEffect(() => {
    console.log('[Screens Effect] isLoading:', isLoading, 'Session:', !!session);
    if (isLoading) {
      console.log('[Screens Effect] Still loading, returning.');
      return; // Wait for auth state to resolve
    }

    // Once loading is false, the rendering logic below will determine what to show based on session.
    // Explicit navigation might not be needed here if stacks are correctly switched by render.
    if (session) {
      console.log('[Screens Effect] Session exists. Relying on render logic to show (tabs) stack.');
      // const timer = setTimeout(() => {
      //   console.log('[Screens Effect] Timeout complete, replacing with /(tabs)');
      //   antdRouter.replace('/(tabs)');
      // }, 0);
      // return () => clearTimeout(timer);
    } else {
      // When no session, the rendering logic below will handle showing the auth stack.
      // Explicit redirect to /auth/login is handled by AuthContext.signOut
      // and potentially by initial mount if no session and not loading.
      console.log('[Screens Effect] No session. Relying on render logic to show auth stack / login.');
    }
  }, [session, isLoading]); // Removed antdRouter from dependencies as it's not used for replace here

  if (isLoading) {
    console.log('[Screens Render] isLoading is true, rendering ActivityIndicator.');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  if (!session) {
    // User is not authenticated, render only auth screens
    console.log('[Screens Render] No session, rendering Auth Stack.');
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" />
        {/* Optionally, a specific login screen if 'auth' is a group */}
        {/* <Stack.Screen name="auth/login" /> */} 
      </Stack>
    );
  }

  // User is authenticated, render main app screens
  console.log('[Screens Render] Session exists, rendering Main App Stack.');
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="+not-found" />
      {/* Ensure auth screens are not directly accessible when logged in,
          or define them such that they redirect if a session exists */}
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Return null to keep splash screen visible while fonts load
  if (!fontsLoaded && !fontError) {
    return null;
  }

  // We need to use a component here to access AuthContext for the key
  const AppWrapper = () => {
    const { session } = useAuth();
    // Key changes when session presence changes, forcing ThemeProvider to re-mount
    const themeProviderKey = session ? 'authed' : 'unauthed'; 

    return (
      <ThemeProvider key={themeProviderKey}>
        <Screens />
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppWrapper />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}