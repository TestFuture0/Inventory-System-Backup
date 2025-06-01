import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Package, Download, History } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Type for time range
type TimeRange = 'today' | 'weekly' | 'monthly' | 'yearly';

// Helper function for currency abbreviation
const formatCurrencyAbbreviated = (num: number): string => {
  if (num < 1000) {
    return `₹${num.toFixed(2)}`;
  }
  if (num < 100000) { // Up to 99,999
    return `₹${(num / 1000).toFixed(1)}K`;
  }
  // For 1 Lakh (100,000) and above
  return `₹${(num / 100000).toFixed(1)}L`;
};

// Helper function to get display label for time range
const getRangeDisplayLabel = (range: TimeRange): string => {
  switch (range) {
    case 'today': return "Today's Sales";
    case 'weekly': return 'Weekly Revenue';
    case 'monthly': return 'Monthly Revenue';
    case 'yearly': return 'Yearly Revenue';
    default: return 'Revenue';
  }
};

interface ProductFromSupabase {
    id: string;
    name: string;
}
interface SaleItemFromSupabase {
    quantity: number;
    product_id: string;
    products: ProductFromSupabase | null; 
}

interface DashboardStats {
  todayRevenue: number;
  currentRangeRevenue: number;
  totalProducts: number;
  lowStockItems: number;
  revenuePercentChange: number;
  paymentMethodDistribution: {
    Cash: number;
    GPay: number;
    PhonePe: number;
  };
  timeSeriesData: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
  topProducts: {
    id: string;
    name: string;
    quantity: number;
  }[];
}

