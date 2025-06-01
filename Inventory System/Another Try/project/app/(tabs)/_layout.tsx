import React from 'react';
import { Tabs } from 'expo-router';
import { ShoppingCart, Home, BarChart3, Package, User } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Platform, View, ActivityIndicator, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Custom Tab Bar Button Component
const CustomTabBarButton = (props: any) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
    if (props.onPress) {
      props.onPress(); // Call original onPress
    }
  };

  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={props.onPress} // Keep original onPress for navigation
      style={{ flex: 1 }} // Ensure Pressable takes up tab item space
    >
      <Animated.View style={{ 
        flex: 1, 
        transform: [{ scale: scaleValue }],
        alignItems: 'center', // Center children (icon and label) horizontally
        justifyContent: 'center', // Center children vertically (optional, but good for consistency)
      }}>
        {props.children} 
      </Animated.View>
    </Pressable>
  );
};

export default function TabLayout() {
  const { userRole, isLoading, session } = useAuth();
  const insets = useSafeAreaInsets();
  const { themeColors } = useTheme();

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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
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
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textLight,
        tabBarStyle: {
          backgroundColor: themeColors.surface,
          paddingTop: Platform.OS === 'ios' ? 0 : 10, // iOS has more space due to taller tab bar
          paddingBottom: Platform.OS === 'ios' ? iosBottomPadding : androidBottomPadding,
          height: tabBarContentHeight + (Platform.OS === 'ios' ? iosBottomPadding : androidBottomPadding),
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
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
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={userRole === 'admin' ? {
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        } : {
          // For non-admins, hide the tab and do not provide tabBarButton
          href: null, 
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          tabBarButton: (props) => <CustomTabBarButton {...props} />,
        }}
      />
    </Tabs>
  );
}