import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type SignUpRole = Exclude<AppRole, 'admin'>;

type Profile = Database['public']['Tables']['profiles']['Row'];
type DriverProfile = Database['public']['Tables']['driver_profiles']['Row'];
type ProfileUpdate = Partial<Pick<
  Profile,
  'name' | 'phone' | 'province' | 'nearest_town' | 'farm_name' | 'avatar_url' | 'preferred_language'
>>;

const isEmailVerified = (user: User) => Boolean(user.email_confirmed_at);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  driverProfile: DriverProfile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, role: SignUpRole, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  refreshDriverProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRequestId = useRef(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const requestId = ++profileRequestId.current;

    const [{ data: profileData, error: profileError }, { data: roleData, error: roleError }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    if (requestId !== profileRequestId.current) return;

    if (profileError) {
      console.error('Profile load error:', profileError);
    }
    if (roleError) {
      console.error('Role load error:', roleError);
    }

    setProfile(profileData ?? null);
    setRole(roleData?.role ?? null);
    setDriverProfile(null);
    
    if (roleData?.role === 'driver') {
      const { data: driverData, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (requestId !== profileRequestId.current) return;

      if (driverError) {
        console.error('Driver profile load error:', driverError);
      }

      setDriverProfile(driverData ?? null);
    }
  }, []);

  const refreshDriverProfile = useCallback(async () => {
    if (!user) return;
    
    const { data: driverData, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Driver profile refresh error:', error);
      return;
    }

    setDriverProfile(driverData ?? null);
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await fetchProfile(user.id);
  }, [fetchProfile, user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user && !isEmailVerified(session.user)) {
          setSession(null);
          setUser(null);
          profileRequestId.current++;
          setProfile(null);
          setDriverProfile(null);
          setRole(null);
          void supabase.auth.signOut();
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          profileRequestId.current++;
          setProfile(null);
          setDriverProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isEmailVerified(session.user)) {
        void supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setDriverProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (!error && data.user && !isEmailVerified(data.user)) {
      await supabase.auth.signOut();
      return { error: new Error('Please verify your email before signing in.') };
    }
    return { error: error as Error | null };
  };

  const signInWithGoogle = async (redirectTo: string) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, name: string, userRole: SignUpRole, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim() || undefined;
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      return { error: new Error('Name is required') };
    }
    if (password.length < 8) {
      return { error: new Error('Password must be at least 8 characters') };
    }

    // Provisioning of profile + user_roles is handled atomically by the
    // `handle_new_user` trigger on auth.users using raw_user_meta_data below.
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: trimmedName,
          phone: trimmedPhone ?? null,
          role: userRole,
        },
      },
    });

    if (error) return { error: error as Error };
    if (data.session?.user && !isEmailVerified(data.session.user)) {
      await supabase.auth.signOut();
      return { error: new Error('Please verify your email before continuing.') };
    }
    return { error: null };
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    profileRequestId.current++;
    setUser(null);
    setSession(null);
    setProfile(null);
    setDriverProfile(null);
    setRole(null);
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && profile) {
      setProfile({ ...profile, ...updates });
    }

    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      driverProfile,
      role,
      loading,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      refreshDriverProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
