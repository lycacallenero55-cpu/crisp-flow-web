import { type Session, type AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
export { supabase };

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
      name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      role: (profile as any)?.role || 'ssg_officer',
      avatar_url: (profile as any)?.avatar_url || '',
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
  
  // Create a profile for the new user (trigger also handles this)
  if (data.user) {
    const [firstName, ...rest] = (userData.name || '').split(' ');
    const lastName = rest.join(' ');
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email || email,
      first_name: firstName,
      last_name: lastName,
      role: 'ssg_officer',
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
