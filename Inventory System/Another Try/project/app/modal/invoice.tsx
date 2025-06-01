import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { Share2, Printer, X } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_sale: number;
  subtotal: number;
}

interface SaleDetails {
  id: string; // Sale ID
  created_at: string;
  total_amount: number;
  payment_method: string;
  items: SaleItem[];
  // Add customer details if available
  customer_name?: string;
  customer_contact?: string;
}

export default function InvoiceScreen() {
  const params = useLocalSearchParams();
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);

  useEffect(() => {
    if (params.saleId) {
      // TODO: Fetch full sale details from Supabase using saleId if not all details are passed via params
      // For now, we'll assume some details are passed or construct a placeholder
      console.log("Invoice screen received params (on change):", params.saleId);
      const itemsParam = params.items ? JSON.parse(params.items as string) : [];
      const placeholderSale: SaleDetails = {
        id: params.saleId as string || new Date().getTime().toString(),
        created_at: params.saleDate as string || new Date().toISOString(),
        total_amount: parseFloat(params.totalAmount as string || '0'),
        payment_method: params.paymentMethod as string || 'N/A',
        items: itemsParam,
        customer_name: params.customerName as string || 'Walk-in Customer',
      };
      setSaleDetails(placeholderSale);
    } else {
      Alert.alert("Error", "No sale details found to generate an invoice.");
      router.back();
    }
  }, [
    params.saleId,
    params.saleDate,
    params.totalAmount,
    params.paymentMethod,
    params.items, 
    params.customerName
  ]);

  const generateInvoiceHTML = () => {
    if (!saleDetails) return '';

    const itemsHTML = saleDetails.items.map(item => `
      <tr>
        <td>${item.product_name}</td>
        <td>${item.quantity}</td>
        <td>₹${item.price_at_sale.toFixed(2)}</td>
        <td>₹${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; color: #000; }
            .header p { margin: 5px 0; font-size: 14px; color: #555; }
            .invoice-details, .customer-details { margin-bottom: 20px; font-size: 14px; }
            .invoice-details p, .customer-details p { margin: 3px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .total-row td { font-weight: bold; font-size: 16px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tax Invoice / Bill</h1>
            <p>Truck Center</p>
            <p>Narayanapuram, Pallikarnai, Chennai, TamilNadu, 600100</p>
            <p>Phone: +91 9884047224 | Email: syedameenk71@gmail.com</p>
          </div>

          <div class="invoice-details">
            <p><strong>Invoice #:</strong> ${saleDetails.id.substring(0, 8)}</p>
            <p><strong>Date:</strong> ${new Date(saleDetails.created_at).toLocaleDateString()}</p>
            <p><strong>Payment Method:</strong> ${saleDetails.payment_method}</p>
          </div>

          <div class="customer-details">
             <p><strong>Billed To:</strong> ${saleDetails.customer_name}</p>
             ${saleDetails.customer_contact ? `<p><strong>Contact:</strong> ${saleDetails.customer_contact}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
                <td><strong>₹${saleDetails.total_amount.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Powered by Your App Name</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintInvoice = async () => {
    if (!saleDetails) return;
    const htmlContent = generateInvoiceHTML();
    try {
      await Print.printAsync({ html: htmlContent });
    } catch (error) {
      Alert.alert("Print Error", "Could not print the invoice.");
      console.error("Print error:", error);
    }
  };

  const handleShareInvoice = async () => {
    if (!saleDetails) return;
    const htmlContent = generateInvoiceHTML();
    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      console.log('File has been saved to:', uri);
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Sharing Not Available", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Invoice' });
    } catch (error) {
      Alert.alert("Share Error", "Could not share the invoice.");
      console.error("Share error:", error);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.md,
        backgroundColor: themeColors.surface,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
    },
    headerTitle: {
        fontSize: FONT_SIZE.xl,
        fontFamily: 'Inter-SemiBold',
        color: themeColors.text,
    },
    scrollContent: {
      padding: SPACING.md,
      paddingBottom: insets.bottom + SPACING.lg,
    },
    section: {
      marginBottom: SPACING.lg,
    },
    sectionTitle: {
      fontSize: FONT_SIZE.lg,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: SPACING.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: SPACING.xs,
    },
    detailLabel: {
      fontFamily: 'Inter-Regular',
      color: themeColors.textLight,
      fontSize: FONT_SIZE.md,
    },
    detailValue: {
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      fontSize: FONT_SIZE.md,
    },
    itemsTable: {
      marginTop: SPACING.sm,
    },
    itemsHeader: {
      flexDirection: 'row',
      backgroundColor: themeColors.surface,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.xs,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    itemsRow: {
      flexDirection: 'row',
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.xs,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    itemCell: { fontFamily: 'Inter-Regular', color: themeColors.text, fontSize: FONT_SIZE.sm },
    itemNameCell: { flex: 3 },
    itemQtyCell: { flex: 1, textAlign: 'right' },
    itemPriceCell: { flex: 2, textAlign: 'right' },
    itemSubtotalCell: { flex: 2, textAlign: 'right', fontFamily: 'Inter-Medium' },
    totalSection: {
      marginTop: SPACING.md,
      paddingTop: SPACING.md,
      borderTopWidth: 2,
      borderTopColor: themeColors.primary,
    },
    actionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: SPACING.xl,
      paddingHorizontal: SPACING.md,
    },
    actionButton: {
        flex: 1, // Distribute space
        marginHorizontal: SPACING.xs, 
    }
  });

  if (!saleDetails) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]} edges={['top', 'bottom']}>
        <ActivityIndicator color={themeColors.primary} />
        <Text style={{ marginTop: SPACING.md, color: themeColors.text }}>Loading invoice details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Invoice</Text>
        <TouchableOpacity onPress={() => {
          if (params.sourceScreen === 'salesHistory') {
            if (router.canGoBack()) {
              router.back(); // Go back to the existing SalesHistoryScreen instance
            } else {
              // Fallback if somehow we can't go back (should not happen in this flow)
              router.replace('/modal/sales-history'); 
            }
          } else {
            router.replace('/(tabs)/sales');
          }
        }} > 
            <X size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Details</Text>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Invoice #:</Text><Text style={styles.detailValue}>{saleDetails.id.substring(0,8)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Date:</Text><Text style={styles.detailValue}>{new Date(saleDetails.created_at).toLocaleString()}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Payment Method:</Text><Text style={styles.detailValue}>{saleDetails.payment_method}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billed To</Text>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Customer:</Text><Text style={styles.detailValue}>{saleDetails.customer_name}</Text></View>
          {/* Add more customer details if available */}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          <View style={styles.itemsTable}>
            <View style={styles.itemsHeader}>
              <Text style={[styles.itemCell, styles.itemNameCell, {fontFamily: 'Inter-SemiBold'}]}>Item</Text>
              <Text style={[styles.itemCell, styles.itemQtyCell, {fontFamily: 'Inter-SemiBold'}]}>Qty</Text>
              <Text style={[styles.itemCell, styles.itemPriceCell, {fontFamily: 'Inter-SemiBold'}]}>Rate</Text>
              <Text style={[styles.itemCell, styles.itemSubtotalCell, {fontFamily: 'Inter-SemiBold'}]}>Amount</Text>
            </View>
            {saleDetails.items.map((item, index) => (
              <View key={index} style={styles.itemsRow}>
                <Text style={[styles.itemCell, styles.itemNameCell]}>{item.product_name}</Text>
                <Text style={[styles.itemCell, styles.itemQtyCell]}>{item.quantity}</Text>
                <Text style={[styles.itemCell, styles.itemPriceCell]}>₹{item.price_at_sale.toFixed(2)}</Text>
                <Text style={[styles.itemCell, styles.itemSubtotalCell]}>₹{item.subtotal.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.section, styles.totalSection]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, {fontSize: FONT_SIZE.lg, fontFamily: 'Inter-SemiBold'}]}>Total Amount</Text>
            <Text style={[styles.detailValue, {fontSize: FONT_SIZE.xl, color: themeColors.primary, fontFamily: 'Inter-Bold'}]}>₹{saleDetails.total_amount.toFixed(2)}</Text>
          </View>
        </View>
        
        <Text style={{textAlign:'center', fontFamily:'Inter-Regular', color: themeColors.textLight, fontSize: FONT_SIZE.sm, marginTop: SPACING.lg}}>
            Thank you for your purchase!
        </Text>
      </ScrollView>

      <View style={[styles.actionsContainer, {paddingBottom: insets.bottom > 0 ? insets.bottom : SPACING.md}]}>
        <Button 
            title="Print Invoice" 
            onPress={handlePrintInvoice} 
            icon={<Printer size={18} color={themeColors.onPrimary}/>} 
            style={styles.actionButton}
            variant="primary"
        />
        <Button 
            title="Share PDF" 
            onPress={handleShareInvoice} 
            icon={<Share2 size={18} color={themeColors.onPrimary}/>} 
            style={styles.actionButton}
            variant="secondary"
        />
      </View>
    </SafeAreaView>
  );
} 