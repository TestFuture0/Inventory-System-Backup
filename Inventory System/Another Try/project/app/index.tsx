import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export default function Index() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <LoadingScreen message="Starting up..." />;
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/login" />;
}