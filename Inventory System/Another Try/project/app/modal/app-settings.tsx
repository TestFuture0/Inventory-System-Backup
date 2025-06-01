import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { X, Sun, Moon, Monitor } from 'lucide-react-native';

export default function AppSettingsScreen() {
  const { themeMode, themeColors, isSystemTheme, toggleTheme, setSystemTheme } = useTheme();

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
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    settingLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
    },
    themeSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
    },
    themeSelectorLabel: {
        fontSize: 16,
        fontFamily: 'Inter-Medium',
        color: themeColors.text,
        marginRight: 'auto',
    },
    themeOptionButton: {
        padding: 8,
        marginHorizontal: 5,
        borderRadius: 8,
    },
    selectedThemeOption: {
        backgroundColor: themeColors.primaryLight + '30',
    }
  });

  const renderThemeIcon = (mode: ThemeMode | 'system') => {
    let isActive = false;
    if (mode === 'system') {
        isActive = isSystemTheme;
    } else {
        isActive = !isSystemTheme && themeMode === mode;
    }

    const iconColor = isActive ? themeColors.primary : themeColors.textLight;
    const iconSize = 22;

    switch (mode) {
        case 'light':
            return <Sun size={iconSize} color={iconColor} />;
        case 'dark':
            return <Moon size={iconSize} color={iconColor} />;
        case 'system':
            return <Monitor size={iconSize} color={iconColor} />;
        default:
            return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.title}>App Settings</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.themeSelectorContainer}>
            <Text style={styles.themeSelectorLabel}>Theme</Text>
            <TouchableOpacity 
                style={[styles.themeOptionButton, (isSystemTheme) && styles.selectedThemeOption]}
                onPress={() => setSystemTheme(true)}
            >
                {renderThemeIcon('system')}
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.themeOptionButton, (!isSystemTheme && themeMode === 'light') && styles.selectedThemeOption]}
                onPress={() => toggleTheme('light')}
            >
                {renderThemeIcon('light')}
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.themeOptionButton, (!isSystemTheme && themeMode === 'dark') && styles.selectedThemeOption]}
                onPress={() => toggleTheme('dark')}
            >
                {renderThemeIcon('dark')}
            </TouchableOpacity>
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Notification Preferences</Text>
          <Switch disabled value={false} />
        </View>
         <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Manage Account</Text>
          <Text style={{color: themeColors.textLight}}>{'>'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}