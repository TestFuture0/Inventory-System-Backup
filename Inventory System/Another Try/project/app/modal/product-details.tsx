import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, TextInput, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Edit2, Trash2, AlertTriangle, Save, XCircle, ChevronLeft, ChevronDown } from 'lucide-react-native';
import { getCategories, Category as ProductCategory } from '@/lib/categoryService';

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
  const { themeColors } = useTheme();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { userRole } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // State for category selection
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  const populateForm = (p: Product) => {
    setName(p.name || '');
    setPrice(p.price?.toString() || '');
    setCategory(p.category || '');
    setStock(p.stock_count?.toString() || '');
    setDescription(p.description || '');
    setSku(p.sku || '');
    setImageUrl(p.image_url || '');
  };
  
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
      if (data) {
        setProduct(data);
        populateForm(data);
      } else {
        Alert.alert('Error', 'Product not found.');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      Alert.alert('Error', 'Failed to fetch product details');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const fetched = await getCategories();
      setProductCategories(fetched);
    } catch (error: any) {
      setCategoriesError(error.message || 'Failed to load categories');
      // Optionally show an alert here too, or handle error display in the modal
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (isEditMode) { // Fetch categories only when entering edit mode
      fetchProductCategories();
    }
  }, [isEditMode, fetchProductCategories]);

  const handleEditToggle = () => {
    if (isEditMode && product) {
        populateForm(product);
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveChanges = async () => {
    if (!product) return;
    setSaving(true);

    const updatedProductData = {
      name,
      price: parseFloat(price) || null,
      category: category || null,
      stock_count: parseInt(stock, 10) || null,
      description: description || null,
      sku: sku || null,
      image_url: imageUrl || null,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data: updatedData, error: updateError } = await supabase
        .from('products')
        .update(updatedProductData)
        .eq('id', product.id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (updatedData) {
        setProduct(updatedData);
        populateForm(updatedData);
      }
      Alert.alert('Success', 'Product updated successfully!');
      setIsEditMode(false);
    } catch (e: any) {
      console.error('Error saving product:', e);
      Alert.alert('Error', e.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingTop: insets.top + SPACING.sm,
        paddingBottom: SPACING.sm,
    },
    closeButton: {
        padding: SPACING.xs,
        marginRight: SPACING.sm,
    },
    screenTitle: {
        fontSize: FONT_SIZE.lg,
        fontFamily: 'Inter-SemiBold',
        color: themeColors.text,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: insets.bottom + 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: themeColors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
    },
    errorText: {
      fontSize: 16,
      color: themeColors.error,
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
      backgroundColor: themeColors.border,
    },
    header: {
      marginBottom: 16,
    },
    productName: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: themeColors.text,
      marginBottom: 4,
    },
    productPrice: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.primary,
    },
    detailsCard: {
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      minHeight: 50,
    },
    detailLabel: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Medium',
      color: themeColors.textLight,
      width: '30%',
      marginRight: SPACING.sm,
    },
    detailValue: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: themeColors.text,
      flexShrink: 1,
      textAlign: 'right',
    },
    inputField: {
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
      borderWidth: 1,
      borderColor: themeColors.border,
      flex: 1,
    },
    textAreaField: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    stockContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    lowStockText: {
      color: themeColors.error,
    },
    lowStockBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeColors.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 8,
    },
    lowStockBadgeText: {
      fontSize: 10,
      fontFamily: 'Inter-Medium',
      color: themeColors.white,
      marginLeft: 4,
    },
    descriptionCard: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
      lineHeight: 20,
    },
    actionButtons: {
      marginTop: 24,
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
    categorySelectButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: themeColors.surface,
      borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm, 
      borderWidth: 1,
      borderColor: themeColors.border,
      minHeight: 48,
    },
    categorySelectText: {
      fontSize: FONT_SIZE.md,
      fontFamily: 'Inter-Regular',
      color: themeColors.text,
    },
    categoryPlaceholderText: {
        color: themeColors.textLight,
    },
    categoryModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    categoryModalContent: {
        backgroundColor: themeColors.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        width: '80%',
        maxHeight: '60%',
    },
    categoryModalHeader: {
        fontSize: FONT_SIZE.lg,
        fontFamily: 'Inter-SemiBold',
        color: themeColors.text,
        marginBottom: SPACING.md,
        textAlign: 'center',
    },
    categoryItem: {
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: themeColors.border,
    },
    categoryItemText: {
        fontSize: FONT_SIZE.md,
        fontFamily: 'Inter-Regular',
        color: themeColors.text,
    },
    categoryModalCloseButton: {
        marginTop: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: themeColors.primary,
        borderRadius: BORDER_RADIUS.md,
        alignItems: 'center',
    },
    categoryModalCloseButtonText: {
        color: themeColors.onPrimary,
        fontFamily: 'Inter-Medium',
        fontSize: FONT_SIZE.md,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                <ChevronLeft size={28} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>{isEditMode ? 'Edit Product' : 'Product Details'}</Text>
        </View>
      <ScrollView contentContainerStyle={[styles.scrollContent]} showsVerticalScrollIndicator={false}>
        {product.image_url ? (
          <Image
            source={{ uri: product.image_url }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.productImage, { justifyContent: 'center', alignItems: 'center'}]}>
            <Text style={{color: themeColors.textLight}}>No Image</Text>
          </View>
        )}

        {!isEditMode && product && (
             <View style={styles.header}>
                 <Text style={styles.productName}>{product.name}</Text>
                 <Text style={styles.productPrice}>₹{product.price.toFixed(2)}</Text>
            </View>
        )}

        <Card style={styles.detailsCard}>
          {isEditMode && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Product Name</Text>
                <TextInput
                  style={styles.inputField}
                  value={name}
                  onChangeText={setName}
                  placeholder="Product Name"
                  placeholderTextColor={themeColors.textLight}
                />
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Price (₹)</Text>
                <TextInput
                  style={styles.inputField}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="Price"
                  keyboardType="numeric"
                  placeholderTextColor={themeColors.textLight}
                />
              </View>
            </>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            {isEditMode ? (
              <TouchableOpacity 
                style={styles.categorySelectButton} 
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <Text style={[styles.categorySelectText, !category && styles.categoryPlaceholderText]}>
                  {category || 'Select Category'}
                </Text>
                <ChevronDown size={20} color={themeColors.textLight} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.detailValue}>{product.category}</Text>
            )}
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Stock</Text>
            {isEditMode ? (
              <TextInput
                style={styles.inputField}
                value={stock}
                onChangeText={setStock}
                placeholder="Stock Count"
                keyboardType="number-pad"
                placeholderTextColor={themeColors.textLight}
              />
            ) : (
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
                    <AlertTriangle size={12} color={themeColors.white} />
                    <Text style={styles.lowStockBadgeText}>Low</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {isEditMode || product.sku ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              {isEditMode ? (
                <TextInput
                  style={styles.inputField}
                  value={sku}
                  onChangeText={setSku}
                  placeholder="SKU (optional)"
                  placeholderTextColor={themeColors.textLight}
                />
              ) : (
                <Text style={styles.detailValue}>{product.sku}</Text>
              )}
            </View>
          ) : null}
          
          {isEditMode && (
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Image URL</Text>
                <TextInput
                    style={styles.inputField}
                    value={imageUrl}
                    onChangeText={setImageUrl}
                    placeholder="https://example.com/image.png (optional)"
                    placeholderTextColor={themeColors.textLight}
                    autoCapitalize="none"
                    keyboardType="url"
                />
            </View>
          )}
          
          {!isEditMode && (
            <>
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Added On</Text>
                <Text style={styles.detailValue}>{formatDate(product.created_at)}</Text>
              </View>
              
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>Last Updated</Text>
                <Text style={styles.detailValue}>{formatDate(product.updated_at)}</Text>
              </View>
            </>
          )}
        </Card>

        {isEditMode || product.description ? (
          <Card style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            {isEditMode ? (
              <TextInput
                style={[styles.inputField, styles.textAreaField, {marginLeft: 0}] }
                value={description}
                onChangeText={setDescription}
                placeholder="Product description (optional)"
                multiline
                numberOfLines={4}
                placeholderTextColor={themeColors.textLight}
              />
            ) : (
              <Text style={styles.descriptionText}>{product.description}</Text>
            )}
          </Card>
        ) : null}

        {userRole === 'admin' && (
          <View style={styles.actionButtons}>
            {isEditMode ? (
              <>
                <Button
                  title={saving ? 'Saving...' : 'Save Changes'}
                  onPress={handleSaveChanges}
                  variant="success"
                  style={styles.editButton}
                  textStyle={styles.buttonText}
                  icon={saving ? <ActivityIndicator size="small" color={themeColors.onPrimary} /> : <Save size={18} color={themeColors.onPrimary} />}
                  fullWidth
                  disabled={saving}
                />
                <Button
                  title="Cancel"
                  onPress={handleEditToggle}
                  variant="outline"
                  style={{marginTop: 8}}
                  textStyle={{...styles.buttonText, color: themeColors.textLight} }
                  icon={<XCircle size={18} color={themeColors.textLight} />}
                  fullWidth
                  disabled={saving}
                />
              </>
            ) : (
              <>
                <Button
                  title="Edit Product"
                  onPress={handleEditToggle}
                  variant="primary"
                  style={styles.editButton}
                  textStyle={styles.buttonText}
                  icon={<Edit2 size={18} color={themeColors.onPrimary} />}
                  fullWidth
                />
                <Button
                  title="Delete Product"
                  onPress={handleDelete}
                  variant="danger"
                  style={styles.deleteButton}
                  textStyle={styles.buttonText}
                  icon={<Trash2 size={18} color={themeColors.onError} />}
                  fullWidth
                />
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Category Selection Modal */}
      {isEditMode && (
        <Modal
            transparent={true}
            visible={isCategoryModalVisible}
            onRequestClose={() => setIsCategoryModalVisible(false)}
            animationType="fade"
        >
            <View style={styles.categoryModalContainer}>
                <View style={styles.categoryModalContent}>
                    <Text style={styles.categoryModalHeader}>Select Category</Text>
                    {categoriesLoading ? (
                        <ActivityIndicator color={themeColors.primary} size="large" />
                    ) : categoriesError ? (
                        <Text style={{color: themeColors.error, textAlign: 'center'}}>{categoriesError}</Text>
                    ) : (
                        <ScrollView nestedScrollEnabled={true}>
                            {productCategories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.categoryItem}
                                    onPress={() => {
                                        setCategory(cat.name);
                                        setIsCategoryModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.categoryItemText}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                    <TouchableOpacity style={styles.categoryModalCloseButton} onPress={() => setIsCategoryModalVisible(false)}>
                         <Text style={styles.categoryModalCloseButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}