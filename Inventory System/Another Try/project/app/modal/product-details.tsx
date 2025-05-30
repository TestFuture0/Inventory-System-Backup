import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Edit2, Trash2, AlertTriangle } from 'lucide-react-native';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock_count: number;
  description: string | null;
  sku: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  
  const fetchProduct = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      setProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to fetch product details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleEdit = () => {
    // Navigate to edit product screen (to be implemented)
    Alert.alert('Edit Product', 'Edit functionality to be implemented');
  };

  const handleDelete = () => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this product? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  };

  const confirmDelete = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Product deleted successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          variant="primary"
          style={styles.goBackButton}
        />
      </SafeAreaView>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {product.image_url && (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.header}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{product.category}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock</Text>
            <View style={styles.stockContainer}>
              <Text
                style={[
                  styles.detailValue,
                  product.stock_count < 10 ? styles.lowStockText : null,
                ]}
              >
                {product.stock_count} units
              </Text>
              {product.stock_count < 10 && (
                <View style={styles.lowStockBadge}>
                  <AlertTriangle size={12} color={COLORS.white} />
                  <Text style={styles.lowStockBadgeText}>Low</Text>
                </View>
              )}
            </View>
          </View>
          
          {product.sku && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Added On</Text>
            <Text style={styles.detailValue}>{formatDate(product.created_at)}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Updated</Text>
            <Text style={styles.detailValue}>{formatDate(product.updated_at)}</Text>
          </View>
        </Card>

        {product.description && (
          <Card style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </Card>
        )}

        {userRole === 'admin' && (
          <View style={styles.actionButtons}>
            <Button
              title="Edit"
              onPress={handleEdit}
              variant="primary"
              style={styles.editButton}
              textStyle={styles.buttonText}
              fullWidth
            />
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="danger"
              style={styles.deleteButton}
              textStyle={styles.buttonText}
              fullWidth
            />
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.error,
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
  },
  goBackButton: {
    width: 120,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  productName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.primary,
  },
  detailsCard: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: COLORS.text,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lowStockText: {
    color: COLORS.error,
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: COLORS.white,
    marginLeft: 2,
  },
  descriptionCard: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: COLORS.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: COLORS.text,
    lineHeight: 20,
  },
  actionButtons: {
    marginBottom: 40,
  },
  editButton: {
    marginBottom: 12,
  },
  deleteButton: {
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
  },
});