import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Search, Plus, ShoppingCart, Trash2, X } from 'lucide-react-native';
import { router } from 'expo-router';
import debounce from 'lodash.debounce';

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
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category, stock_count, sku')
        .gt('stock_count', 0)
        .order('name');

      if (error) {
        throw error;
      }

      if (data) {
        setProducts(data);
        setFilteredProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
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
        product.sku?.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredProducts(filtered);
  }, 300);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const addToCart = (product: Product) => {
    const existingItemIndex = cartItems.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex >= 0) {
      // Product already in cart, increase quantity
      if (cartItems[existingItemIndex].quantity < product.stock_count) {
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1;
        setCartItems(updatedCartItems);
      } else {
        Alert.alert('Stock Limit', `Only ${product.stock_count} units available in stock.`);
      }
    } else {
      // Add new product to cart
      setCartItems([...cartItems, { product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const itemIndex = cartItems.findIndex(item => item.product.id === productId);
    
    if (itemIndex >= 0) {
      const product = cartItems[itemIndex].product;
      
      if (quantity > product.stock_count) {
        Alert.alert('Stock Limit', `Only ${product.stock_count} units available in stock.`);
        return;
      }
      
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      
      const updatedCartItems = [...cartItems];
      updatedCartItems[itemIndex].quantity = quantity;
      setCartItems(updatedCartItems);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add products to cart before checkout.');
      return;
    }
    
    router.push({
      pathname: '/modal/checkout',
      params: {
        cartItems: JSON.stringify(cartItems),
        total: calculateTotal().toString()
      }
    });
  };

  const renderProductItem = ({ item }: { item: Product }) => (
    <Card style={styles.productCard}>
      <View style={styles.productContent}>
        <View>
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

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <Card style={styles.cartItemCard}>
      <View style={styles.cartItemContent}>
        <View style={styles.cartItemInfo}>
          <Text style={styles.cartItemName}>{item.product.name}</Text>
          <Text style={styles.cartItemPrice}>₹{item.product.price.toFixed(2)}</Text>
        </View>
        
        <View style={styles.cartItemActions}>
          <TouchableOpacity
            onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity
            onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
            style={styles.quantityButton}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => removeFromCart(item.product.id)}
            style={styles.removeButton}
          >
            <Trash2 size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales</Text>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => setShowCart(!showCart)}
        >
          <ShoppingCart size={24} color={COLORS.primary} />
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!showCart ? (
        <>
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
          </View>

          <FlatList
            data={filteredProducts}
            renderItem={renderProductItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />

          {cartItems.length > 0 && (
            <View style={styles.bottomBar}>
              <View>
                <Text style={styles.totalItems}>{cartItems.length} items</Text>
                <Text style={styles.totalAmount}>₹{calculateTotal().toFixed(2)}</Text>
              </View>
              <Button
                title="Checkout"
                onPress={handleCheckout}
                variant="primary"
                style={styles.checkoutButton}
              />
            </View>
          )}
        </>
      ) : (
        <View style={styles.cartContainer}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Shopping Cart</Text>
            <TouchableOpacity onPress={() => setShowCart(false)}>
              <X size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCartContainer}>
              <ShoppingCart size={64} color={COLORS.textLight} />
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Button
                title="Add Products"
                onPress={() => setShowCart(false)}
                variant="primary"
                style={styles.addProductsButton}
              />
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                renderItem={renderCartItem}
                keyExtractor={(item) => item.product.id}
                contentContainerStyle={styles.cartListContent}
              />

              <View style={styles.cartSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>₹{calculateTotal().toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tax (18%)</Text>
                  <Text style={styles.summaryValue}>₹{(calculateTotal() * 0.18).toFixed(2)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>₹{(calculateTotal() * 1.18).toFixed(2)}</Text>
                </View>

                <Button
                  title="Proceed to Checkout"
                  onPress={handleCheckout}
                  variant="primary"
                  style={styles.proceedButton}
                  fullWidth
                />
              </View>
            </>
          )}
        </View>
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
  cartButton: {
    position: 'relative',
    padding: 4,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  searchBar: {
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  productCard: {
    marginBottom: 12,
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  productStock: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
  },
  addButton: {
    paddingHorizontal: 16,
    minHeight: 40,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalItems: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
  },
  totalAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  checkoutButton: {
    paddingHorizontal: 24,
  },
  cartContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  cartTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyCartText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: COLORS.textLight,
    marginTop: 16,
    marginBottom: 24,
  },
  addProductsButton: {
    width: 160,
  },
  cartListContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  cartItemCard: {
    marginBottom: 12,
  },
  cartItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
  },
  quantityText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 16,
    padding: 4,
  },
  cartSummary: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary,
  },
  proceedButton: {
    marginTop: 16,
  },
});