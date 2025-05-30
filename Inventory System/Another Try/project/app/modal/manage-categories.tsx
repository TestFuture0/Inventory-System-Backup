import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/theme';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { getCategories, addCategory, updateCategory, deleteCategory, Category } from '@/lib/categoryService';
import { X, Edit3, Trash2, Plus } from 'lucide-react-native';
import { Stack } from 'expo-router';

export default function ManageCategoriesScreen() {
  const { userRole } = useAuth();
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

  if (loading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (userRole !== 'admin') {
    // This check is mainly for the initial load, useEffect handles redirection
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
            <Text>Access Denied. Admins only.</Text>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Categories</Text>
        <TouchableOpacity onPress={() => openModal('add')} style={styles.addButton}>
          <Plus size={28} color={COLORS.primary} />
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
                <Edit3 size={20} color={COLORS.accent} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteCategory(item)} style={styles.actionButton}>
                <Trash2 size={20} color={COLORS.error} />
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
              placeholderTextColor={COLORS.gray}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
  },
  addButton: {
    padding: 8,
  },
  errorTextCentral: {
    color: COLORS.error,
    textAlign: 'center',
    marginVertical: 10,
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryName: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
    flex: 1, // Allow name to take available space
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 16,
    padding: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: COLORS.text,
    fontFamily: 'Inter-Bold',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    color: COLORS.text,
    fontFamily: 'Inter-Regular',
  },
  errorTextModal: {
      color: COLORS.error,
      fontSize: 14,
      marginBottom: 10,
      textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
  }
}); 