import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext'; // Import useTheme
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { router, Stack } from 'expo-router';
import { getCategories, addCategory, updateCategory, deleteCategory, Category } from '@/lib/categoryService';
import { X, Edit3, Trash2, Plus } from 'lucide-react-native';

export default function ManageCategoriesScreen() {
  const { userRole } = useAuth();
  const { themeColors } = useTheme(); // Get theme colors
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch categories.');
      Alert.alert('Error', e.message || 'Failed to fetch categories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userRole !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can manage categories.');
      router.back();
      return;
    }
    loadCategories();
  }, [userRole, loadCategories]);

  const openModal = (mode: 'add' | 'edit', category?: Category) => {
    setModalMode(mode);
    setCurrentCategory(category || null);
    setCategoryNameInput(category ? category.name : '');
    setError(null); // Clear previous errors
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setCategoryNameInput('');
    setCurrentCategory(null);
  };

  const handleSaveCategory = async () => {
    if (!categoryNameInput.trim()) {
      Alert.alert('Validation Error', 'Category name cannot be empty.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        await addCategory(categoryNameInput.trim());
        Alert.alert('Success', 'Category added successfully.');
      } else if (currentCategory) {
        await updateCategory(currentCategory.id, categoryNameInput.trim());
        Alert.alert('Success', 'Category updated successfully.');
      }
      closeModal();
      loadCategories(); // Refresh list
    } catch (e: any) {
      setError(e.message || (modalMode === 'add' ? 'Failed to add category.' : 'Failed to update category.'));
      Alert.alert('Error', e.message || (modalMode === 'add' ? 'Failed to add category.' : 'Failed to update category.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = (category: Category) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete the category "${category.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true); // Indicate loading for the delete operation
            try {
              await deleteCategory(category.id);
              Alert.alert('Success', 'Category deleted successfully.');
              loadCategories(); // Refresh list
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete category.');
              setLoading(false); // Ensure loading is stopped on error
            }
          },
        },
      ]
    );
  };
  
  // Define styles inside the component
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: themeColors.background, // Ensure centered view also uses theme background
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: themeColors.text,
      fontFamily: 'Inter-Regular',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
      backgroundColor: themeColors.surface, // Optional: for a slightly different header background
    },
    backButton: {
      padding: 8,
    },
    title: {
      fontSize: 20,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
    },
    addButton: {
      padding: 8,
    },
    errorTextCentral: {
      color: themeColors.error,
      textAlign: 'center',
      padding: 16,
      fontFamily: 'Inter-Regular',
    },
    emptyText: {
      fontSize: 16,
      color: themeColors.textLight,
      fontFamily: 'Inter-Regular',
    },
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    categoryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    categoryName: {
      fontSize: 16,
      color: themeColors.text,
      fontFamily: 'Inter-Medium',
    },
    actions: {
      flexDirection: 'row',
    },
    actionButton: {
      padding: 8,
      marginLeft: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)', // Darker overlay for better glass effect
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      backgroundColor: themeColors.surface, // Themed surface for modal
      borderRadius: 12,
      padding: 20,
      elevation: 5,
      shadowColor: themeColors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: themeColors.text,
      marginBottom: 15,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: themeColors.text,
      backgroundColor: themeColors.background, // Slightly different background for input on surface
      marginBottom: 15,
      minHeight: 48,
    },
    errorTextModal: {
      color: themeColors.error,
      fontSize: 14,
      marginBottom: 10,
      textAlign: 'center',
      fontFamily: 'Inter-Regular',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 10,
    },
    modalButton: {
      flex: 1,
      marginHorizontal: 5,
    },
  });

  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (userRole !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
            <Text style={{color: themeColors.text, fontFamily: 'Inter-Regular'}}>Access Denied. Admins only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Categories</Text>
        <TouchableOpacity onPress={() => openModal('add')} style={styles.addButton}>
          <Plus size={28} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      {error && !loading && <Text style={styles.errorTextCentral}>{error}</Text>}
      
      {categories.length === 0 && !loading && !error && (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No categories found. Add some!</Text>
        </View>
      )}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>{item.name}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openModal('edit', item)} style={styles.actionButton}>
                <Edit3 size={20} color={themeColors.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCategory(item)} style={styles.actionButton}>
                <Trash2 size={20} color={themeColors.error} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadCategories}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalMode === 'add' ? 'Add New Category' : 'Edit Category'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Category Name"
              placeholderTextColor={themeColors.textLight} // Themed placeholder
              value={categoryNameInput}
              onChangeText={setCategoryNameInput}
              autoFocus
            />
            {error && <Text style={styles.errorTextModal}>{error}</Text>}
            <View style={styles.modalActions}>
              <Button title="Cancel" onPress={closeModal} variant="outline" style={styles.modalButton} />
              <Button 
                title={modalMode === 'add' ? 'Add' : 'Save Changes'} 
                onPress={handleSaveCategory} 
                loading={isSubmitting} 
                disabled={isSubmitting}
                style={styles.modalButton} 
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Original styles are removed
