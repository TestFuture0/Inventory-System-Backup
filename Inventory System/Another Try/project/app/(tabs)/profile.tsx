import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { LogOut, User, Settings, HelpCircle, Info, UserCircle, Shield, ChevronRight, ShoppingBag } from 'lucide-react-native';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { user, userRole, signOut } = useAuth();
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

  const renderMenuItem = (item: any) => (
    <TouchableOpacity style={styles.menuItem} key={item.id} onPress={() => router.push(item.screen as any)}>
      <item.icon color={COLORS.primary} size={22} />
      <Text style={styles.menuItemText}>{item.title}</Text>
      <ChevronRight color={COLORS.gray} size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: insets.top + 16 }
      ]}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <User size={48} color={COLORS.white} />
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
          <Card>
            {menuItems.map(renderMenuItem)}
          </Card>
        </View>

        {userRole === 'admin' && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Admin Tools</Text>
            <Card>
              {adminMenuItems.map(renderMenuItem)}
            </Card>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  nameText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  emailText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    marginTop: 4,
    marginBottom: 12,
  },
  roleContainer: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.white,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: COLORS.text,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  signOutButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  signOutButton: {
    borderColor: COLORS.error,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: COLORS.error,
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemText: {
    fontSize: FONT_SIZE.md,
    marginLeft: SPACING.md,
    flex: 1,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
});