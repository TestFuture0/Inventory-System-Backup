import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, TrendingUp, ShoppingCart, Package } from 'lucide-react-native';

interface Stats {
  totalProducts: number;
  lowStockItems: number;
  todaySales: number;
  todayRevenue: number;
}

export default function HomeScreen() {
  const { user, userRole } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    lowStockItems: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
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
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
              <Package color={COLORS.primary} size={24} />
              <Text style={styles.statValue}>{stats.totalProducts}</Text>
              <Text style={styles.statLabel}>Total Products</Text>
            </Card>

            <Card style={styles.statCard}>
              <AlertTriangle color={COLORS.warning} size={24} />
              <Text style={styles.statValue}>{stats.lowStockItems}</Text>
              <Text style={styles.statLabel}>Low Stock Items</Text>
            </Card>

            <Card style={styles.statCard}>
              <ShoppingCart color={COLORS.success} size={24} />
              <Text style={styles.statValue}>{stats.todaySales}</Text>
              <Text style={styles.statLabel}>Today's Sales</Text>
            </Card>

            <Card style={styles.statCard}>
              <TrendingUp color={COLORS.accent} size={24} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  roleText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 12,
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.error,
  },
  normalText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.text,
  },
});