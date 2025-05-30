import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
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

  const handleCheckout = async () => {
    try {
      setLoading(true);

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
        const newStock = item.product.stock_count - item.quantity;
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_count: newStock })
          .eq('id', item.product.id);

        if (stockError) {
          throw stockError;
        }
      }

      // Show success message and navigate back
      Alert.alert(
        'Sale Completed',
        'The sale has been successfully recorded.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(tabs)/sales');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
            style={[
              styles.paymentMethodItem,
              paymentMethod === 'Cash' && styles.selectedPaymentMethod,
            ]}
            onPress={() => handlePaymentMethodChange('Cash')}
          >
            <View style={styles.paymentMethodContent}>
              <CreditCard size={20} color={COLORS.text} />
              <Text style={styles.paymentMethodText}>Cash</Text>
            </View>
            {paymentMethod === 'Cash' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentMethodItem,
              paymentMethod === 'GPay' && styles.selectedPaymentMethod,
            ]}
            onPress={() => handlePaymentMethodChange('GPay')}
          >
            <View style={styles.paymentMethodContent}>
              <Smartphone size={20} color={COLORS.text} />
              <Text style={styles.paymentMethodText}>Google Pay</Text>
            </View>
            {paymentMethod === 'GPay' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={COLORS.white} />
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.paymentMethodItem,
              paymentMethod === 'PhonePe' && styles.selectedPaymentMethod,
            ]}
            onPress={() => handlePaymentMethodChange('PhonePe')}
          >
            <View style={styles.paymentMethodContent}>
              <Smartphone size={20} color={COLORS.text} />
              <Text style={styles.paymentMethodText}>PhonePe</Text>
            </View>
            {paymentMethod === 'PhonePe' && (
              <View style={styles.checkmarkContainer}>
                <Check size={16} color={COLORS.white} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
  },
  orderItemTotal: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
    color: COLORS.textLight,
  },
  totalValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
  },
  finalTotal: {
    marginTop: 4,
  },
  finalTotalLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
  },
  finalTotalValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: COLORS.primary,
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
    borderColor: COLORS.border,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  selectedPaymentMethod: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primaryLight + '10',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
    marginLeft: 12,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
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