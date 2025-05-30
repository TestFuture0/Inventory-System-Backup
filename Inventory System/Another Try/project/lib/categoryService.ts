import { supabase } from './supabase';

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Fetch all categories
export const getCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
  return data || [];
};

// Add a new category
export const addCategory = async (name: string): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([{ name }])
    .select()
    .single(); // Use single to get the newly created record directly

  if (error) {
    console.error('Error adding category:', error);
    throw error;
  }
  if (!data) {
    throw new Error('Failed to add category, no data returned.');
  }
  return data;
};

// Update an existing category
export const updateCategory = async (id: string, name: string): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating category:', error);
    throw error;
  }
  if (!data) {
    throw new Error('Failed to update category, no data returned.');
  }
  return data;
};

// Delete a category
export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}; 