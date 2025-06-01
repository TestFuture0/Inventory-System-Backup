import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, TextInput, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { SPACING, FONT_SIZE, BORDER_RADIUS } from '@/constants/theme';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { Edit2, Trash2, AlertTriangle, Save, XCircle, ChevronLeft, ChevronDown, Image as ImageIcon, Camera, X } from 'lucide-react-native';
import { getCategories, Category as ProductCategory } from '@/lib/categoryService';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import * as tus from 'tus-js-client';

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

  // State for new image selection
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // State for category selection
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  // START: Image Picker and Upload Functions (adapted from add-product.tsx)
  const requestMediaLibraryPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are needed to select images.');
        return false;
      }
      return true;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permissions are needed to take photos.');
        return false;
      }
      return true;
    }
    return true;
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
        quality: 1, 
      });
    } else {
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) return;
      result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImageForEdit(result.assets[0]);
      setImageUrl(result.assets[0].uri); // Update imageUrl for preview immediately
      console.log('[ProductDetails] New image selected for edit, URI:', result.assets[0].uri);
    }
  };

  const compressImage = async (uri: string): Promise<string | null> => {
    try {
      console.log('[ProductDetails] Compressing image:', uri);
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], 
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      console.log('[ProductDetails] Compressed image URI:', manipResult.uri);
      return manipResult.uri;
    } catch (error) {
      console.error('[ProductDetails] Image compression failed:', error);
      Alert.alert('Error', 'Failed to compress image.');
      return null;
    }
  };

  const uploadImageWithTus = async (
    imageAsset: ImagePicker.ImagePickerAsset,
    bucketName: string = 'product-images'
  ): Promise<string | null> => {
    setIsUploadingImage(true);
    console.log(`[ProductDetails.uploadImageWithTus] Starting image upload (Bucket: ${bucketName}). Asset URI: ${imageAsset.uri}`);
    
    try {
      const uri = imageAsset.uri;
      if (!uri) {
        console.error('[ProductDetails.uploadImageWithTus] Image asset URI is null or undefined.');
        throw new Error('Image asset URI is null or undefined.');
      }

      let contentType = imageAsset.mimeType;
      if (!contentType && imageAsset.fileName) {
        const extension = imageAsset.fileName.split('.').pop()?.toLowerCase();
        if (extension) {
          contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
        }
      }
      contentType = contentType || 'application/octet-stream';
      console.log(`[ProductDetails.uploadImageWithTus] Determined Content-Type: ${contentType}`);

      let fileExtension = uri.split('.').pop()?.toLowerCase();
      if (!fileExtension && imageAsset.fileName) {
        fileExtension = imageAsset.fileName.split('.').pop()?.toLowerCase();
      }
      fileExtension = fileExtension || 'jpg';

      const objectName = `public/product-${Date.now()}.${fileExtension}`;
      console.log(`[ProductDetails.uploadImageWithTus] Target Supabase objectName for TUS: ${objectName}`);

      const response = await fetch(uri);
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Failed to fetch asset for blob. Status: ${response.status}. Response: ${responseText}`);
      }
      const blob = await response.blob();
      const finalContentType = (blob.type && blob.type !== 'application/octet-stream') ? blob.type : contentType;
      console.log(`[ProductDetails.uploadImageWithTus] Blob created, size: ${blob.size}, type: ${blob.type}. Using Content-Type: ${finalContentType}`);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) throw new Error('User not authenticated for TUS upload.');
      const accessToken = session.access_token;
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL not defined.');
      
      const tusMetadata = { bucketName, objectName, contentType: finalContentType, cacheControl: '3600' };
      console.log('[ProductDetails.uploadImageWithTus] TUS Metadata:', tusMetadata);

      return new Promise((resolve, reject) => {
        const upload = new tus.Upload(blob, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: { authorization: `Bearer ${accessToken}`, 'x-upsert': 'true' },
          metadata: tusMetadata,
          chunkSize: 6 * 1024 * 1024, 
          uploadDataDuringCreation: true, 
          removeFingerprintOnSuccess: true,
          onError: (error) => {
            console.error('[ProductDetails.uploadImageWithTus] TUS onError:', error.message);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            console.log(`[ProductDetails.uploadImageWithTus] Progress: ${((bytesUploaded / bytesTotal) * 100).toFixed(2)}%`);
          },
          onSuccess: () => {
            const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(objectName);
            if (!publicUrlData || !publicUrlData.publicUrl) {
              reject(new Error('TUS: Upload successful but failed to get public URL.'));
              return;
            }
            console.log(`[ProductDetails.uploadImageWithTus] Success! Public URL: ${publicUrlData.publicUrl}`);
            resolve(publicUrlData.publicUrl);
          },
        });
        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
          upload.start();
        }).catch(reject);
      });
    } catch (error: any) {
      console.error('[ProductDetails.uploadImageWithTus] CATCH BLOCK:', error.message);
      Alert.alert('Upload Error', 'Image upload failed. Please try again.');
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };
  // END: Image Picker and Upload Functions

  // START: New Helper Function to get storage path
  const getStoragePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const urlObject = new URL(url);
      // Example URL: https://<project_ref>.supabase.co/storage/v1/object/public/product-images/public/product-123.jpg
      // We need the path after /object/public/product-images/, which is 'public/product-123.jpg'
      const pathSegments = urlObject.pathname.split('/');
      const bucketNameIndex = pathSegments.indexOf('product-images'); // Your bucket name

      if (bucketNameIndex !== -1 && bucketNameIndex < pathSegments.length - 1) {
        return pathSegments.slice(bucketNameIndex + 1).join('/');
      }
      console.warn('[getStoragePathFromUrl] Could not parse path from URL:', url);
      return null;
    } catch (e) {
      console.warn('[getStoragePathFromUrl] Invalid URL for parsing path:', url, e);
      return null;
    }
  };
  // END: New Helper Function

  const populateForm = (p: Product) => {
    setName(p.name || '');
    setPrice(p.price?.toString() || '');
    setCategory(p.category || '');
    setStock(p.stock_count?.toString() || '');
    setDescription(p.description || '');
    setSku(p.sku || '');
    setImageUrl(p.image_url || '');
    setSelectedImageForEdit(null);
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
    if (isEditMode) {
      fetchProductCategories();
    }
  }, [isEditMode, fetchProductCategories]);

  const handleEditToggle = () => {
    if (isEditMode && product) {
        populateForm(product);
    } else if (!isEditMode && product) {
        setSelectedImageForEdit(null);
        setImageUrl(product.image_url || '');
    }
    setIsEditMode(!isEditMode);
  };

  const handleSaveChanges = async () => {
    if (!product) return;
    setSaving(true);

    let finalImageUrl: string | null = imageUrl; // Holds the URL to be saved to DB
    let oldImageStoragePath: string | null = getStoragePathFromUrl(product.image_url); // Get path of current image in DB

    // Scenario 1: A new image is selected via ImagePicker
    if (selectedImageForEdit) {
      console.log('[ProductDetails.save] New image selected. Processing...');
      setIsUploadingImage(true);
      try {
        const compressedUri = await compressImage(selectedImageForEdit.uri);
        if (compressedUri) {
          const newAssetForUpload = { ...selectedImageForEdit, uri: compressedUri };
          const uploadedUrl = await uploadImageWithTus(newAssetForUpload);
          if (uploadedUrl) {
            finalImageUrl = uploadedUrl; // New URL for the DB
            console.log('[ProductDetails.save] New image uploaded. URL for DB:', finalImageUrl);
            // If the old image path was different, it's now orphaned (unless it was already null)
          } else {
            Alert.alert('Image Upload Failed', 'The new image could not be uploaded. No changes made to image.');
            finalImageUrl = product.image_url; // Revert to original DB image URL
            oldImageStoragePath = null; // Don't delete anything if upload failed
          }
        } else {
          Alert.alert('Image Compression Failed', 'Could not compress. No changes made to image.');
          finalImageUrl = product.image_url; // Revert
          oldImageStoragePath = null; // Don't delete
        }
      } catch (uploadError) {
        console.error('[ProductDetails.save] Error during new image processing:', uploadError);
        Alert.alert('Image Error', 'An error occurred with the new image. No changes made to image.');
        finalImageUrl = product.image_url; // Revert
        oldImageStoragePath = null; // Don't delete
      } finally {
        setIsUploadingImage(false);
      }
    } 
    // Scenario 2: No new image selected, but existing image was explicitly removed via UI
    // (imageUrl state is empty, but product.image_url was not empty)
    else if (imageUrl === '' && product.image_url) { 
      console.log('[ProductDetails.save] Image explicitly removed by user.');
      finalImageUrl = null; // Set to null for the DB
      // oldImageStoragePath already holds the path of the image to be deleted
    } 
    // Scenario 3: No new image, no removal, imageUrl state might have been edited manually (not via picker)
    // This path primarily handles if a user manually types/pastes a URL into the (now removed) text input.
    // For picker flow, if image is unchanged, finalImageUrl should equal product.image_url from populateForm
    // and oldImageStoragePath will correctly point to it, but we only delete if it *changes* or is set to null.
    else {
        // If finalImageUrl (from UI state) is different from product.image_url (original DB state)
        // and a new image wasn't picked (selectedImageForEdit is null),
        // it implies a manual URL change or no change. We don't want to delete the old one in this specific sub-case
        // unless finalImageUrl becomes null.
        if (finalImageUrl !== product.image_url) {
            // If URL changed manually and there was an old one, that old one is now orphaned by this logic path.
            // This case is less likely with the new picker UI. If finalImageUrl IS an actual new URL,
            // oldImageStoragePath is correct. If finalImageUrl is just the same old URL, no deletion happens.
        } else {
            // Image URL is the same as in DB, and no new image selected. No storage deletion needed.
            oldImageStoragePath = null; 
        }
    }

    // If the image URL that will be saved to the DB (finalImageUrl) 
    // is different from what was originally in the DB (product.image_url),
    // AND the original image_url was not null (meaning there was an old image to delete),
    // then oldImageStoragePath should be valid for deletion.
    // However, if a new image upload failed, oldImageStoragePath was set to null to prevent deletion.
    // And if image is unchanged, oldImageStoragePath was also nulled.
    // So, we only care about oldImageStoragePath if finalImageUrl IS NOT the same as product.image_url
    // This means an actual change (new image OR removal) happened.
    let pathToActuallyDelete = null;
    if (finalImageUrl !== product.image_url && oldImageStoragePath) {
        if (product.image_url) { // Ensure there *was* an old image_url
             pathToActuallyDelete = getStoragePathFromUrl(product.image_url); // Re-fetch to be sure
        }
    }
    // If a new image was uploaded, finalImageUrl is new. oldImageStoragePath (from product.image_url) should be deleted.
    // If image was removed, finalImageUrl is null. oldImageStoragePath (from product.image_url) should be deleted.
    // If image upload failed, finalImageUrl reverted to product.image_url, so they are same, pathToActuallyDelete remains null.
    // If image is unchanged, finalImageUrl is same as product.image_url, pathToActuallyDelete remains null.


    const updatedProductData: Partial<Product> = {
      name,
      price: parseFloat(price) || product.price,
      category: category || product.category,
      stock_count: parseInt(stock, 10) >= 0 ? parseInt(stock, 10) : product.stock_count,
      description: description,
      sku: sku,
      image_url: finalImageUrl, 
      updated_at: new Date().toISOString(),
    };
    Object.keys(updatedProductData).forEach(key => 
        (updatedProductData as any)[key] === undefined && delete (updatedProductData as any)[key]
    );
    if (updatedProductData.price !== undefined && isNaN(updatedProductData.price)) {
        Alert.alert('Invalid Input', 'Price must be a valid number.'); setSaving(false); return;
    }
    if (updatedProductData.stock_count !== undefined && isNaN(updatedProductData.stock_count)){
        Alert.alert('Invalid Input', 'Stock count must be a valid number.'); setSaving(false); return;
    }

    try {
      console.log('[ProductDetails.save] Updating product in DB with data:', updatedProductData);
      const { data: savedData, error: updateError } = await supabase
        .from('products')
        .update(updatedProductData)
        .eq('id', product.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      // If DB update is successful, then attempt to delete old storage object if necessary
      if (pathToActuallyDelete) {
        console.log('[ProductDetails.save] DB update successful. Attempting to delete old image from storage:', pathToActuallyDelete);
        try {
          const { error: deleteStorageError } = await supabase.storage
            .from('product-images')
            .remove([pathToActuallyDelete]);
          if (deleteStorageError) {
            console.warn('[ProductDetails.save] Failed to delete old image from storage:', deleteStorageError);
            Alert.alert('Cleanup Warning', 'Product updated, but failed to remove the old image from storage. It may need to be manually cleaned up later.');
          } else {
            console.log('[ProductDetails.save] Old image successfully deleted from storage:', pathToActuallyDelete);
          }
        } catch (storageError) {
            console.warn('[ProductDetails.save] Exception during old image deletion from storage:', storageError);
        }
      }

      if (savedData) {
        setProduct(savedData as Product);
        populateForm(savedData as Product); 
      }
      Alert.alert('Success', 'Product updated successfully!');
      setIsEditMode(false);
      setSelectedImageForEdit(null);
    } catch (e: any) {
      console.error('Error saving product:', e);
      Alert.alert('Error', e.message || "Failed to save product changes.");
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
    imageEditorContainer: {
      marginBottom: SPACING.lg,
      alignItems: 'center',
    },
    imagePreviewContainer: {
      width: 180, 
      height: 180,
      borderRadius: BORDER_RADIUS.lg,
      backgroundColor: themeColors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: themeColors.border,
      overflow: 'hidden', 
    },
    editableImage: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    imagePlaceholderText: {
      marginTop: SPACING.sm,
      color: themeColors.textLight,
      fontSize: FONT_SIZE.sm,
      textAlign: 'center',
    },
    imagePickerButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 400, 
      marginBottom: SPACING.sm,
    },
    removeImageButton: {
      marginTop: SPACING.sm,
      width: '100%',
      maxWidth: 400,
      borderColor: themeColors.error, 
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
        {isEditMode ? (
          <View style={styles.imageEditorContainer}> 
            <Text style={[styles.detailLabel, { marginBottom: SPACING.sm, width: 'auto' }]}>Product Image</Text>
            <TouchableOpacity onPress={() => pickImage('gallery')} style={styles.imagePreviewContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.editableImage} resizeMode="cover" />
              ) : (
                <View style={[styles.editableImage, styles.imagePlaceholder]}>
                  <ImageIcon size={48} color={themeColors.textLight} />
                  <Text style={styles.imagePlaceholderText}>Tap to select</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.imagePickerButtons}>
              <Button
                title="Gallery"
                onPress={() => pickImage('gallery')}
                icon={<ImageIcon size={16} color={themeColors.primary} />}
                variant="outline"
                style={{ flex: 1, marginRight: SPACING.sm }}
                textStyle={{ fontSize: FONT_SIZE.sm }}
              />
              <Button
                title="Camera"
                onPress={() => pickImage('camera')}
                icon={<Camera size={16} color={themeColors.primary} />}
                variant="outline"
                style={{ flex: 1, marginLeft: SPACING.sm }}
                textStyle={{ fontSize: FONT_SIZE.sm }}
              />
            </View>
            {imageUrl && (
              <Button
                title="Remove Image"
                onPress={() => {
                  setSelectedImageForEdit(null);
                  setImageUrl('');
                }}
                variant="outline"
                icon={<X size={16} color={themeColors.error} />}
                style={styles.removeImageButton}
                textStyle={{ fontSize: FONT_SIZE.sm, color: themeColors.error }}
              />
            )}
          </View>
        ) : product?.image_url ? (
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
              <Text style={styles.detailValue}>{product?.category}</Text>
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
                    product?.stock_count !== undefined && product.stock_count < 10 ? styles.lowStockText : null,
                  ]}
                >
                  {product?.stock_count} units
                </Text>
                {product?.stock_count !== undefined && product.stock_count < 10 && (
                  <View style={styles.lowStockBadge}>
                    <AlertTriangle size={12} color={themeColors.white} />
                    <Text style={styles.lowStockBadgeText}>Low</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          
          {isEditMode || product?.sku ? (
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
                <Text style={styles.detailValue}>{product?.sku}</Text>
              )}
            </View>
          ) : null}
          
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