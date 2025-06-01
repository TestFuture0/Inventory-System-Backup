import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { LogOut, User, Settings, HelpCircle, Info, UserCircle, Shield, ChevronRight, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, userRole, signOut } = useAuth();
  const { themeColors, themeMode } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    await signOut();
    // Navigate to login or auth screen if necessary
    // router.replace('/(auth)/login'); 
  };

  const menuItems = [
    { id: '1', title: 'Account Details', icon: UserCircle, screen: '/modal/account-details' },
    { id: '2', title: 'App Settings', icon: Settings, screen: '/modal/app-settings' },
    // Add more common settings here
  ];

  const adminMenuItems = [
    { id: 'admin-1', title: 'Manage Categories', icon: ShoppingBag, screen: '/modal/manage-categories' },
    // Add other admin-specific navigation items here
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.lg,
    },
    header: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
      paddingVertical: SPACING.md,
    },
    avatarContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: themeColors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    nameText: {
      fontSize: FONT_SIZE.xxl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    emailText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginTop: SPACING.xs,
      marginBottom: SPACING.sm,
    },
    roleContainer: {
      backgroundColor: themeColors.primaryLight,
      paddingVertical: SPACING.xs,
      paddingHorizontal: SPACING.sm,
      borderRadius: 16,
    },
    roleText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Medium',
      color: themeColors.white,
    },
    sectionContainer: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.sm,
      paddingHorizontal: SPACING.xs,
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    optionText: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
      marginLeft: 12,
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
    },
    signOutButtonContainer: {
      marginTop: SPACING.lg,
      marginBottom: SPACING.xl,
      paddingHorizontal: SPACING.md,
    },
    signOutButton: {
      borderColor: themeColors.error,
      borderWidth: 1.5,
    },
    signOutButtonText: {
      color: themeColors.error,
      fontFamily: 'Inter-SemiBold',
      fontSize: FONT_SIZE.md,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md - 2,
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.md,
      marginBottom: SPACING.sm,
      ...Platform.select({
        ios: {
          shadowColor: themeColors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: themeMode === 'dark' ? 0.3 : 0.1,
          shadowRadius: 2,
        },
        android: {
          elevation: themeMode === 'dark' ? 3 : 2,
        },
      }),
    },
    menuItemText: {
      fontSize: FONT_SIZE.md,
      marginLeft: SPACING.md,
      flex: 1,
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
    },
  });

  const renderMenuItem = (item: any, index: number, arr: any[]) => (
    <TouchableOpacity 
      style={[
        styles.menuItem,
        index === arr.length - 1 && { marginBottom: 0 } 
      ]} 
      key={item.id} 
      onPress={() => router.push(item.screen as any)} 
      activeOpacity={0.7}
    >
      <item.icon color={themeColors.primary} size={22} />
      <Text style={styles.menuItemText}>{item.title}</Text>
      <ChevronRight color={themeColors.textLight} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + SPACING.md }
      ]}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={48} color={themeColors.white} />
          </View>
          <Text style={styles.nameText}>{user?.email?.split('@')[0] || 'User'}</Text>
          <Text style={styles.emailText}>{user?.email || ''}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>
              {userRole === 'admin' ? 'Administrator' : 'Employee'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View>
            {menuItems.map(renderMenuItem)}
          </View>
        </View>

        {userRole === 'admin' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <View>
              {adminMenuItems.map(renderMenuItem)}
            </View>
          </View>
        )}

        <View style={styles.signOutButtonContainer}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="outline"
            style={styles.signOutButton}
            textStyle={styles.signOutButtonText}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}