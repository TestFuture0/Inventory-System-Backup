import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { Plus, Search, Filter, Package, AlertTriangle } from 'lucide-react-native';
import debounce from 'lodash.debounce';

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

export default function InventoryScreen() {
  const { userRole } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
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
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const debouncedSearch = debounce((text: string) => {
    if (!text.trim()) {
      setFilteredProducts(products);
      return;
    }

    const lowerCaseQuery = text.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerCaseQuery) ||
        product.category.toLowerCase().includes(lowerCaseQuery) ||
        product.sku?.toLowerCase().includes(lowerCaseQuery) ||
        product.description?.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredProducts(filtered);
  }, 300);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
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

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity onPress={() => handleProductPress(item.id)}>
      <Card style={styles.productCard}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.name}</Text>
          {item.stock_count < 10 && (
            <View style={styles.lowStockBadge}>
              <AlertTriangle size={12} color={COLORS.white} />
              <Text style={styles.lowStockText}>Low</Text>
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
                item.stock_count < 10 ? styles.lowStockValue : null,
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory</Text>
        {userRole === 'admin' && (
          <Button
            title="Add"
            onPress={handleAddProduct}
            variant="primary"
            style={styles.addButton}
          />
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={COLORS.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {filteredProducts.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No products found</Text>
          {userRole === 'admin' && (
            <Button
              title="Add Product"
              onPress={handleAddProduct}
              variant="primary"
              style={styles.emptyAddButton}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {userRole === 'admin' && (
        <TouchableOpacity style={styles.fabButton} onPress={handleAddProduct}>
          <Plus size={24} color={COLORS.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  addButton: {
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
  filterButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  productCard: {
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowStockText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: COLORS.white,
    marginLeft: 4,
  },
  productDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
    flex: 1,
  },
  lowStockValue: {
    color: COLORS.error,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: COLORS.textLight,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyAddButton: {
    width: 160,
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: `0px 2px 4px ${COLORS.shadow}`,
    elevation: 5,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    padding: SPACING.md * 0.5,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    boxShadow: `0px 2px 4px ${COLORS.shadow}`,
    elevation: 2,
  },
});