export default function DashboardScreen() {
  const { userRole } = useAuth();
  const { themeColors, themeMode } = useTheme();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    currentRangeRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
    revenuePercentChange: 0,
    paymentMethodDistribution: {
      Cash: 0,
      GPay: 0,
      PhonePe: 0,
    },
    timeSeriesData: {
      labels: [],
      datasets: [{ data: [] as number[] }],
    },
    topProducts: [],
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('weekly');

  const screenWidth = Dimensions.get('window').width - SPACING.md * 2;
  const chartContentWidthInCard = screenWidth - (SPACING.sm * 2); // Accounts for Card padding
  // const screenContainerPadding = SPACING.md * 2; // Kept for reference if needed elsewhere
  // const pieChartWrapperHorizontalPadding = SPACING.md * 2; // Kept for reference
  
  // const pieChartWrapperContentWidth = Dimensions.get('window').width - screenContainerPadding - pieChartWrapperHorizontalPadding; // No longer directly used for chart/legend width like this
  // const pieChartActualWidth = pieChartWrapperContentWidth * 1.1; // Will be calculated inline or managed by flex
  // const legendActualWidth = pieChartWrapperContentWidth * 0.5; // Will be managed by flex
  // const legendMarginLeft = pieChartWrapperContentWidth * -0.5; // No longer needed

  const fetchDashboardData = useCallback(async (range: TimeRange) => {
    console.log(`Fetching data for range: ${range}`);
    // No early return for userRole here, will be handled in useEffect / render
    try {
      setLoading(true);
      
      const { count: totalProducts, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      if (productsError) throw productsError;

      const { count: lowStockItems, error: lowStockError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_count', 10);
      if (lowStockError) throw lowStockError;
      
      const todayForTodayCard = new Date();
      todayForTodayCard.setHours(0, 0, 0, 0);
      const { data: todaySalesForCard, error: todaySalesError } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', todayForTodayCard.toISOString());
      if (todaySalesError) throw todaySalesError;
      const todayRevenueForCard = todaySalesForCard?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      let startDate = new Date();
      let endDate = new Date();
      const generatedLabels: string[] = [];
      let aggregatedData: number[] = [];
      const now = new Date();
      now.setHours(0,0,0,0);

      switch (range) {
        case 'weekly':
          startDate = new Date(now);          
          startDate.setDate(now.getDate() - now.getDay()); 
          startDate.setHours(0,0,0,0); 
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23,59,59,999);
          for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            generatedLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            aggregatedData.push(0);
          }
          break;
        case 'monthly':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23,59,59,999);
          const firstDayOfMonth = new Date(startDate);
          const lastDayOfMonth = new Date(endDate);
          let weekCounter = 1;
          let currentWeekStart = new Date(firstDayOfMonth);
          while(currentWeekStart <= lastDayOfMonth){
            generatedLabels.push(`W${weekCounter}`);
            aggregatedData.push(0);
            currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            weekCounter++;
          }
          break;
        case 'yearly':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          endDate.setHours(23,59,59,999);
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          for (let i = 0; i < 12; i++) {
            generatedLabels.push(monthNames[i]);
            aggregatedData.push(0);
          }
          break;
      }

      const { data: rangeSales, error: rangeSalesError } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });
      if (rangeSalesError) throw rangeSalesError;
      
      rangeSales?.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        saleDate.setHours(0,0,0,0);
        let index = -1;
        if (range === 'weekly') {
          const weekViewStartDate = new Date(now);
          weekViewStartDate.setDate(now.getDate() - now.getDay());
          weekViewStartDate.setHours(0,0,0,0);
          const diffDays = Math.floor((saleDate.getTime() - weekViewStartDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) index = diffDays;
        } else if (range === 'monthly') {
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          let currentWeekStartForSearch = new Date(firstDay);
          for(let i=0; i<generatedLabels.length; i++){
            let weekEndBoundary = new Date(currentWeekStartForSearch);
            weekEndBoundary.setDate(currentWeekStartForSearch.getDate() + 6);
            weekEndBoundary.setHours(23,59,59,999);
            if(saleDate >= currentWeekStartForSearch && saleDate <= weekEndBoundary){
              index = i;
              break;
            }
            currentWeekStartForSearch.setDate(currentWeekStartForSearch.getDate() + 7);
          }
        } else if (range === 'yearly') {
          index = saleDate.getMonth();
        }
        if (index >= 0 && index < aggregatedData.length) {
          aggregatedData[index] += (sale.total_amount || 0);
        }
      });
      
      const currentRangeTotalRevenue = aggregatedData.reduce((sum, val) => sum + val, 0);
      const revenuePercentChange = 0; 

      const { data: paymentData, error: paymentError } = await supabase
        .from('sales')
        .select('payment_method');
      if (paymentError) throw paymentError;
      const paymentMethodDistribution = { Cash: 0, GPay: 0, PhonePe: 0 };
      paymentData?.forEach(sale => {
        if (paymentMethodDistribution[sale.payment_method as keyof typeof paymentMethodDistribution] !== undefined) {
          paymentMethodDistribution[sale.payment_method as keyof typeof paymentMethodDistribution]++;
        }
      });
      
      const { data: topProductsDataTyped, error: topProductsError } = await supabase
        .from('sale_items')
        .select('quantity, product_id, products (id, name)')
        .order('quantity', { ascending: false })
        .limit(5);
      
      if (topProductsError) {
        console.error("Error fetching top products:", topProductsError);
      }
      
      const topProducts = (topProductsDataTyped as SaleItemFromSupabase[] | null)?.map(item => ({
        id: item.products?.id ?? item.product_id,
        name: item.products?.name ?? 'Product Name Unavailable',
        quantity: item.quantity,
      })).filter(p => p.id) || []; 
      
      setStats({
        todayRevenue: todayRevenueForCard,
        currentRangeRevenue: currentRangeTotalRevenue,
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockItems || 0,
        revenuePercentChange,
        paymentMethodDistribution,
        timeSeriesData: {
          labels: range === 'today' ? [] : generatedLabels,
          datasets: [{ data: range === 'today' ? [] : aggregatedData.map(d => Math.max(0, d)) }],
        },
        topProducts,
      });
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error.message || error);
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useFocusEffect(
    useCallback(() => {
      if (userRole === 'admin') {
        fetchDashboardData(selectedRange);
      } else if (userRole === 'employee') {
        setLoading(false); 
      }
    }, [userRole, selectedRange, fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    if (userRole === 'admin') {
      setRefreshing(true);
      await fetchDashboardData(selectedRange);
      setRefreshing(false);
    }
  }, [selectedRange, fetchDashboardData, userRole]);

  const handleExportData = async () => {
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert("Sharing Not Available", "Sharing functionality is not available on this device/platform.");
      return;
    }

    // 1. Collect Data (already done in stats)

    // 2. Format to CSV
    let csvString = "";

    // Summary Section
    csvString += "Dashboard Summary\n";
    csvString += `Selected Range,"${selectedRange}"\n`;
    csvString += `Today's Revenue,"${stats.todayRevenue}"\n`;
    csvString += `"${getRangeDisplayLabel(selectedRange)}","${stats.currentRangeRevenue}"\n`;
    csvString += `Total Products,"${stats.totalProducts}"\n`;
    csvString += `Low Stock Items,"${stats.lowStockItems}"\n\n`; // Add a blank line for separation

    // Revenue Trend Section
    csvString += "Revenue Trend\n";
    csvString += "Label,Revenue\n";
    stats.timeSeriesData.labels.forEach((label, index) => {
      // Ensure labels with commas are quoted
      csvString += `"${label.replace(/"/g, '""')}","${stats.timeSeriesData.datasets[0].data[index]}"\n`;
    });
    csvString += "\n"; // Add a blank line

    // Top Selling Products Section
    csvString += "Top Selling Products\n";
    csvString += "Rank,Product Name,Quantity Sold\n";
    stats.topProducts.forEach((product, index) => {
      // Ensure product names with commas are quoted
      csvString += `${index + 1},"${product.name.replace(/"/g, '""')}",${product.quantity}\n`;
    });
    csvString += "\n"; // Add a blank line

    // Payment Methods Section
    csvString += "Payment Methods\n";
    csvString += "Method,Count\n";
    for (const [method, count] of Object.entries(stats.paymentMethodDistribution)) {
      csvString += `"${method}",${count}\n`;
    }
    
    console.log("--- CSV DATA ---");
    console.log(csvString);
    // Alert.alert("Data Prepared", "CSV data logged to console. Next steps: save to file and share."); // Optional: Keep for debugging

    const filename = `dashboard_export_${selectedRange}_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.cacheDirectory + filename;
    
    try {
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      console.log('File written to:', fileUri);
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Dashboard Data',
        UTI: 'public.comma-separated-values-text' // For iOS
      });
    } catch (error: any) {
      console.error("Error exporting data:", error);
      Alert.alert("Export Error", "Could not export data: " + error.message);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingTop: Platform.OS === 'android' ? SPACING.md : insets.top + SPACING.sm, 
      paddingBottom: insets.bottom + SPACING.lg, 
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      paddingTop: insets.top,
    },
    loadingText: {
        marginTop: SPACING.md,
        fontSize: FONT_SIZE.md,
        color: themeColors.text,
        fontFamily: 'Inter-Regular',
    },
    accessDeniedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: themeColors.background,
        padding: SPACING.lg,
        paddingTop: insets.top,
    },
    accessDeniedText: {
        fontSize: FONT_SIZE.lg,
        color: themeColors.text,
        fontFamily: 'Inter-SemiBold',
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    title: {
      fontSize: FONT_SIZE.xxl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderColor: themeColors.primary,
        borderWidth: 1,
        borderRadius: BORDER_RADIUS.md,
    },
    exportButtonText: {
        color: themeColors.primary,
        fontFamily: 'Inter-Medium',
        marginLeft: SPACING.xs,
        fontSize: FONT_SIZE.sm,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: SPACING.md,
    },
    statCard: {
      width: '48.5%',
      marginBottom: SPACING.md,
      padding: SPACING.sm,
      backgroundColor: themeColors.surface, 
      borderRadius: BORDER_RADIUS.md,
    },
    statContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statTextInfo: {
      flex: 1,
      marginRight: SPACING.xs,
    },
    statLabel: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginBottom: 4, // Replaced SPACING.xxs
    },
    statValue: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 50, // Replaced BORDER_RADIUS.full
      justifyContent: 'center',
      alignItems: 'center',
    },
    percentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4, // Replaced SPACING.xxs
    },
    percentText: {
      fontSize: FONT_SIZE.xs,
      fontFamily: 'Inter-Medium',
      marginLeft: 4, // Replaced SPACING.xxs
    },
    chartCard: {
      marginBottom: SPACING.lg,
      paddingHorizontal: SPACING.sm, 
      paddingVertical: SPACING.md,
      alignItems: 'stretch', 
      backgroundColor: themeColors.surface, 
      borderRadius: BORDER_RADIUS.md,
    },
    chartLoading: {
      height: 220, 
      justifyContent: 'center',
      alignItems: 'center',
    },
    chartTitle: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.md,
    },
    chart: {
      marginVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.md,
    },
    topProductsCard: {
      marginBottom: SPACING.xl, 
      padding: SPACING.md,
      backgroundColor: themeColors.surface, 
      borderRadius: BORDER_RADIUS.md,
    },
    topProductItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    topProductRank: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Bold',
      color: themeColors.primary,
      width: 24, 
      marginRight: SPACING.sm,
    },
    topProductName: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      flex: 1,
    },
    topProductQuantity: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
    },
    noDataTextContainer: { 
      minHeight: 150,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: SPACING.lg, 
    },
    noDataText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    pieChartWrapper: { 
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around', 
      width: '100%',
      paddingVertical: SPACING.md,
    },
    customLegendContainer: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingLeft: SPACING.sm, 
      flexShrink: 1, 
      flexBasis: '40%', // Adjusted basis for legend
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.xs,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 50, // Replaced BORDER_RADIUS.full
      marginRight: SPACING.sm,
    },
    legendText: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
    },
    timeRangeSelectorContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: themeColors.surface, 
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.xs,
      marginBottom: SPACING.lg,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    timeRangeButton: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.sm,
    },
    timeRangeButtonSelected: {
      backgroundColor: themeColors.primary,
    },
    timeRangeButtonText: {
      fontFamily: 'Inter-Medium',
      fontSize: FONT_SIZE.sm,
      color: themeColors.text,
    },
    timeRangeButtonTextSelected: {
      color: themeColors.onPrimary, 
    },
  });

  const lineChartDataSanitized = {
    labels: stats.timeSeriesData.labels.length > 0 ? stats.timeSeriesData.labels : ["N/A"],
    datasets: stats.timeSeriesData.datasets.length > 0 && stats.timeSeriesData.datasets[0].data.length > 0
              ? stats.timeSeriesData.datasets.map(ds => ({ 
                  ...ds, 
                  data: ds.data.map(d => (isFinite(d) ? Math.max(0, d) : 0)),
                  color: (opacity = 1) => themeColors.primary,
                  strokeWidth: 2 
                }))
              : [{ data: [0], color: (opacity = 1) => themeColors.primary, strokeWidth: 2 }],
  };

  const pieChartColorsList = [themeColors.primary, themeColors.success, themeColors.accent, themeColors.secondary, themeColors.warning];
  const pieChartData = [
    {
      name: 'Cash',
      population: stats.paymentMethodDistribution.Cash,
      color: pieChartColorsList[0],
      legendFontColor: themeColors.text,
      legendFontSize: FONT_SIZE.sm,
    },
    {
      name: 'GPay',
      population: stats.paymentMethodDistribution.GPay,
      color: pieChartColorsList[1],
      legendFontColor: themeColors.text,
      legendFontSize: FONT_SIZE.sm,
    },
    {
      name: 'PhonePe',
      population: stats.paymentMethodDistribution.PhonePe,
      color: pieChartColorsList[2],
      legendFontColor: themeColors.text,
      legendFontSize: FONT_SIZE.sm,
    },
  ];
  const pieChartDataSanitized = pieChartData.filter(item => item.population > 0 && isFinite(item.population));
  const canDisplayPieChart = pieChartDataSanitized.length > 0;

  const chartConfigShared = {
    backgroundGradientFrom: themeColors.surface,
    backgroundGradientTo: themeColors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => themeColors.onSurface, 
    labelColor: (opacity = 1) => themeColors.textLight, 
    strokeWidth: 2,
    barPercentage: 0.8,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: "4",
      strokeWidth: "1",
      stroke: themeColors.primary 
    },
    propsForBackgroundLines: {
      strokeDasharray: "", 
      stroke: themeColors.border, 
    },
    fillShadowGradient: themeColors.primary, 
    fillShadowGradientOpacity: themeMode === 'dark' ? 0.3 : 0.1, 
  };

  const TimeRangeSelector = () => (
    <View style={styles.timeRangeSelectorContainer}>
      {( ['weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            selectedRange === range && styles.timeRangeButtonSelected,
          ]}
          onPress={() => setSelectedRange(range)}
        >
          <Text
            style={[
              styles.timeRangeButtonText,
              selectedRange === range && styles.timeRangeButtonTextSelected,
            ]}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const currentRangeDisplayLabel = getRangeDisplayLabel(selectedRange);
  
  if (!userRole){ 
    return (
        <SafeAreaView style={styles.loadingContainer} edges={['top']}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={styles.loadingText}>Checking authentication...</Text>
        </SafeAreaView>
    );
  }

  if (userRole === 'employee') { // Check for 'employee' role specifically for access denied
    return (
        <SafeAreaView style={styles.accessDeniedContainer} edges={['top']}>
            <AlertTriangle size={48} color={themeColors.warning} />
            <Text style={[styles.accessDeniedText, { marginTop: SPACING.md }]}>
                Access Denied
            </Text>
            <Text style={[styles.noDataText, {textAlign: 'center'}]}>
                You do not have permission to view this dashboard.
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{marginTop: SPACING.lg}}>
                <Text style={{color: themeColors.primary, fontFamily: 'Inter-SemiBold', fontSize: FONT_SIZE.md}}>Go to Home</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
  }
  
  // If not 'employee' and userRole is loaded, assume 'admin' or proceed if userRole is 'admin'
  // The main useEffect ensures fetchDashboardData is only called for 'admin'
  if (userRole === 'admin' && loading && !stats.todayRevenue && !stats.totalProducts) { 
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading dashboard data...</Text>
      </SafeAreaView>
    );
  }
  // If userRole is 'admin' but still loading is false (e.g. data already fetched or error occurred)
  // or if it's an initial render for admin before loading state is properly set by fetchDashboardData,
  // we proceed to render the dashboard. The loading inside charts will handle their specific states.
  if (userRole !== 'admin') {
    // This case should ideally be caught by the 'employee' check or initial !userRole check
    // Adding a fallback to prevent rendering admin content if somehow missed.
    return (
        <SafeAreaView style={styles.loadingContainer} edges={['top']}>
            <Text style={styles.loadingText}>An unexpected error occurred.</Text>
        </SafeAreaView>
    );
}


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={themeColors.primary} 
            colors={[themeColors.primary]} 
            progressBackgroundColor={themeColors.surface}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          {userRole === 'admin' && (
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity style={[styles.exportButton, {marginRight: SPACING.sm}]} onPress={() => router.push('/modal/sales-history')}>
                    <History size={FONT_SIZE.md} color={themeColors.primary} />
                    <Text style={styles.exportButtonText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exportButton} onPress={handleExportData}>
                    <Download size={FONT_SIZE.md} color={themeColors.primary} />
                    <Text style={styles.exportButtonText}>Export</Text>
                </TouchableOpacity>
            </View>
          )}
        </View>

        <TimeRangeSelector />

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Today's Revenue</Text>
                <Text style={styles.statValue}>{formatCurrencyAbbreviated(stats.todayRevenue)}</Text>
              </View>
              <View style={[styles.iconContainer, {backgroundColor: themeMode === 'dark' ? themeColors.success + '33' : themeColors.successLight}]}>
                <TrendingUp color={themeColors.success} size={20} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>{currentRangeDisplayLabel}</Text>
                <Text style={styles.statValue}>{formatCurrencyAbbreviated(stats.currentRangeRevenue)}</Text>
              </View>
              <View style={[styles.iconContainer, {backgroundColor: themeMode === 'dark' ? themeColors.secondary + '33' : themeColors.secondaryLight}]}>
                <Calendar color={themeColors.secondary} size={20} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Total Products</Text>
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
              </View>
              <View style={[styles.iconContainer, {backgroundColor: themeMode === 'dark' ? themeColors.primary + '33' : themeColors.primaryLight}]}>
                <Package color={themeColors.primary} size={20} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Low Stock Items</Text>
                <Text style={styles.statValue}>{stats.lowStockItems}</Text>
              </View>
              <View style={[styles.iconContainer, {backgroundColor: themeMode === 'dark' ? themeColors.warning + '33' : themeColors.warningLight }]}>
                <AlertTriangle color={themeColors.warning} size={20} />
              </View>
            </View>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>{currentRangeDisplayLabel}</Text>
          {loading ? 
            <ActivityIndicator size="large" color={themeColors.primary} style={styles.chartLoading} />
           : lineChartDataSanitized.datasets[0].data.length > 0 && lineChartDataSanitized.datasets[0].data.some(d => d > 0) ? (
            <LineChart
              data={lineChartDataSanitized}
              width={screenWidth - (SPACING.sm * 2)} 
              height={220}
              chartConfig={chartConfigShared}
              bezier
              style={styles.chart}
              yAxisLabel="₹"
              yAxisSuffix=""
              fromZero={true}
              segments={Math.min(5, Math.max(2, Math.ceil(Math.max(...lineChartDataSanitized.datasets[0].data) / 500)))} 
              formatYLabel={(yLabel) => parseFloat(yLabel).toFixed(0)}
              verticalLabelRotation={selectedRange === 'monthly' || selectedRange === 'yearly' ? 30 : 0}
              hidePointsAtIndex={[]}
            />
          ) : (
            <View style={styles.noDataTextContainer}> 
            <Text style={styles.noDataText}>
                No revenue data to display for this period.
            </Text>
            </View>
          )}
        </Card>

        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment Methods</Text>
          {loading && !canDisplayPieChart ? 
            <ActivityIndicator size="large" color={themeColors.primary} style={styles.chartLoading} />
           : canDisplayPieChart ? (
            <View style={styles.pieChartWrapper}> 
            <PieChart
              data={pieChartDataSanitized}
                width={chartContentWidthInCard * 0.57} // Adjusted PieChart width based on card content width
                height={200} 
                chartConfig={chartConfigShared} 
              accessor="population"
              backgroundColor="transparent"
                paddingLeft={SPACING.xxl.toString()} // Incremented padding to xxl to shift chart further right
              absolute
                hasLegend={false}
              />
              <View style={styles.customLegendContainer}>
                {pieChartDataSanitized.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{`${item.name}: ${item.population}`}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.noDataTextContainer}> 
                <Text style={styles.noDataText}>No payment data available.</Text>
            </View>
          )}
        </Card>

        <Card style={styles.topProductsCard}>
          <Text style={styles.chartTitle}>Top Selling Products</Text>
          {loading && stats.topProducts.length === 0 ?
             <ActivityIndicator size="small" color={themeColors.primary} style={{marginVertical: SPACING.lg}}/>
           : stats.topProducts.length > 0 ? (
            stats.topProducts.map((product, index) => (
              <View 
                key={product.id ? `${product.id}-${index}`: `product-${index}`} 
                style={[
                  styles.topProductItem, 
                  index === stats.topProducts.length - 1 && { borderBottomWidth: 0 } 
                ]}
              >
                <Text style={styles.topProductRank}>{index + 1}.</Text>
                <Text style={styles.topProductName} numberOfLines={1} ellipsizeMode="tail">{product.name}</Text>
                <Text style={styles.topProductQuantity}>{product.quantity} sold</Text>
              </View>
            ))
          ) : (
            <View style={styles.noDataTextContainer}> 
                <Text style={[styles.noDataText, {paddingVertical: SPACING.md}]}>No sales data to show top products.</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

