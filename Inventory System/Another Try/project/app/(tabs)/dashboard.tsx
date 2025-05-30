import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { TrendingUp, TrendingDown, AlertTriangle, Download, Calendar, Package } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

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
  const screenWidth = Dimensions.get('window').width - 32;
  const screenContainerPadding = 16 * 2; // For styles.scrollContent.padding
  const pieChartWrapperHorizontalPadding = 16 * 2; // For styles.pieChartWrapper.paddingHorizontal
  const [selectedRange, setSelectedRange] = useState<TimeRange>('weekly'); // State for selected range

  // Calculate the net width available within the pieChartWrapper for the chart and legend
  const pieChartWrapperContentWidth = Dimensions.get('window').width - screenContainerPadding - pieChartWrapperHorizontalPadding;
  
  // Adjusted widths for a smaller pie chart and more space for legend/gap
  const pieChartActualWidth = pieChartWrapperContentWidth * 1.2; // 50% for the pie chart
  const legendActualWidth = pieChartWrapperContentWidth * 0.4; // 40% for the legend
  const legendMarginLeft = pieChartWrapperContentWidth * -0.55; // 10% for the gap

  // Only admin should access this screen
  useEffect(() => {
    if (userRole !== 'admin') {
      router.replace('/(tabs)');
    } else {
      fetchDashboardData(selectedRange);
    }
  }, [userRole, selectedRange]);

  const fetchDashboardData = async (range: TimeRange) => {
    console.log(`Fetching data for range: ${range}`);
    try {
      setLoading(true);
      
      // Common fetches (total products, low stock) - these are independent of range
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });
      const { count: lowStockItems } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_count', 10);
      
      // --- Today's Revenue (always fetched for its specific card) ---
      const todayForTodayCard = new Date();
      todayForTodayCard.setHours(0, 0, 0, 0);
      const { data: todaySalesForCard } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', todayForTodayCard.toISOString());
      const todayRevenueForCard = todaySalesForCard?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;

      // --- Date Range Calculation for Chart and currentRangeRevenue ---
      let startDate = new Date();
      let endDate = new Date();
      const generatedLabels: string[] = [];
      let aggregatedData: number[] = [];
      // let dataGranularity: 'hour' | 'day' | 'week' | 'month' = 'day'; // Not strictly needed now

      const now = new Date();
      now.setHours(0,0,0,0); // Normalize now to the start of today for consistent calculations

      switch (range) {
        case 'today':
          startDate = new Date(now); // Start of today
          endDate = new Date(now); 
          endDate.setHours(23, 59, 59, 999); // End of today
          // No labels/data needed for chart if we hide it for 'today'
          break;
        case 'weekly':
          startDate = new Date(now);          
          startDate.setDate(now.getDate() - now.getDay()); // Set to Sunday of the current week
          startDate.setHours(0,0,0,0); // Ensure it's the beginning of Sunday
          endDate = new Date(startDate); // End of the week (Saturday night)
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
          // Generate labels for weeks of the month
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

      console.log(`[DEBUG] Range: ${range}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

      const { data: rangeSales } = await supabase
        .from('sales')
        .select('created_at, total_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });
      
      console.log(`[DEBUG] Fetched ${rangeSales?.length || 0} sales for range ${range}`);

      // Process rangeSales into aggregatedData
      rangeSales?.forEach(sale => {
        const saleDate = new Date(sale.created_at);
        saleDate.setHours(0,0,0,0); // Normalize saleDate for comparisons
        let index = -1;

        if (range === 'weekly') {
          const weekViewStartDate = new Date(now); // Start from current week's Sunday
          weekViewStartDate.setDate(now.getDate() - now.getDay());
          weekViewStartDate.setHours(0,0,0,0);

          const diffDays = Math.floor((saleDate.getTime() - weekViewStartDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays < 7) {
            index = diffDays;
          }
        } else if (range === 'monthly') {
          // Determine which week of the month the sale falls into
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          const dayInMonth = saleDate.getDate();
          // weekIndex = Math.floor((dayInMonth - 1) / 7);
          //This is slightly more complex if weeks are W1, W2, W3, W4, W5
          // Let's find which generatedLabel (W1, W2...) it belongs to
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
        // 'today' range no longer generates chart data, so no aggregation needed here for it

        if (index >= 0 && index < aggregatedData.length) {
          aggregatedData[index] += sale.total_amount;
        }
      });
      
      const currentRangeTotalRevenue = aggregatedData.reduce((sum, val) => sum + val, 0);

      // --- Revenue Percent Change (Placeholder - needs proper previous period logic) ---
      // This is complex and needs to calculate the *previous* equivalent period accurately.
      // For now, let's set a placeholder or simplify it drastically.
      const revenuePercentChange = 0; // Placeholder for now.

      // --- Payment Method Distribution (can remain as is, fetched across all time for simplicity) ---
      const { data: paymentData } = await supabase
        .from('sales')
        .select('payment_method');
      const paymentMethodDistribution = { Cash: 0, GPay: 0, PhonePe: 0 };
      paymentData?.forEach(sale => {
        if (paymentMethodDistribution[sale.payment_method as keyof typeof paymentMethodDistribution] !== undefined) {
          paymentMethodDistribution[sale.payment_method as keyof typeof paymentMethodDistribution]++;
        }
      });
      
      // --- Top Products (can remain as is, fetched across all time or a fixed recent period) ---
      const { data: topProductsData } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product_id,
          products (
            id,
            name
          )
        `)
        .order('quantity', { ascending: false })
        .limit(5);
      
      const topProducts = topProductsData?.map(item => ({
        id: item.product_id,
        name: item.products?.[0]?.name ?? 'Product Unavailable',
        quantity: item.quantity,
      })) || [];
      
      setStats({
        todayRevenue: todayRevenueForCard,
        currentRangeRevenue: currentRangeTotalRevenue,
        totalProducts: totalProducts || 0,
        lowStockItems: lowStockItems || 0,
        revenuePercentChange,
        paymentMethodDistribution,
        timeSeriesData: {
          labels: range === 'today' ? [] : generatedLabels,
          datasets: [{ data: range === 'today' ? [] : aggregatedData }],
        },
        topProducts,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(selectedRange);
    setRefreshing(false);
  };

  const lineChartDataSanitized = {
    labels: stats.timeSeriesData.labels.length > 0 ? stats.timeSeriesData.labels : ["No Data"],
    datasets: stats.timeSeriesData.datasets.length > 0 && stats.timeSeriesData.datasets[0].data.length > 0
              ? stats.timeSeriesData.datasets.map(ds => ({ ...ds, data: ds.data.map(d => (isFinite(d) ? d : 0)) }))
              : [{ data: [0] as number[] }],
  };

  const pieChartData = [
    {
      name: 'Cash',
      population: stats.paymentMethodDistribution.Cash,
      color: COLORS.primary,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: 'GPay',
      population: stats.paymentMethodDistribution.GPay,
      color: COLORS.success,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
    {
      name: 'PhonePe',
      population: stats.paymentMethodDistribution.PhonePe,
      color: COLORS.accent,
      legendFontColor: COLORS.text,
      legendFontSize: 12,
    },
  ];
  const pieChartDataSanitized = pieChartData.filter(item => item.population > 0 && isFinite(item.population));
  const canDisplayPieChart = pieChartDataSanitized.length > 0 && pieChartDataSanitized.some(item => item.population > 0);

  const chartConfig = {
    backgroundGradientFrom: COLORS.white,
    backgroundGradientTo: COLORS.white,
    color: (opacity = 1) => `rgba(4, 102, 200, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const TimeRangeSelector = () => (
    <View style={styles.timeRangeSelectorContainer}>
      {(['today', 'weekly', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          {/* <TouchableOpacity style={styles.exportButton}>
            <Download size={20} color={COLORS.primary} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity> */}
        </View>

        <TimeRangeSelector />

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Today's Revenue</Text>
                <Text style={styles.statValue}>{formatCurrencyAbbreviated(stats.todayRevenue)}</Text>
              </View>
              <View style={styles.iconContainer}>
                <TrendingUp color={COLORS.primary} size={24} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>{currentRangeDisplayLabel}</Text>
                <Text style={styles.statValue}>{formatCurrencyAbbreviated(stats.currentRangeRevenue)}</Text>
                {selectedRange === 'weekly' && (
                <View style={styles.percentContainer}>
                  {stats.revenuePercentChange >= 0 ? (
                    <>
                      <TrendingUp color={COLORS.success} size={16} />
                      <Text style={styles.percentUp}>
                        {Math.abs(stats.revenuePercentChange).toFixed(1)}%
                      </Text>
                    </>
                  ) : (
                    <>
                      <TrendingDown color={COLORS.error} size={16} />
                      <Text style={styles.percentDown}>
                        {Math.abs(stats.revenuePercentChange).toFixed(1)}%
                      </Text>
                    </>
                  )}
                </View>
                )}
              </View>
              <View style={styles.iconContainer}>
                <Calendar color={COLORS.primary} size={24} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Total Products</Text>
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
              </View>
              <View style={styles.iconContainer}>
                <Package color={COLORS.primary} size={24} />
              </View>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <View style={styles.statTextInfo}>
                <Text style={styles.statLabel}>Low Stock Items</Text>
                <Text style={styles.statValue}>{stats.lowStockItems}</Text>
              </View>
              <View style={[styles.iconContainer, { backgroundColor: COLORS.warningLight }]}>
                <AlertTriangle color={COLORS.warning} size={24} />
              </View>
            </View>
          </Card>
        </View>

        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>{currentRangeDisplayLabel}</Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.chartLoading} />
          ) : selectedRange !== 'today' && lineChartDataSanitized.datasets[0].data.length > 0 && lineChartDataSanitized.datasets[0].data.some(d => d !== 0) ? (
            <LineChart
              data={lineChartDataSanitized}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              yAxisLabel="₹"
              yAxisSuffix=""
              fromZero={true}
              segments={4}
              formatYLabel={(yLabel) => parseFloat(yLabel).toFixed(0)}
            />
          ) : (
            <Text style={styles.noDataText}>
              {selectedRange === 'today' ? 'Revenue total shown in card above' : 'No revenue data to display'}
            </Text>
          )}
        </Card>

        <Card style={styles.chartCard}>
          <Text style={styles.chartTitle}>Payment Methods</Text>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.chartLoading} />
          ) : canDisplayPieChart ? (
            <View style={styles.pieChartWrapper}> 
            <PieChart
              data={pieChartDataSanitized}
                width={pieChartActualWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
                paddingLeft="0"
              absolute
                hasLegend={false}
              />
              <View style={[styles.customLegendContainer, { width: legendActualWidth, marginLeft: legendMarginLeft }]}>
                {pieChartDataSanitized.map((item, index) => (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{`${item.population} ${item.name}`}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>No payment data available</Text>
          )}
        </Card>

        <Card style={styles.topProductsCard}>
          <Text style={styles.chartTitle}>Top Selling Products</Text>
          {stats.topProducts.length > 0 ? (
            stats.topProducts.map((product, index) => (
              <View key={product.id ? `${product.id}-${index}` : index} style={styles.topProductItem}>
                <Text style={styles.topProductRank}>{index + 1}.</Text>
                <Text style={styles.topProductName}>{product.name}</Text>
                <Text style={styles.topProductQuantity}>{product.quantity} units</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No sales data available</Text>
          )}
        </Card>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  exportText: {
    marginLeft: 6,
    color: COLORS.primary,
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTextInfo: {
    flex: 1,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  percentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  percentUp: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: COLORS.success,
    marginLeft: 4,
  },
  percentDown: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: COLORS.error,
    marginLeft: 4,
  },
  chartCard: {
    marginBottom: 16,
    paddingHorizontal: 0,
    paddingBottom: 0,
    alignItems: 'center',
  },
  chartLoading: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 12,
  },
  topProductsCard: {
    marginBottom: 24,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  topProductRank: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary,
    width: 30,
  },
  topProductName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
    flex: 1,
  },
  topProductQuantity: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.textLight,
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 12,
    height: 220,
    lineHeight: 220,
  },
  pieChartWrapper: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    paddingHorizontal: 16, 
  },
  customLegendContainer: {
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.text,
  },
  timeRangeSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingVertical: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  timeRangeButtonSelected: {
    backgroundColor: COLORS.primary,
  },
  timeRangeButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: COLORS.text,
  },
  timeRangeButtonTextSelected: {
    color: COLORS.white,
  },
});