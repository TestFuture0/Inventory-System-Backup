import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Search, Plus, ShoppingCart, Trash, X } from 'lucide-react-native';
import { router } from 'expo-router';
import debounce from 'lodash.debounce';
import { SPACING, FONT_SIZE } from '@/constants/theme';
import { ReviewCartModal } from '@/components/sales/ReviewCartModal';
import { useFocusEffect } from 'expo-router';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_count: number;
  sku: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function SalesScreen() {
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isReviewCartVisible, setIsReviewCartVisible] = useState(false);

  const CART_SUMMARY_BAR_HEIGHT = 75; // Estimated height for the summary bar

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, stock_count, sku')
        .gt('stock_count', 0)
        .order('name');

      if (error) throw error;

      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      Alert.alert('Error', 'Could not fetch products.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('Sales screen focused, fetching products...');
      fetchProducts();

      return () => {
        // Optional: any cleanup actions when the screen goes out of focus
        console.log('Sales screen unfocused');
      };
    }, [fetchProducts])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, [fetchProducts]);

  const debouncedSearch = useCallback(
    debounce((text: string) => {
    if (!text.trim()) {
      setFilteredProducts(products);
      return;
    }
    const lowerCaseQuery = text.toLowerCase();
    const filtered = products.filter(
      (product) =>
        product.name.toLowerCase().includes(lowerCaseQuery) ||
        product.category.toLowerCase().includes(lowerCaseQuery) ||
        product.sku?.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredProducts(filtered);
    }, 300),
    [products]
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from the cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => setCartItems([]),
        },
      ]
    );
  };

  const addToCart = (product: Product) => {
    const existingItemIndex = cartItems.findIndex(item => item.product.id === product.id);
    if (existingItemIndex >= 0) {
      if (cartItems[existingItemIndex].quantity < product.stock_count) {
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1;
        setCartItems(updatedCartItems);
      } else {
        Alert.alert('Stock Limit', `Only ${product.stock_count} units available.`);
      }
    } else {
      setCartItems([...cartItems, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const itemIndex = cartItems.findIndex(item => item.product.id === productId);
    if (itemIndex === -1) return;
    
      const product = cartItems[itemIndex].product;
      
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
      }
    if (newQuantity > product.stock_count) {
      Alert.alert('Stock Limit', `Only ${product.stock_count} units of ${product.name} available.`);
      return;
    }
      
      const updatedCartItems = [...cartItems];
    updatedCartItems[itemIndex].quantity = newQuantity;
      setCartItems(updatedCartItems);
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const handleOpenReviewCart = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to cart first.');
      return;
    }
    setIsReviewCartVisible(true);
  };
    
  const handleProceedToFinalCheckout = () => {
    setIsReviewCartVisible(false);
    router.push({
      pathname: '/modal/checkout',
      params: {
        cartItems: JSON.stringify(cartItems.map(ci => ({
          product: { id: ci.product.id, name: ci.product.name, price: ci.product.price, stock_count: ci.product.stock_count },
          quantity: ci.quantity
        }))),
        total: calculateTotal().toString()
      }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.surface,
    },
    headerTitle: {
      fontSize: FONT_SIZE.xl,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    headerCartIconContainer: {
      padding: SPACING.sm,
    },
    headerCartBadge: {
      position: 'absolute',
      right: SPACING.xs,
      top: SPACING.xs,
      backgroundColor: themeColors.error,
      borderRadius: 10,
      width: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCartBadgeText: {
      color: themeColors.white,
      fontSize: FONT_SIZE.xs,
      fontFamily: 'Inter-Bold',
    },
    searchContainer: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      backgroundColor: themeColors.surface,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.background,
      borderRadius: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    searchIcon: {
      marginRight: SPACING.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: SPACING.sm,
      fontSize: FONT_SIZE.md,
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
    },
    listContent: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: cartItems.length > 0 
                       ? insets.bottom + SPACING.md + CART_SUMMARY_BAR_HEIGHT 
                       : insets.bottom + SPACING.md, 
    },
    productCard: {
      marginBottom: SPACING.md,
    },
    productContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    productName: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.xs / 2,
    },
    productCategory: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginBottom: SPACING.xs / 2,
    },
    productPrice: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Bold',
      color: themeColors.primary,
      marginTop: SPACING.xs,
    },
    productStock: {
      fontSize: FONT_SIZE.xs,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginTop: SPACING.xs,
    },
    addButton: {
      paddingHorizontal: SPACING.lg,
    },
    emptyListContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: SPACING.xxl * 2, // Give it some significant top margin
    },
    emptyListText: {
      fontSize: FONT_SIZE.lg,
      color: themeColors.textLight,
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
    },
    cartSummaryContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      paddingBottom: insets.bottom > 0 ? insets.bottom : SPACING.sm,
      backgroundColor: themeColors.surface,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      height: CART_SUMMARY_BAR_HEIGHT,
    },
    cartSummaryTextContainer: {
      flex: 2,
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    cartSummaryItemsText: {
      fontSize: FONT_SIZE.sm,
      color: themeColors.textLight,
      fontFamily: 'Inter-Regular',
    },
    cartSummaryTotalText: {
      fontSize: FONT_SIZE.lg,
      color: themeColors.primary,
      fontFamily: 'Inter-Bold',
    },
    checkoutButtonContainer: {
      flex: 3,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    clearCartButton: {
        padding: SPACING.sm, 
        marginRight: SPACING.sm,
    },
    checkoutButton: {
      flexGrow: 1,
      paddingHorizontal: SPACING.md, 
      marginLeft: SPACING.xs,
    },
  });

  const renderProductItem = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productContent}>
        <View style={{flex: 1, marginRight: SPACING.sm}}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
          <Text style={styles.productStock}>In stock: {item.stock_count}</Text>
        </View>
        <Button
          title="Add"
          onPress={() => addToCart(item)}
          variant="primary"
          style={styles.addButton}
        />
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Create Sale</Text>
        <TouchableOpacity
          style={styles.headerCartIconContainer} 
          onPress={handleOpenReviewCart}
        >
          <ShoppingCart size={24} color={themeColors.primary} />
          {cartItems.length > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={{flex: 1}}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={themeColors.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholderTextColor={themeColors.textLight}
              />
            </View>
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={themeColors.primary}
          />
            }
            ListEmptyComponent={() => (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                  {searchQuery ? 'No products found for your search.' : 'No products available. Pull to refresh.'}
                </Text>
              </View>
            )}
              />
            </View>

      {cartItems.length > 0 && (
        <View style={styles.cartSummaryContainer}>
          <View style={styles.cartSummaryTextContainer}>
            <Text style={styles.cartSummaryItemsText}>
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </Text>
            <Text style={styles.cartSummaryTotalText}>₹{calculateTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.checkoutButtonContainer}>
            <TouchableOpacity style={styles.clearCartButton} onPress={handleClearCart} activeOpacity={0.7}>
                <Trash size={24} color={themeColors.error} />
            </TouchableOpacity>
              <Button
              title="View Cart & Checkout"
              onPress={handleOpenReviewCart}
              style={styles.checkoutButton}
              icon={<ShoppingCart size={18} color={themeColors.onPrimary} />}
                />
              </View>
        </View>
      )}
      
      <ReviewCartModal
        visible={isReviewCartVisible}
        cartItems={cartItems}
        onClose={() => setIsReviewCartVisible(false)}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onProceedToCheckout={handleProceedToFinalCheckout}
        totalAmount={calculateTotal()}
      />
    </SafeAreaView>
  );
}