import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { Check, CreditCard, Smartphone } from 'lucide-react-native';

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    stock_count: number;
  };
  quantity: number;
}

type PaymentMethod = 'Cash' | 'GPay' | 'PhonePe';

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ cartItems: string; total: string }>();
  const { themeColors } = useTheme();
  const [cartItems, setCartItems] = useState<CartItem[]>(JSON.parse(params.cartItems || '[]'));
  const [total, setTotal] = useState<number>(parseFloat(params.total || '0'));
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  const taxAmount = total * 0.18;
  const finalTotal = total + taxAmount;

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      padding: 16,
    },
    orderSummaryCard: {
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: 16,
    },
    orderItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    orderItemDetails: {
      flex: 1,
    },
    orderItemName: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      marginBottom: 4,
    },
    orderItemPrice: {
      fontSize: 12,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
    },
    orderItemTotal: {
      fontSize: 14,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    divider: {
      height: 1,
      backgroundColor: themeColors.border,
      marginVertical: 12,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
    },
    totalValue: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
    },
    finalTotal: {
      marginTop: 4,
    },
    finalTotalLabel: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    finalTotalValue: {
      fontSize: 18,
      fontFamily: 'Inter-Bold',
      color: themeColors.primary,
    },
    customerCard: {
      marginBottom: 16,
    },
    paymentCard: {
      marginBottom: 24,
    },
    paymentMethodItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: themeColors.surface,
    },
    selectedPaymentMethod: {
      borderColor: themeColors.primary,
      borderWidth: 2,
      backgroundColor: themeColors.primaryLight + '20',
    },
    paymentMethodContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    paymentMethodText: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      marginLeft: 12,
    },
    checkmarkContainer: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: themeColors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 40,
    },
    cancelButton: {
      flex: 1,
      marginRight: 8,
    },
    completeButton: {
      flex: 1,
      marginLeft: 8,
    },
  });

  const handleCheckout = async () => {
    try {
      setLoading(true);
      console.log('[Checkout] Starting checkout process...');
      console.log('[Checkout] Cart Items:', JSON.stringify(cartItems, null, 2));
      console.log('[Checkout] Customer Name:', customerName, 'Phone:', customerPhone);
      console.log('[Checkout] Payment Method:', paymentMethod);
      console.log('[Checkout] Subtotal:', total, 'Tax:', taxAmount, 'Final Total:', finalTotal);

      // Start a transaction to ensure all operations succeed or fail together
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          payment_method: paymentMethod,
          subtotal: total,
          tax: taxAmount,
          total_amount: finalTotal,
        })
        .select()
        .single();

      if (saleError) {
        throw saleError;
      }

      // Insert sale items
      const saleItems = cartItems.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        throw itemsError;
      }

      // Update product stock counts
      for (const item of cartItems) {
        console.log(`[Checkout] Processing stock for item: ${item.product.name} (ID: ${item.product.id}), Quantity: ${item.quantity}`);
        
        // Re-fetch the product to get the latest stock_count
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('stock_count')
          .eq('id', item.product.id)
          .single();

        if (fetchError || !currentProduct) {
          console.error(`[Checkout] Failed to fetch latest stock for ${item.product.name} (ID: ${item.product.id}):`, fetchError);
          throw new Error(`Failed to verify stock for ${item.product.name}. Sale aborted.`); 
        }
        
        console.log(`[Checkout] Current DB stock for ${item.product.name}: ${currentProduct.stock_count}, Cart item initial stock: ${item.product.stock_count}`);

        if (currentProduct.stock_count < item.quantity) {
          console.warn(`[Checkout] Insufficient stock for ${item.product.name}. Available: ${currentProduct.stock_count}, Requested: ${item.quantity}`);
          Alert.alert(
            'Stock Issue',
            `Not enough stock for ${item.product.name}. Only ${currentProduct.stock_count} left. Please update cart and try again.`,
            [{ text: 'OK', onPress: () => router.back() }] // Send user back to adjust cart
          );
          setLoading(false);
          return; 
        }

        const newStock = currentProduct.stock_count - item.quantity;
        console.log(`[Checkout] New stock for ${item.product.name} will be: ${newStock}`);
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_count: newStock })
          .eq('id', item.product.id);

        if (stockError) {
          console.error(`[Checkout] Failed to update stock for ${item.product.name} (ID: ${item.product.id}):`, JSON.stringify(stockError, null, 2));
          // Consider trying to roll back the sale record if this fails.
          // For now, we throw the error, which should be caught by the outer catch block.
          throw stockError; 
        }
        console.log(`[Checkout] Successfully updated stock for ${item.product.name}`);
      }

      // Prepare items for invoice
      const invoiceItems = cartItems.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        price_at_sale: item.product.price,
        subtotal: item.product.price * item.quantity,
      }));

      console.log('[Checkout] Sale recorded successfully, Sale ID:', sale.id);
      // Show success message and navigate to invoice
      Alert.alert(
        'Sale Completed',
        'The sale has been successfully recorded. View Invoice?',
        [
          {
            text: 'View Invoice',
            onPress: () => {
              router.replace({
                pathname: '/modal/invoice',
                params: {
                  saleId: sale.id,
                  saleDate: sale.created_at, // Assuming created_at is available and an ISO string
                  totalAmount: finalTotal.toString(),
                  paymentMethod: paymentMethod,
                  items: JSON.stringify(invoiceItems),
                  customerName: customerName || 'Walk-in Customer',
                  // customerContact: customerPhone || '', // Optional: if you want to pass phone
                },
              });
            },
          },
          {
            text: 'Cancel',
            onPress: () => router.replace('/(tabs)/sales'), // Or wherever you want to redirect after sale
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('[Checkout] Error during checkout process:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Checkout Error',
        error.message || 'An unexpected error occurred during checkout. Please try again.'
      );
    } finally {
      setLoading(false);
      console.log('[Checkout] Checkout process ended.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.orderSummaryCard}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          
          {cartItems.map((item, index) => (
            <View key={item.product.id} style={styles.orderItem}>
              <View style={styles.orderItemDetails}>
                <Text style={styles.orderItemName}>{item.product.name}</Text>
                <Text style={styles.orderItemPrice}>
                  ₹{item.product.price.toFixed(2)} x {item.quantity}
                </Text>
              </View>
              <Text style={styles.orderItemTotal}>
                ₹{(item.product.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          
          <View style={styles.divider} />
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
          </View>
          
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax (18%)</Text>
            <Text style={styles.totalValue}>₹{taxAmount.toFixed(2)}</Text>
          </View>
          
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total</Text>
            <Text style={styles.finalTotalValue}>₹{finalTotal.toFixed(2)}</Text>
          </View>
        </Card>
        
        <Card style={styles.customerCard}>
          <Text style={styles.cardTitle}>Customer Information (Optional)</Text>
          
          <Input
            label="Customer Name"
            placeholder="Enter customer name"
            value={customerName}
            onChangeText={setCustomerName}
          />
          
          <Input
            label="Phone Number"
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={setCustomerPhone}
          />
        </Card>
        
        <Card style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={React.useMemo(() => [
              styles.paymentMethodItem,
              paymentMethod === 'Cash' && styles.selectedPaymentMethod,
            ], [paymentMethod, styles.paymentMethodItem, styles.selectedPaymentMethod])}
            onPress={() => handlePaymentMethodChange('Cash')}
          >
            <View style={styles.paymentMethodContent}>
              <CreditCard size={20} color={themeColors.text} />
              <Text style={styles.paymentMethodText}>Cash</Text>
            </View>
            {paymentMethod === 'Cash' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={themeColors.white} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={React.useMemo(() => [
              styles.paymentMethodItem,
              paymentMethod === 'GPay' && styles.selectedPaymentMethod,
            ], [paymentMethod, styles.paymentMethodItem, styles.selectedPaymentMethod])}
            onPress={() => handlePaymentMethodChange('GPay')}
          >
            <View style={styles.paymentMethodContent}>
              <Smartphone size={20} color={themeColors.text} />
              <Text style={styles.paymentMethodText}>Google Pay</Text>
            </View>
            {paymentMethod === 'GPay' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={themeColors.white} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={React.useMemo(() => [
              styles.paymentMethodItem,
              paymentMethod === 'PhonePe' && styles.selectedPaymentMethod,
            ], [paymentMethod, styles.paymentMethodItem, styles.selectedPaymentMethod])}
            onPress={() => handlePaymentMethodChange('PhonePe')}
          >
            <View style={styles.paymentMethodContent}>
              <Smartphone size={20} color={themeColors.text} />
              <Text style={styles.paymentMethodText}>PhonePe</Text>
            </View>
            {paymentMethod === 'PhonePe' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={themeColors.white} />
              </View>
            )}
          </TouchableOpacity>
        </Card>
        
        <View style={styles.actionButtons}>
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
          <Button
            title="Complete Sale"
            onPress={handleCheckout}
            loading={loading}
            disabled={loading}
            style={styles.completeButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}