import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, ActivityIndicator, Pressable, Modal, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Plus, Search, Filter, Package, AlertTriangle, X, CheckCircle } from 'lucide-react-native';
import debounce from 'lodash.debounce';
import { useTheme } from '@/context/ThemeContext';
import { useFocusEffect } from 'expo-router';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_count: number;
  description: string;
  sku: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

interface Filters {
  lowStock: boolean;
  category: string | null;
  // Add more filter options here
}

export default function InventoryScreen() {
  const { userRole } = useAuth();
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Filters>({ lowStock: false, category: null });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      if (data) {
        setProducts(data);
        applyFilters(searchQuery, activeFilters, data);

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
        setAvailableCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilters]);

  useFocusEffect(
    useCallback(() => {
      console.log('Inventory screen focused, fetching products...');
      fetchProducts();

      return () => {
        // Optional: any cleanup actions when the screen goes out of focus
        console.log('Inventory screen unfocused');
      };
    }, [fetchProducts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const debouncedSearch = useCallback(debounce((text: string, currentFilters: Filters, baseProducts: Product[]) => {
    applyFilters(text, currentFilters, baseProducts);
  }, 300), []);

  const applyFilters = (text: string, currentFilters: Filters, baseProducts: Product[]) => {
    let tempFiltered = [...baseProducts];

    if (text.trim()) {
      const lowerCaseQuery = text.toLowerCase();
      tempFiltered = tempFiltered.filter(
        (product) =>
          product.name.toLowerCase().includes(lowerCaseQuery) ||
          product.category.toLowerCase().includes(lowerCaseQuery) ||
          (product.sku && product.sku.toLowerCase().includes(lowerCaseQuery)) ||
          (product.description && product.description.toLowerCase().includes(lowerCaseQuery))
      );
    }

    if (currentFilters.lowStock) {
      tempFiltered = tempFiltered.filter(product => product.stock_count < 10);
    }
    if (currentFilters.category) {
      tempFiltered = tempFiltered.filter(product => product.category === currentFilters.category);
    }
    
    setFilteredProducts(tempFiltered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text, activeFilters, products);
  };

  const handleApplyFilters = (newFilters: Filters) => {
    setActiveFilters(newFilters);
    applyFilters(searchQuery, newFilters, products);
    setIsFilterModalVisible(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = { lowStock: false, category: null };
    setActiveFilters(clearedFilters);
    applyFilters(searchQuery, clearedFilters, products);
  };

  const handleAddProduct = () => {
    if (userRole === 'admin') {
      router.push('/modal/add-product');
    } else {
      alert('Only administrators can add products');
    }
  };

  const handleProductPress = (productId: string) => {
    router.push(`/modal/product-details?id=${productId}`);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    safeAreaContent: {
      flex: 1,
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingLeft: insets.left,
      paddingRight: insets.right,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.sm,
    },
    title: {
      fontSize: FONT_SIZE.xxl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    addButton: {
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.md,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      paddingHorizontal: SPACING.md,
      height: 48,
    },
    searchIcon: {
      marginRight: SPACING.sm,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
      fontSize: FONT_SIZE.md,
      paddingRight: SPACING.sm,
    },
    clearSearchButton: {
      padding: SPACING.xs,
    },
    filterButton: {
      marginLeft: SPACING.sm,
      padding: SPACING.sm + 2,
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    productCardPressable: {
      marginBottom: SPACING.md,
    },
    productCardInner: {
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.lg,
    },
    productHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.sm,
    },
    productName: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      flexShrink: 1,
    },
    lowStockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.errorContainer,
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: BORDER_RADIUS.sm,
      marginLeft: SPACING.sm,
    },
    lowStockText: {
      color: themeColors.onErrorContainer,
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Medium',
      marginLeft: SPACING.xs,
    },
    productDetails: {},
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: SPACING.xs,
    },
    detailLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
    },
    detailValue: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
    },
    lowStockValue: {
      color: themeColors.error,
      fontFamily: 'Inter-Bold',
    },
    listContent: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.lg + 56 + (insets.bottom === 0 ? SPACING.md : 0),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
      marginTop: -SPACING.xxl,
    },
    emptyText: {
      marginTop: SPACING.md,
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-Medium',
      color: themeColors.textLight,
      textAlign: 'center',
    },
    emptyAddButton: {
      marginTop: SPACING.lg,
    },
    fabButton: {
      position: 'absolute',
      right: SPACING.lg,
      bottom: SPACING.lg + (insets.bottom > 0 ? insets.bottom : SPACING.sm),
      backgroundColor: themeColors.primary,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: themeColors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
      backgroundColor: themeColors.surface,
      padding: SPACING.lg,
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderTopRightRadius: BORDER_RADIUS.lg,
      paddingBottom: insets.bottom + SPACING.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    modalTitle: {
      fontSize: FONT_SIZE.xl,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    filterOptionContainer: {
      marginBottom: SPACING.md,
    },
    filterLabel: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      marginBottom: SPACING.sm,
    },
    filterButtonOption: {
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: BORDER_RADIUS.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      marginBottom: SPACING.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    filterButtonOptionSelected: {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    },
    filterButtonText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
    },
    filterButtonTextSelected: {
      color: themeColors.onPrimary,
      fontFamily: 'Inter-Medium',
    },
    categoryScrollView: {
      maxHeight: 150,
    },
    applyButton: {
      marginTop: SPACING.md,
    },
  });

  const renderProductItem = ({ item }: { item: Product }) => (
    <Pressable
      onPress={() => handleProductPress(item.id)}
      style={({ pressed }) => [
        styles.productCardPressable,
        {
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Card style={styles.productCardInner}>
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          {item.stock_count < 10 && (
            <View style={styles.lowStockBadge}>
              <AlertTriangle size={FONT_SIZE.sm} color={themeColors.onErrorContainer} />
              <Text style={styles.lowStockText}>Low Stock</Text>
            </View>
          )}
        </View>
        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category:</Text>
            <Text style={styles.detailValue}>{item.category}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Price:</Text>
            <Text style={styles.detailValue}>₹{item.price.toFixed(2)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock:</Text>
            <Text
              style={[
                styles.detailValue,
                item.stock_count < 10 && styles.lowStockValue,
              ]}
            >
              {item.stock_count} units
            </Text>
          </View>
          {item.sku && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU:</Text>
              <Text style={styles.detailValue}>{item.sku}</Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );

  if (loading && products.length === 0) {
    return (
      <SafeAreaView style={[styles.loadingContainer, {paddingTop: insets.top, paddingBottom: insets.bottom}]} edges={[]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.safeAreaContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Inventory</Text>
          {userRole === 'admin' && (
            <Button
              title="Add New"
              onPress={handleAddProduct}
              variant="primary"
              icon={<Plus size={18} color={themeColors.onPrimary} />}
              style={styles.addButton}
              textStyle={{ fontSize: FONT_SIZE.sm }}
            />
          )}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={themeColors.textLight} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products, category..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholderTextColor={themeColors.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); debouncedSearch('', activeFilters, products); }} style={styles.clearSearchButton}>
                <X size={FONT_SIZE.lg} color={themeColors.textLight} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setIsFilterModalVisible(true)}>
            <Filter size={20} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        {filteredProducts.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color={themeColors.textLight} />
            <Text style={styles.emptyText}>
              {products.length === 0 
                ? "No products yet. Add your first product!" 
                : searchQuery || activeFilters.lowStock || activeFilters.category
                ? "No products match your search or filter criteria."
                : "Something went wrong or no products available."}
            </Text>
            {products.length === 0 && userRole ==='admin' && (
              <Button title="+ Add New Product" onPress={handleAddProduct} style={styles.emptyAddButton} />
            )}
            {(searchQuery || activeFilters.lowStock || activeFilters.category) && products.length > 0 && (
              <Button title="Clear Filters / Search" onPress={() => { setSearchQuery(''); handleClearFilters(); }} style={styles.emptyAddButton} />
            )}
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={themeColors.primary}
                colors={[themeColors.primary]}
                progressBackgroundColor={themeColors.surface}
              />
            }
            ListFooterComponent={loading && products.length > 0 ? <ActivityIndicator style={{ marginVertical: SPACING.md }} size="small" color={themeColors.primary} /> : null}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Package size={64} color={themeColors.textLight} />
                  <Text style={styles.emptyText}>
                    {products.length === 0 
                      ? "No products yet. Add your first product!" 
                      : searchQuery || activeFilters.lowStock || activeFilters.category
                      ? "No products match your search or filter criteria."
                      : "Something went wrong or no products available."}
                  </Text>
                  {products.length === 0 && userRole ==='admin' && (
                    <Button title="+ Add New Product" onPress={handleAddProduct} style={styles.emptyAddButton} />
                  )}
                  {(searchQuery || activeFilters.lowStock || activeFilters.category) && products.length > 0 && (
                    <Button title="Clear Filters / Search" onPress={() => { setSearchQuery(''); handleClearFilters(); }} style={styles.emptyAddButton} />
                  )}
                </View>
              ) : null
            }
          />
        )}

        {userRole === 'admin' && (
          <TouchableOpacity style={styles.fabButton} onPress={handleAddProduct} activeOpacity={0.8}>
            <Plus size={28} color={themeColors.onPrimary} />
          </TouchableOpacity>
        )}

        <Modal
          animationType="slide"
          transparent={true}
          visible={isFilterModalVisible}
          onRequestClose={() => {
            setIsFilterModalVisible(!isFilterModalVisible);
          }}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Products</Text>
                <TouchableOpacity onPress={() => setIsFilterModalVisible(false)}>
                  <X size={24} color={themeColors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.filterOptionContainer}>
                  <Text style={styles.filterLabel}>Stock Status</Text>
                  <TouchableOpacity 
                    style={[
                      styles.filterButtonOption,
                      activeFilters.lowStock && styles.filterButtonOptionSelected
                    ]}
                    onPress={() => handleApplyFilters({...activeFilters, lowStock: !activeFilters.lowStock})}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      activeFilters.lowStock && styles.filterButtonTextSelected
                    ]}>Low Stock (less than 10 units)</Text>
                    {activeFilters.lowStock && <CheckCircle size={FONT_SIZE.md} color={themeColors.onPrimary}/>}
                  </TouchableOpacity>
                </View>

                <View style={styles.filterOptionContainer}>
                  <Text style={styles.filterLabel}>Category</Text>
                  <ScrollView style={styles.categoryScrollView} nestedScrollEnabled={true}>
                    <TouchableOpacity 
                      style={[
                        styles.filterButtonOption,
                        !activeFilters.category && styles.filterButtonOptionSelected
                      ]}
                      onPress={() => handleApplyFilters({...activeFilters, category: null})}
                    >
                      <Text style={[
                        styles.filterButtonText,
                        !activeFilters.category && styles.filterButtonTextSelected
                      ]}>All Categories</Text>
                      {!activeFilters.category && <CheckCircle size={FONT_SIZE.md} color={themeColors.onPrimary}/>}
                    </TouchableOpacity>
                    {availableCategories.map(cat => (
                      <TouchableOpacity 
                        key={cat}
                        style={[
                          styles.filterButtonOption,
                          activeFilters.category === cat && styles.filterButtonOptionSelected
                        ]}
                        onPress={() => handleApplyFilters({...activeFilters, category: activeFilters.category === cat ? null : cat})}
                      >
                        <Text style={[
                          styles.filterButtonText,
                          activeFilters.category === cat && styles.filterButtonTextSelected
                        ]}>{cat}</Text>
                        {activeFilters.category === cat && <CheckCircle size={FONT_SIZE.md} color={themeColors.onPrimary}/>}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </ScrollView>
              
              <Button 
                title="Clear All Filters"
                onPress={() => {
                  handleClearFilters();
                  setIsFilterModalVisible(false);
                }} 
                style={{marginTop: SPACING.md, backgroundColor: themeColors.border }} 
                textStyle={{color: themeColors.textLight}}
              />
              <Button 
                title="Done"
                onPress={() => setIsFilterModalVisible(false)} 
                style={styles.applyButton}
              />
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
