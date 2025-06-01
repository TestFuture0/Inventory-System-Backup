import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, TrendingUp, ShoppingCart, Package } from 'lucide-react-native';
import { SPACING, FONT_SIZE } from '@/constants/theme';
import { useFocusEffect } from 'expo-router';

interface Stats {
  totalProducts: number;
  lowStockItems: number;
  todaySales: number;
  todayRevenue: number;
}

export default function HomeScreen() {
  const { user, userRole } = useAuth();
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockItems: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      
      // Get low stock items
      const { count: lowStockItems } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_count', 10);
      
      // Get today's sales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count: todaySales } = await supabase
        .from('sales')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // Get today's revenue
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today.toISOString());
      
      const todayRevenue = salesData?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      
      setStats({
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockItems || 0,
        todaySales: todaySales || 0,
        todayRevenue: todayRevenue,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('Home screen focused, fetching stats...');
      fetchStats();

      return () => {
        console.log('Home screen unfocused');
      };
    }, [fetchStats])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, [fetchStats]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingBottom: insets.bottom + SPACING.lg,
    },
    header: {
      marginBottom: SPACING.lg,
    },
    welcomeText: {
      fontSize: FONT_SIZE.xxl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    roleText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginTop: SPACING.xs,
    },
    sectionTitle: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.md,
    },
    statsContainer: {
      marginBottom: SPACING.lg,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    statCard: {
      width: '48%',
      alignItems: 'center',
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    statValue: {
      fontSize: FONT_SIZE.xl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
      marginTop: SPACING.sm,
    },
    statLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginTop: SPACING.xs,
    },
    actionsContainer: {
      marginBottom: SPACING.lg,
    },
    cardTitle: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.sm,
    },
    alertText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.error,
      lineHeight: FONT_SIZE.sm * 1.5,
    },
    normalText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
      lineHeight: FONT_SIZE.sm * 1.5,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeColors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}
          </Text>
          <Text style={styles.roleText}>
            {userRole === 'admin' ? 'Administrator' : 'Employee'}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Package color={themeColors.primary} size={24} />
              <Text style={styles.statValue}>{stats.totalProducts}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </Card>

            <Card style={styles.statCard}>
              <AlertTriangle color={themeColors.warning} size={24} />
              <Text style={styles.statValue}>{stats.lowStockItems}</Text>
              <Text style={styles.statLabel}>Low Stock Items</Text>
            </Card>

            <Card style={styles.statCard}>
              <ShoppingCart color={themeColors.success} size={24} />
              <Text style={styles.statValue}>{stats.todaySales}</Text>
              <Text style={styles.statLabel}>Today's Sales</Text>
            </Card>

            <Card style={styles.statCard}>
              <TrendingUp color={themeColors.accent} size={24} />
              <Text style={styles.statValue}>₹{stats.todayRevenue.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Today's Revenue</Text>
            </Card>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Card>
            <Text style={styles.cardTitle}>Low Stock Alerts</Text>
            {stats.lowStockItems > 0 ? (
              <Text style={styles.alertText}>
                {stats.lowStockItems} items are running low on stock.
                Check the inventory to restock.
              </Text>
            ) : (
              <Text style={styles.normalText}>
                All items have sufficient stock.
              </Text>
            )}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Today's Performance</Text>
            <Text style={styles.normalText}>
              {stats.todaySales} sales recorded today with a total revenue of ₹{stats.todayRevenue.toFixed(2)}.
            </Text>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}