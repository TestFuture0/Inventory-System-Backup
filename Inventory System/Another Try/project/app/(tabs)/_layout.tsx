import React from 'react';
import { Tabs } from 'expo-router';
import { ShoppingCart, Home, BarChart3, Package, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Platform, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { userRole, isLoading, session } = useAuth();
  const insets = useSafeAreaInsets();

  // Base height for the tab bar content itself (icons, labels, internal padding)
  const tabBarContentHeight = Platform.OS === 'ios' ? 50 : 60;
  // For Android, ensure at least a minimum padding if insets.bottom is small, plus the inset itself.
  // For iOS, insets.bottom usually handles the home indicator area, plus some base padding.
  const androidBottomPadding = Math.max(insets.bottom, 10) + 5; // Ensure at least 10, then add 5 more.
  const iosBottomPadding = insets.bottom > 0 ? insets.bottom : 20; // Use inset or fallback for iOS

  console.log(`[TabLayout] Role: ${userRole}, isLoading: ${isLoading}, Session: ${!!session}, BottomInset: ${insets.bottom}, AndroidPadding: ${androidBottomPadding}, iOSPadding: ${iosBottomPadding}`);

  if (isLoading || (session && userRole === null)) {
    console.log('[TabLayout Render] isLoading or (session && userRole is null), rendering ActivityIndicator.');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!session && !isLoading) {
    console.log('[TabLayout Render] No session and not loading, rendering null.');
    return null;
  }

  console.log('[TabLayout Render] Rendering Tabs. userRole for Dashboard check:', userRole);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          paddingTop: Platform.OS === 'ios' ? 0 : 10, // iOS has more space due to taller tab bar
          paddingBottom: Platform.OS === 'ios' ? iosBottomPadding : androidBottomPadding,
          height: tabBarContentHeight + (Platform.OS === 'ios' ? iosBottomPadding : androidBottomPadding),
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          // On Android, labels might need to be pushed up if icons are large or padding is tight
          // marginBottom: Platform.OS === 'android' ? -5 : 0, 
        },
        tabBarIconStyle: {
          // On Android, icons might need to be pushed down if labels are close to top
          // marginTop: Platform.OS === 'android' ? 5 : 0,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          href: userRole === 'admin' ? '/(tabs)/dashboard' : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}