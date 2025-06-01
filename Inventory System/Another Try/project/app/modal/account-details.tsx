import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

export default function AccountDetailsScreen() {
  const { themeColors } = useTheme();
  const { user } = useAuth();

const styles = StyleSheet.create({
  container: {
    flex: 1,
      backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.surface,
  },
  title: {
    fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
      padding: 20,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    infoLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
    },
    infoValue: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
  },
  placeholderText: {
    fontSize: 18,
      color: themeColors.textLight,
    fontFamily: 'Inter-Regular',
      textAlign: 'center',
      marginTop: 50,
  },
}); 

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>Account Details</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        {user ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>{user.id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Joined</Text>
              <Text style={styles.infoValue}>{new Date(user.created_at).toLocaleDateString()}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.placeholderText}>No user information available.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}