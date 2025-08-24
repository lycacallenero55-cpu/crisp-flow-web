import { createClient, type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Supabase configuration
const supabaseUrl = 'https://bjqvyoujvjzodtwlqlal.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcXZ5b3Vqdmp6b2R0d2xxbGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMjMyMDQsImV4cCI6MjA2OTg5OTIwNH0.BzQ0wpsO2NEXRXxe66F7J2aeSEoKossrIgUyCo7tpJE';

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // This will save the session in localStorage
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-application-name': 'attendance-system' },
  },
});

// Helper to get the current user with profile data
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return { user: null, error };
  
  // Get additional profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    user: {
      id: user.id,
      email: user.email || '',
      name: profile?.full_name || user.user_metadata?.full_name || '',
      role: profile?.role || 'user',
      avatar_url: profile?.avatar_url || '',
    },
    error,
  };
};

// Authentication functions
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) return { data: null, error };
  
  // Get the full user profile after successful login
  const { user: fullUser, error: profileError } = await getCurrentUser();
  return { data: fullUser, error: profileError };
};

export const signUpWithEmail = async (email: string, password: string, userData: { name: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: userData.name,
      },
    },
  });
  
  if (error) return { data: null, error };
  
  // Create a profile for the new user
  if (data.user) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      full_name: userData.name,
      role: 'user', // Default role
    });
  }
  
  return { data, error: null };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/update-password`,
  });
  return { error };
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
};

// File upload helper
export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);
  
  return { ...data, publicUrl };
};

// Subscribe to auth state changes
export const onAuthStateChange = (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

// Helper to get public URL for a file
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};
