import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { Card } from '@/components/common/Card';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { ChevronLeft, ListFilter } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface SaleItemForInvoice {
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_sale: number;
  subtotal: number;
}

interface SaleRecord {
  id: string;
  created_at: string;
  total_amount: number;
  payment_method: string;
  customer_name: string | null;
  sale_items: SaleItemForInvoice[]; // We will populate this
}

export default function SalesHistoryScreen() {
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const { userRole } = useAuth();

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesHistory = useCallback(async () => {
    if (userRole !== 'admin') {
        Alert.alert("Access Denied", "You do not have permission to view sales history.");
        router.canGoBack() ? router.back() : router.replace('/');
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id,
          created_at,
          total_amount,
          payment_method,
          customer_name,
          sale_items (
            quantity,
            price,
            products (id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const formattedSales = salesData?.map(sale => ({
        id: sale.id,
        created_at: sale.created_at,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        customer_name: sale.customer_name,
        sale_items: sale.sale_items.map((item: any) => ({
            product_id: item.products.id,
            product_name: item.products.name,
            quantity: item.quantity,
            price_at_sale: item.price,
            subtotal: item.quantity * item.price,
        })),
      })) || [];
      
      setSales(formattedSales);

    } catch (e: any) {
      console.error("Error fetching sales history:", e);
      setError(e.message || "Failed to fetch sales history.");
      Alert.alert("Error", e.message || "Failed to fetch sales history.");
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  useEffect(() => {
    fetchSalesHistory();
  }, [fetchSalesHistory]);

  const handleSalePress = (sale: SaleRecord) => {
    router.push({
      pathname: '/modal/invoice',
      params: {
        saleId: sale.id,
        saleDate: sale.created_at,
        totalAmount: sale.total_amount.toString(),
        paymentMethod: sale.payment_method,
        items: JSON.stringify(sale.sale_items),
        customerName: sale.customer_name || 'Walk-in Customer',
        sourceScreen: 'salesHistory'
      },
    });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: insets.top + SPACING.sm,
      paddingBottom: SPACING.md,
      backgroundColor: themeColors.surface,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    backButton: {
      padding: SPACING.xs,
      marginRight: SPACING.sm,
    },
    headerTitle: {
      fontSize: FONT_SIZE.xl,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      padding: SPACING.md,
    },
    saleCard: {
      padding: SPACING.md,
      marginBottom: SPACING.md,
    },
    saleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.xs,
    },
    saleLabel: {
      fontFamily: 'Inter-Regular',
      fontSize: FONT_SIZE.sm,
      color: themeColors.textLight,
    },
    saleValue: {
      fontFamily: 'Inter-Medium',
      fontSize: FONT_SIZE.sm,
      color: themeColors.text,
    },
    saleTotal: {
      fontFamily: 'Inter-Bold',
      fontSize: FONT_SIZE.md,
      color: themeColors.primary,
    },
    emptyText: {
      textAlign: 'center',
      marginTop: SPACING.xl,
      fontFamily: 'Inter-Regular',
      fontSize: FONT_SIZE.md,
      color: themeColors.textLight,
    }
  });

  if (userRole === null) { // Still checking auth
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }
  
  if (userRole !== 'admin') { // Should be handled by effect, but as a safeguard
      return (
          <SafeAreaView style={styles.loadingContainer} edges={['top']}>
              <Text style={{color: themeColors.error}}>Access Denied.</Text>
          </SafeAreaView>
      )
  }

  const renderSaleItem = ({ item }: { item: SaleRecord }) => (
    <TouchableOpacity onPress={() => handleSalePress(item)}>
      <Card style={styles.saleCard}>
        <View style={styles.saleRow}>
          <Text style={styles.saleLabel}>Invoice ID:</Text>
          <Text style={styles.saleValue}>{item.id.substring(0, 8)}</Text>
        </View>
        <View style={styles.saleRow}>
          <Text style={styles.saleLabel}>Date:</Text>
          <Text style={styles.saleValue}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <View style={styles.saleRow}>
          <Text style={styles.saleLabel}>Customer:</Text>
          <Text style={styles.saleValue}>{item.customer_name || 'Walk-in'}</Text>
        </View>
        <View style={styles.saleRow}>
          <Text style={styles.saleLabel}>Payment:</Text>
          <Text style={styles.saleValue}>{item.payment_method}</Text>
        </View>
        <View style={[styles.saleRow, {marginTop: SPACING.sm}]}>
          <Text style={[styles.saleLabel, {fontSize: FONT_SIZE.md}]}>Total:</Text>
          <Text style={styles.saleTotal}>₹{item.total_amount.toFixed(2)}</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sales History</Text>
        {/* TODO: Add filter button/icon here if needed */}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={{ marginTop: SPACING.sm, color: themeColors.text }}>Loading sales...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: themeColors.error, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : sales.length === 0 ? (
         <Text style={styles.emptyText}>No sales records found.</Text>
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSaleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contentContainer}
        />
      )}
    </SafeAreaView>
  );
} 