import React from 'react';
import { Modal, View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { X, Trash, Plus, Minus, ShoppingCart } from 'lucide-react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  stock_count: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface ReviewCartModalProps {
  visible: boolean;
  cartItems: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, newQuantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  totalAmount: number;
}

export const ReviewCartModal: React.FC<ReviewCartModalProps> = ({
  visible,
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  totalAmount,
}) => {
  const { themeColors } = useTheme();

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)', // Darker overlay for glass effect
      justifyContent: 'flex-end',
    },
    modalContainer: {
      backgroundColor: themeColors.surface,
      borderTopLeftRadius: BORDER_RADIUS.lg,
      borderTopRightRadius: BORDER_RADIUS.lg,
      padding: SPACING.md,
      maxHeight: '75%', // Limit height
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
      paddingBottom: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    headerTitle: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
    },
    closeButton: {
      padding: SPACING.xs,
    },
    emptyCartContainer: {
      alignItems: 'center',
      paddingVertical: SPACING.xl,
    },
    emptyCartText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.textLight,
      marginTop: SPACING.sm,
    },
    itemListContainer: {
      //marginBottom: SPACING.md,
    },
    itemContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border, // Lighter border for items
    },
    itemDetails: {
      flex: 1,
      marginRight: SPACING.sm,
    },
    itemName: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    itemPrice: {
      fontSize: FONT_SIZE.sm,
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      marginTop: SPACING.xs,
    },
    quantityControls: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: SPACING.sm,
    },
    quantityButton: {
      padding: SPACING.xs,
      backgroundColor: themeColors.background, // Subtle background for buttons
      borderRadius: BORDER_RADIUS.sm,
    },
    quantityText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      marginHorizontal: SPACING.sm,
      minWidth: 20, // Ensure text doesn't jump around
      textAlign: 'center',
    },
    removeItemButton: {
      padding: SPACING.sm,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      paddingTop: SPACING.md,
      marginTop: SPACING.sm,
    },
    totalContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: SPACING.md,
    },
    totalTextLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.textLight,
    },
    totalTextValue: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-Bold',
      color: themeColors.primary,
    },
    checkoutButton: {
      // Styles for the main checkout button in the modal
    }
  });

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.product.name}</Text>
        <Text style={styles.itemPrice}>₹{item.product.price.toFixed(2)}</Text>
      </View>
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
          disabled={item.quantity <= 1} // Optionally disable if quantity is 1, handled by onUpdateQuantity logic too
        >
          <Minus size={18} color={item.quantity <= 1 ? themeColors.textLight : themeColors.primary} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
          disabled={item.quantity >= item.product.stock_count}
        >
          <Plus size={18} color={item.quantity >= item.product.stock_count ? themeColors.textLight : themeColors.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.removeItemButton} onPress={() => onRemoveItem(item.product.id)}>
        <Trash size={20} color={themeColors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Review Your Cart</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCartContainer}>
                <ShoppingCart size={48} color={themeColors.textLight} />
                <Text style={styles.emptyCartText}>Your cart is empty.</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                renderItem={renderItem}
                keyExtractor={(item) => item.product.id}
                style={styles.itemListContainer}
                showsVerticalScrollIndicator={false}
              />
              <View style={styles.footer}>
                <View style={styles.totalContainer}>
                  <Text style={styles.totalTextLabel}>Total:</Text>
                  <Text style={styles.totalTextValue}>₹{totalAmount.toFixed(2)}</Text>
                </View>
                <Button
                  title="Proceed to Checkout"
                  onPress={onProceedToCheckout}
                  fullWidth
                  style={styles.checkoutButton}
                  icon={<ShoppingCart size={18} color={themeColors.onPrimary}/>}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}; 