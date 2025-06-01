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
import { Asset } from 'expo-asset';
import * as tus from 'tus-js-client';

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

  // Renamed and refactored for dynamic images using TUS
  const uploadImageWithTus = async (
    imageAsset: ImagePicker.ImagePickerAsset,
    bucketName: string = 'product-images'
  ): Promise<string | null> => {
    setIsUploading(true);
    console.log(`[uploadImageWithTus] Starting image upload with TUS (Bucket: ${bucketName}). Asset URI: ${imageAsset.uri}`);
    
    try {
      const uri = imageAsset.uri; // URI from the (potentially compressed) ImagePickerAsset
      if (!uri) {
        console.error('[uploadImageWithTus] Image asset URI is null or undefined.');
        throw new Error('Image asset URI is null or undefined.');
      }

      // Determine content type
      let contentType = imageAsset.mimeType; // Prefer mimeType from ImagePickerAsset
      if (!contentType && imageAsset.fileName) {
        const extension = imageAsset.fileName.split('.').pop()?.toLowerCase();
        if (extension) {
          contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        }
      }
      contentType = contentType || 'application/octet-stream'; // Fallback
      console.log(`[uploadImageWithTus] Determined Content-Type: ${contentType}`);

      // Determine file extension from URI or filename, default to 'jpg' (as compression often goes to JPEG)
      let fileExtension = uri.split('.').pop()?.toLowerCase();
      if (!fileExtension && imageAsset.fileName) {
        fileExtension = imageAsset.fileName.split('.').pop()?.toLowerCase();
      }
      fileExtension = fileExtension || 'jpg';


      const objectName = `public/product-${Date.now()}.${fileExtension}`;
      console.log(`[uploadImageWithTus] Target Supabase objectName for TUS: ${objectName}`);

      console.log(`[uploadImageWithTus] Fetching blob from URI: ${uri}...`);
      const response = await fetch(uri);
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`[uploadImageWithTus] Failed to fetch asset for blob. Status: ${response.status}. Response: ${responseText}`);
        throw new Error(`Failed to fetch asset for blob. Status: ${response.status}`);
      }
      const blob = await response.blob();
      
      // Use blob.type if available and valid, otherwise stick with determined contentType
      const finalContentType = (blob.type && blob.type !== 'application/octet-stream') ? blob.type : contentType;
      console.log(`[uploadImageWithTus] Blob created, size: ${blob.size}, type from blob: ${blob.type}. Using Content-Type: ${finalContentType}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        throw new Error('User not authenticated or access token unavailable for TUS upload.');
      }
      const accessToken = session.access_token;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('EXPO_PUBLIC_SUPABASE_URL is not defined for TUS upload.');
      }
      
      const tusMetadata = {
        bucketName: bucketName,
        objectName: objectName, 
        contentType: finalContentType,
        cacheControl: '3600',
      };
      console.log('[uploadImageWithTus] TUS Metadata to be used:', tusMetadata);

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-upsert': 'true', 
          },
          metadata: tusMetadata,
          chunkSize: 6 * 1024 * 1024, 
          uploadDataDuringCreation: true, 
          removeFingerprintOnSuccess: true, 
          onError: (error) => {
            console.error('[uploadImageWithTus] TUS onError:', error);
            console.error('[uploadImageWithTus] TUS onError (message):', error.message);
            const tusError = error as any;
            if (tusError.originalRequest) {
              console.error('[uploadImageWithTus] TUS Original Request that failed:', tusError.originalRequest);
            }
            if (tusError.originalResponse) {
              console.error('[uploadImageWithTus] TUS Original Response that failed:', tusError.originalResponse);
              if (tusError.originalResponse._xhr && tusError.originalResponse._xhr.responseText) {
                 console.error('[uploadImageWithTus] TUS Failed Response Text (from _xhr):', tusError.originalResponse._xhr.responseText);
              } else {
                 console.warn('[uploadImageWithTus] TUS: originalResponse._xhr.responseText not found.');
              }
            } else {
                console.warn('[uploadImageWithTus] TUS: error.originalResponse was not available.');
            }
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
            console.log(`[uploadImageWithTus] TUS onProgress: ${bytesUploaded} / ${bytesTotal} (${percentage}%)`);
          },
          onSuccess: () => {
            console.log(`[uploadImageWithTus] TUS onSuccess: Upload completed for ${objectName}`);
            const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectName);
            if (!publicUrlData || !publicUrlData.publicUrl) {
              console.error('[uploadImageWithTus] TUS: Could not get public URL. PublicUrlData:', publicUrlData);
              reject(new Error('TUS: Upload successful but failed to get public URL.'));
              return;
            }
            console.log(`[uploadImageWithTus] TUS: Public URL: ${publicUrlData.publicUrl}`);
            resolve(publicUrlData.publicUrl);
          },
        });

        console.log('[uploadImageWithTus] TUS: Attempting to find previous uploads...');
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) {
            console.log('[uploadImageWithTus] TUS: Found previous uploads, attempting to resume:', previousUploads);
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          console.log('[uploadImageWithTus] TUS: Starting upload...');
          upload.start();
        }).catch(err => {
            console.error('[uploadImageWithTus] TUS: Error in findPreviousUploads or start:', err);
            reject(err);
        });
      });

    } catch (error: any) {
      console.error('[uploadImageWithTus] CATCH BLOCK: Image upload process failed.');
      Alert.alert('Upload Error', 'An unexpected error occurred during image upload. Please try again.');
      console.error('[uploadImageWithTus] Error Name:', error.name);
      console.error('[uploadImageWithTus] Error Message:', error.message);
      if (error.stack) {
          console.error('[uploadImageWithTus] Error Stack:', error.stack);
      }
      return null;
    } finally {
      setIsUploading(false);
      console.log(`[uploadImageWithTus] Image upload process ended.`);
    }
  };

  const handleAddProduct = async (values: any, { resetForm }: { resetForm: () => void }) => {
    console.log('[AddProduct] Initiating add product...');
    setLoading(true); 

    let imageUrl: string | null = null;
    let processedImageAsset: ImagePicker.ImagePickerAsset | null = selectedImage;

    if (selectedImage) {
      console.log('[AddProduct] Selected image found. Attempting compression...');
      try {
        const compressedUri = await compressImage(selectedImage.uri);
        if (compressedUri) {
          console.log('[AddProduct] Image compressed successfully. URI:', compressedUri);
          processedImageAsset = { 
            ...selectedImage, 
            uri: compressedUri, 
            mimeType: 'image/jpeg', 
            fileName: selectedImage.fileName ? selectedImage.fileName.replace(/\.[^/.]+$/, ".jpg") : `compressed-${Date.now()}.jpg`,
          };
        } else {
          console.warn('[AddProduct] Image compression failed or returned null URI. Will attempt to upload original.');
        }
      } catch (compressionError) {
        console.error('[AddProduct] Error during image compression:', compressionError);
        Alert.alert('Compression Error', 'Failed to compress image. Attempting to upload original.');
      }

      if (processedImageAsset) {
          imageUrl = await uploadImageWithTus(processedImageAsset, 'product-images'); 

      if (!imageUrl) {
          Alert.alert('Image Upload Failed', 'The selected image could not be uploaded. Please try again or add the product without an image.');
        } else {
          console.log('[AddProduct] Image uploaded successfully. URL:', imageUrl);
        }
      }
    } else {
      console.log('[AddProduct] No image selected.');
    }
    
    try {
      console.log('[AddProduct] Submitting product data to Supabase...');
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: values.name,
          price: parseFloat(values.price),
          category: values.category,
          stock_count: parseInt(values.stockCount),
          description: values.description,
          sku: values.sku,
          image_url: imageUrl, 
        })
        .select();

      if (productError) {
        console.error('[AddProduct] Supabase product insert error:', productError);
        throw productError;
      }

      console.log('[AddProduct] Product added successfully to Supabase:', productData);
      Alert.alert('Success', 'Product added successfully!', [
        { text: 'OK', onPress: () => {
            resetForm();
            setSelectedImage(null); 
            router.back();
          } 
        }
      ]);
    } catch (error: any) {
      console.error('[AddProduct] Error during product submission:', error);
      Alert.alert('Product Submission Error', error.message || 'Failed to add product.');
    } finally {
      setLoading(false);
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
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
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
                  <Text style={styles.label}>Product Image</Text>
                  <View style={styles.imagePickerContainer}>
                    <TouchableOpacity onPress={() => pickImage('gallery')} style={styles.imagePreview}>
                      {selectedImage ? (
                        <Image source={{ uri: selectedImage.uri }} style={styles.image} />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <ImageIcon size={48} color={themeColors.textLight} />
                          <Text style={[styles.placeholderText, { marginTop: SPACING.sm }]}>Tap to select</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.imagePickerButtons}>
                      <Button
                        title="From Gallery"
                        onPress={() => pickImage('gallery')}
                        icon={<ImageIcon size={18} color={themeColors.primary} />}
                        variant="outline"
                        style={{ flex: 1, marginRight: SPACING.sm }}
                        textStyle={{ fontSize: FONT_SIZE.sm }}
                      />
                      <Button
                        title="Use Camera"
                        onPress={() => pickImage('camera')}
                        icon={<Camera size={18} color={themeColors.primary} />}
                        variant="outline"
                        style={{ flex: 1, marginLeft: SPACING.sm }}
                        textStyle={{ fontSize: FONT_SIZE.sm }}
                      />
                    </View>
                    {selectedImage && (
                      <Button
                        title="Remove Image"
                        onPress={() => setSelectedImage(null)}
                        variant="outline"
                        icon={<X size={18} color={themeColors.error} />}
                        style={{ 
                          marginTop: SPACING.md, 
                          width: '100%', 
                          borderColor: themeColors.error 
                        }}
                        textStyle={{ fontSize: FONT_SIZE.sm, color: themeColors.error }}
                      />
                    )}
                  </View>
                </View>

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