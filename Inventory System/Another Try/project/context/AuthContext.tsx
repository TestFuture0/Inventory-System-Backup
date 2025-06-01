import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserRole = 'admin' | 'employee' | null;

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  userRole: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  userRole: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getUserRole = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setUserRole(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role for user ID:', userId, error);
        setUserRole(null);
        return;
      }

      if (data) {
        console.log('Supabase returned role:', data.role, 'for user ID:', userId);
        setUserRole(data.role as UserRole);
      } else {
        console.warn('No user profile/role found in Supabase for user ID:', userId);
        setUserRole(null);
      }
    } catch (error) {
        console.error('Exception during getUserRole for user ID:', userId, error);
        setUserRole(null);
    }
  }, [setUserRole]);

  const signOut = useCallback(async () => {
    // console.log('Attempting to sign out...');
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Supabase signOut error object:', error);
        console.error('Supabase signOut error:', error.message);
      }
      
      setUser(null);
      setSession(null);
      setUserRole(null);

      // DO NOT Clear theme preferences from AsyncStorage to persist theme
      // try {
      //   await AsyncStorage.removeItem('themeMode');
      //   await AsyncStorage.removeItem('isSystemTheme');
      //   console.log('Theme preferences cleared on signOut.'); // This log would be removed too
      // } catch (e) {
      //   console.error('Failed to clear theme preferences on signOut:', e);
      // }
      
      router.replace('/auth/login');
    } catch (error: any) {
      console.error('Error in signOut function:', error.message);
      setUser(null);
      setSession(null);
      setUserRole(null);
      router.replace('/auth/login');
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setUser, setSession, setUserRole, router]);

  // Check for session on mount & Listen for auth changes
  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    const fetchInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error && isMounted) {
            console.error("Error fetching initial session:", error);
            // Potentially set user/session to null here if appropriate
            setUser(null);
            setSession(null);
            await getUserRole(undefined); // Ensure role is cleared
        } else if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          await getUserRole(initialSession?.user?.id); // Wait for role
        }
      } catch (e) {
        if (isMounted) {
          console.error("Exception fetching initial session:", e);
          setUser(null);
          setSession(null);
          await getUserRole(undefined);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // Set loading false after initial session and role attempt
        }
      }
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (isMounted) {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          await getUserRole(currentSession?.user?.id);
          // isLoading should generally be managed by initial load or specific actions like signIn/signOut
        }
      }
    );

    // Auto logout after 8 hours
    const logoutTimer = setTimeout(() => {
      if (session && isMounted) { 
        signOut();
      }
    }, 8 * 60 * 60 * 1000); // 8 hours

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
      clearTimeout(logoutTimer);
    };
  }, [getUserRole, signOut]); // Added signOut to dependencies

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      router.replace('/(tabs)');
    } catch (error: any) {
      throw new Error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, router]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        throw error;
      }
      setSession(data.session);
      setUser(data.user);
      getUserRole(data.user?.id);
    } catch (error) {
      console.error('Error refreshing session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setSession, setUser, getUserRole]);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        userRole,
        isLoading, 
        signIn, 
        signOut,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}