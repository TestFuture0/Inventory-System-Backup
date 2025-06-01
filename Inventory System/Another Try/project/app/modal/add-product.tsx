import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { router, Stack } from 'expo-router';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { X, Plus, Camera, Image as ImageIcon, UploadCloud } from 'lucide-react-native';
import { getCategories, Category as ProductCategory } from '@/lib/categoryService';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SPACING, BORDER_RADIUS, FONT_SIZE } from '@/constants/theme';

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
  // imageUrl: Yup.string().url('Must be a valid URL'), // We'll handle image URI separately
});

export default function AddProductScreen() {
  const { userRole } = useAuth();
  const { themeColors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      // No need for imageUrl here if we handle image separately
    });
  };

  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return false;
      }
      return true;
    }
    return true; // Assume granted on web or handle web-specific logic
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to make this work!');
        return false;
      }
      return true;
    }
    return true; // Assume granted on web
  };

  const pickImage = async (source: 'gallery' | 'camera') => {
    let result;
    if (source === 'gallery') {
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return;
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1, // Pick at full quality, compress later
      });
    } else {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1, // Pick at full quality, compress later
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0]);
      console.log('Selected image URI:', result.assets[0].uri);
    }
  };

  const compressImage = async (uri: string): Promise<string | null> => {
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to width 800, height will be adjusted automatically
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
      );
      return manipResult.uri;
    } catch (error) {
      console.error('Image compression failed:', error);
      Alert.alert('Error', 'Failed to compress image.');
      return null;
    }
  };

  const uploadImage = async (imageUri: string, productId?: string): Promise<string | null> => {
    if (!imageUri) return null;
    setIsUploading(true);
    console.log(`[UploadImage] Starting upload for URI: ${imageUri}, Product ID: ${productId}`);
    try {
      console.log('[UploadImage] Compressing image...');
      const compressedUri = await compressImage(imageUri);
      if (!compressedUri) {
        console.warn('[UploadImage] Compression resulted in null URI.');
        setIsUploading(false);
        return null;
      }
      console.log(`[UploadImage] Compressed URI: ${compressedUri}`);

      // Determine file extension and content type more robustly from the compressed URI
      let fileExt = compressedUri.split('.').pop()?.toLowerCase() || 'jpg';
      let contentType = `image/${fileExt}`;
      // ImageManipulator often outputs JPEG regardless of input extension after compression to SaveFormat.JPEG
      if (fileExt === 'jpg' || fileExt === 'jpeg') {
          contentType = 'image/jpeg'; 
          if (fileExt === 'jpg') fileExt = 'jpeg'; // Standardize to jpeg extension for consistency if desired
      }

      const fileName = `${productId || Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`; 
      console.log(`[UploadImage] Target Supabase filePath: ${filePath}, Content-Type: ${contentType}`);

      console.log('[UploadImage] Fetching blob from compressed URI...');
      const response = await fetch(compressedUri);
      const blob = await response.blob();
      console.log(`[UploadImage] Blob created, size: ${blob.size}, type: ${blob.type}`);
      
      console.log('[UploadImage] Attempting to upload to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from('product-images') 
        .upload(filePath, blob, {
          contentType: contentType, // Use the determined contentType
          upsert: true, // Keep as false for now, can be changed to true for testing name collisions
        });

      if (error) {
        console.error('[UploadImage] Supabase upload error object:', JSON.stringify(error, null, 2));
        throw error; // Re-throw to be caught by the outer catch
      }

      if (data) {
        console.log('[UploadImage] Supabase upload successful, data:', JSON.stringify(data, null, 2));
        const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(filePath);
        console.log('[UploadImage] Public URL data:', publicUrlData);
        if (publicUrlData && publicUrlData.publicUrl) {
          console.log('[UploadImage] Image public URL:', publicUrlData.publicUrl);
          setIsUploading(false);
          return publicUrlData.publicUrl;
        } else {
          console.error('[UploadImage] Failed to get public URL, but upload reported success.');
          const fallbackUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${filePath}`;
          console.warn('[UploadImage] Using fallback URL:', fallbackUrl);
          setIsUploading(false);
          return fallbackUrl; 
        }
      }
      console.warn('[UploadImage] Upload successful but no data returned from Supabase storage.upload ');
      setIsUploading(false);
      return null;
    } catch (error: any) {
      setIsUploading(false);
      // Log the error object itself for more details, especially for network errors
      console.error('[UploadImage] CATCH BLOCK: Image upload process failed. Error object:', error);
      if (error.message) {
        console.error('[UploadImage] CATCH BLOCK: Error message:', error.message);
      }
      if (error.stack) {
        console.error('[UploadImage] CATCH BLOCK: Error stack:', error.stack);
      }
      // Alert.alert('Upload Error', error.message || 'Failed to upload image.'); // Alert is already in handleAddProduct
      return null;
    }
  };

  const handleAddProduct = async (values: any, { resetForm }: { resetForm: () => void }) => {
    // if (!selectedImage) { // Remove this check to make image optional
    //   Alert.alert('Image Required', 'Please select an image for the product.');
    //   return;
    // }

    try {
      setLoading(true);
      let imageUrl: string | null = null;

      if (selectedImage && selectedImage.uri) {
        setIsUploading(true);
        imageUrl = await uploadImage(selectedImage.uri, values.name.replace(/\s+/g, '_').toLowerCase());
        setIsUploading(false);

        if (!imageUrl && selectedImage) { // Check selectedImage here to ensure an attempt was made but failed
          // Error during upload was likely already handled by uploadImage, 
          // but we stop product creation if an image was selected but failed to upload.
          setLoading(false);
          Alert.alert("Upload Failed", "The selected image could not be uploaded. Please try a different image or skip adding one.");
          return;
        }
      }
      
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: values.name,
          price: values.price,
          category: values.category,
          stock_count: values.stockCount,
          description: values.description || null,
          sku: values.sku || null,
          image_url: imageUrl, // Save the new image URL
        })
        .select();

      if (error) {
        // If product insert fails, consider deleting the uploaded image (optional)
        // await supabase.storage.from('product-images').remove([imageUrl.split('/').pop()!]);
        throw error;
      }

      Alert.alert('Success', 'Product added successfully!', [
        { text: 'OK', onPress: () => {
            resetForm();
            setSelectedImage(null);
            router.back();
          } 
        }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add product');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.surface,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: themeColors.text,
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
      color: themeColors.text,
      fontFamily: 'Inter-Medium',
    },
    textArea: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      backgroundColor: themeColors.surface,
      padding: 12,
      fontSize: 16,
      color: themeColors.text,
      minHeight: 100,
      fontFamily: 'Inter-Regular',
    },
    inputError: {
      borderColor: themeColors.error,
    },
    errorText: {
      color: themeColors.error,
      fontSize: 12,
      marginTop: 4,
      fontFamily: 'Inter-Regular',
    },
    categoryInput: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      backgroundColor: themeColors.surface,
      padding: 12,
      fontSize: 16,
      color: themeColors.text,
      minHeight: 48,
      justifyContent: 'center',
    },
    categoryText: {
      fontSize: 16,
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
    },
    placeholderText: {
      color: themeColors.textLight,
    },
    categoriesList: {
      marginTop: 8,
      backgroundColor: themeColors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: themeColors.border,
      height: 200,
    },
    categoryItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    categoryItemText: {
      fontSize: 16,
      color: themeColors.text,
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
    imagePickerContainer: {
      alignItems: 'center',
      marginBottom: SPACING.lg,
    },
    imagePreview: {
      width: 150,
      height: 150,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: themeColors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    image: {
      width: '100%',
      height: '100%',
      borderRadius: BORDER_RADIUS.lg,
    },
    imagePickerButtons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginTop: SPACING.sm,
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Add Product</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={themeColors.text} />
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
                        <ActivityIndicator color={themeColors.primary} style={{ marginVertical: 20 }} />
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
                    placeholderTextColor={themeColors.textLight}
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

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Product Image</Text>
                  <View style={styles.imagePickerContainer}>
                    <TouchableOpacity 
                      onPress={() => Alert.alert("Select Image Source", "", [
                        { text: "Camera", onPress: () => pickImage('camera')},
                        { text: "Gallery", onPress: () => pickImage('gallery')},
                        { text: "Cancel", style: "cancel"}
                      ])}
                      style={styles.imagePreview}
                    >
                      {selectedImage ? (
                        <Image source={{ uri: selectedImage.uri }} style={styles.image} />
                      ) : (
                        <ImageIcon size={48} color={themeColors.textLight} />
                      )}
                    </TouchableOpacity>
                     <View style={styles.imagePickerButtons}>
                      <Button 
                          title="From Gallery" 
                          onPress={() => pickImage('gallery')} 
                          variant='outline' 
                          icon={<ImageIcon size={18} color={themeColors.primary} />}
                          style={{flex:1, marginRight: SPACING.xs}}
                          textStyle={{fontSize: FONT_SIZE.sm}}
                      />
                       <Button 
                          title="Use Camera" 
                          onPress={() => pickImage('camera')} 
                          variant='outline'
                          icon={<Camera size={18} color={themeColors.primary} />}
                          style={{flex:1, marginLeft: SPACING.xs}}
                          textStyle={{fontSize: FONT_SIZE.sm}}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.buttonGroup}>
                  <Button
                    title="Cancel"
                    onPress={() => router.back()}
                    variant="outline"
                    style={styles.cancelButton}
                    disabled={loading || isUploading}
                  />
                  <Button
                    title="Add Product"
                    onPress={() => handleSubmit()}
                    loading={loading || isUploading}
                    disabled={loading || isUploading}
                    style={styles.submitButton}
                  />
                </View>
              </>
            )}
          </Formik>
        </ScrollView>
        {(loading || isUploading) && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={{ marginTop: SPACING.sm, color: themeColors.background, fontFamily: 'Inter-Medium' }}>
              {isUploading ? 'Uploading image...' : 'Adding product...'}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}