import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="add-product" options={{ title: 'Add Product', presentation: 'modal' }} />
      <Stack.Screen name="product-details" options={{ title: 'Product Details', presentation: 'modal' }} />
      <Stack.Screen name="checkout" options={{ title: 'Checkout', presentation: 'modal' }} />
      <Stack.Screen name="manage-categories" options={{ title: 'Manage Categories', presentation: 'modal' }} />
      <Stack.Screen name="account-details" options={{ title: 'Account Details', presentation: 'modal' }} />
      <Stack.Screen name="app-settings" options={{ title: 'App Settings', presentation: 'modal' }} />
    </Stack>
  );
}