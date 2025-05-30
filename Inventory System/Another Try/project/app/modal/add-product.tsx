import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { X, Plus, Camera } from 'lucide-react-native';
import { getCategories, Category as ProductCategory } from '@/lib/categoryService';

// Product categories - Will be fetched from DB
// const CATEGORIES = [
//   'Engine Parts',
//   'Electrical',
//   'Suspension',
//   'Brakes',
//   'Transmission',
//   'Body Parts',
//   'Accessories',
//   'Other',
// ];

// Validation schema
const ProductSchema = Yup.object().shape({
  name: Yup.string()
    .required('Product name is required')
    .max(100, 'Name must be 100 characters or less'),
  price: Yup.number()
    .required('Price is required')
    .positive('Price must be positive'),
  category: Yup.string()
    .required('Category is required'),
    // .oneOf(CATEGORIES, 'Invalid category'), // We'll validate against fetched categories if needed, or rely on selection
  stockCount: Yup.number()
    .required('Stock count is required')
    .integer('Stock count must be a whole number')
    .min(0, 'Stock count cannot be negative'),
  description: Yup.string()
    .max(500, 'Description must be 500 characters or less'),
  sku: Yup.string(),
  imageUrl: Yup.string().url('Must be a valid URL'),
});

export default function AddProductScreen() {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  // If not admin, redirect to home
  React.useEffect(() => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can add products');
      router.back();
    }
  }, [userRole]);

  const fetchProductCategories = useCallback(async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const fetched = await getCategories();
      setProductCategories(fetched);
      // Update validation schema if necessary, though selecting from list is primary validation
      // ProductSchema.fields.category = Yup.string().required('Category is required').oneOf(fetched.map(c => c.name), 'Invalid category');
    } catch (error: any) {
      setCategoriesError(error.message || 'Failed to load categories');
      Alert.alert('Error Loading Categories', error.message || 'Could not load product categories. Please try again.');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductCategories();
  }, [fetchProductCategories]);

  // Update ProductSchema to use dynamic categories for validation
  const getCurrentProductSchema = () => {
    return Yup.object().shape({
      name: Yup.string()
        .required('Product name is required')
        .max(100, 'Name must be 100 characters or less'),
      price: Yup.number()
        .required('Price is required')
        .positive('Price must be positive'),
      category: Yup.string()
        .required('Category is required')
        .oneOf(productCategories.map(c => c.name), 'Invalid category selected. Please refresh categories.'),
      stockCount: Yup.number()
        .required('Stock count is required')
        .integer('Stock count must be a whole number')
        .min(0, 'Stock count cannot be negative'),
      description: Yup.string()
        .max(500, 'Description must be 500 characters or less'),
      sku: Yup.string(),
      imageUrl: Yup.string().url('Must be a valid URL'),
    });
  };

  const handleAddProduct = async (values: any) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: values.name,
          price: values.price,
          category: values.category,
          stock_count: values.stockCount,
          description: values.description || null,
          sku: values.sku || null,
          image_url: values.imageUrl || null,
        })
        .select();

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Product added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Product</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Formik
            initialValues={{
              name: '',
              price: '',
              category: '',
              stockCount: '',
              description: '',
              sku: '',
              imageUrl: '',
            }}
            validationSchema={getCurrentProductSchema()}
            onSubmit={handleAddProduct}
          >
            {({ handleChange, handleBlur, handleSubmit, setFieldValue, values, errors, touched }) => (
              <>
                <Input
                  label="Product Name *"
                  placeholder="Enter product name"
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  error={touched.name && errors.name ? errors.name : undefined}
                />

                <Input
                  label="Price (₹) *"
                  placeholder="Enter price"
                  keyboardType="decimal-pad"
                  value={values.price}
                  onChangeText={handleChange('price')}
                  onBlur={handleBlur('price')}
                  error={touched.price && errors.price ? errors.price : undefined}
                />

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Category *</Text>
                  <TouchableOpacity
                    style={[
                      styles.categoryInput,
                      touched.category && errors.category ? styles.inputError : null,
                    ]}
                    onPress={() => setShowCategories(!showCategories)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        !values.category ? styles.placeholderText : null,
                      ]}
                    >
                      {values.category || 'Select a category'}
                    </Text>
                  </TouchableOpacity>
                  {touched.category && errors.category ? (
                    <Text style={styles.errorText}>{errors.category}</Text>
                  ) : null}

                  {showCategories && (
                    <View style={styles.categoriesList}>
                      {categoriesLoading ? (
                        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
                      ) : categoriesError ? (
                        <View style={styles.categoryErrorContainer}>
                          <Text style={styles.errorText}>{categoriesError}</Text>
                          <Button title="Retry" onPress={fetchProductCategories} variant="outline" />
                        </View>
                      ) : (
                        <ScrollView nestedScrollEnabled={true}>
                          {productCategories.map((category) => (
                        <TouchableOpacity
                              key={category.id}
                          style={styles.categoryItem}
                          onPress={() => {
                                setFieldValue('category', category.name);
                            setShowCategories(false);
                          }}
                        >
                              <Text style={styles.categoryItemText}>{category.name}</Text>
                        </TouchableOpacity>
                      ))}
                        </ScrollView>
                      )}
                    </View>
                  )}
                </View>

                <Input
                  label="Stock Count *"
                  placeholder="Enter available quantity"
                  keyboardType="number-pad"
                  value={values.stockCount}
                  onChangeText={handleChange('stockCount')}
                  onBlur={handleBlur('stockCount')}
                  error={touched.stockCount && errors.stockCount ? errors.stockCount : undefined}
                />

                <Input
                  label="SKU/Barcode"
                  placeholder="Enter product SKU or barcode (optional)"
                  value={values.sku}
                  onChangeText={handleChange('sku')}
                  onBlur={handleBlur('sku')}
                  error={touched.sku && errors.sku ? errors.sku : undefined}
                />

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      touched.description && errors.description ? styles.inputError : null,
                    ]}
                    placeholder="Enter product description (optional)"
                    placeholderTextColor={COLORS.gray}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={values.description}
                    onChangeText={handleChange('description')}
                    onBlur={handleBlur('description')}
                  />
                  {touched.description && errors.description ? (
                    <Text style={styles.errorText}>{errors.description}</Text>
                  ) : null}
                </View>

                <Input
                  label="Image URL"
                  placeholder="Enter image URL (optional)"
                  value={values.imageUrl}
                  onChangeText={handleChange('imageUrl')}
                  onBlur={handleBlur('imageUrl')}
                  error={touched.imageUrl && errors.imageUrl ? errors.imageUrl : undefined}
                />

                <View style={styles.buttonGroup}>
                  <Button
                    title="Cancel"
                    onPress={() => router.back()}
                    variant="outline"
                    style={styles.cancelButton}
                  />
                  <Button
                    title="Add Product"
                    onPress={() => handleSubmit()}
                    loading={loading}
                    disabled={loading}
                    style={styles.submitButton}
                  />
                </View>
              </>
            )}
          </Formik>
        </ScrollView>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 8,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputContainer: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: COLORS.text,
    fontFamily: 'Inter-Medium',
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    fontFamily: 'Inter-Regular',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  categoryInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 48,
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
  placeholderText: {
    color: COLORS.gray,
  },
  categoriesList: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 200,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
  categoryErrorContainer: {
    padding: 16,
    alignItems: 'center',
  },
});