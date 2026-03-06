// src/lib/AuthContext.jsx
// Full replacement for Base44 AuthContext using Supabase Auth

import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      setIsLoadingAuth(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
        setIsLoadingAuth(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── LOGIN with email + password ──────────────────────────
  const login = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: 'auth_error', message: error.message });
      throw error;
    }
    return data;
  };

  // ── OFFICER PIN LOGIN (clock-in flow) ────────────────────
  // Officers log in with employee_id + PIN (not email/password)
  // This checks the officers table directly
  const officerPinLogin = async (companyCode, employeeId, pin) => {
    const { data, error } = await supabase
      .from('officers')
      .select('*')
      .eq('company_code', companyCode)
      .eq('employee_id', employeeId)
      .eq('pin', pin)
      .single();
    if (error || !data) throw new Error('Invalid employee ID or PIN');
    return data;
  };

  // ── CANDIDATE PIN LOGIN ──────────────────────────────────
  const candidatePinLogin = async (companyCode, candidateId, pin) => {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('company_code', companyCode)
      .eq('candidate_id', candidateId)
      .eq('pin', pin)
      .single();
    if (error || !data) throw new Error('Invalid candidate ID or PIN');
    return data;
  };

  // ── SIGN UP ──────────────────────────────────────────────
  const signUp = async (email, password, metadata = {}) => {
    setAuthError(null);
    // metadata should include: { full_name, company_code, role }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) {
      setAuthError({ type: 'signup_error', message: error.message });
      throw error;
    }
    return data;
  };

  // ── LOGOUT ───────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
  };

  // ── PASSWORD RESET ───────────────────────────────────────
  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
  };

  // ── GET COMPANY CODE from current user ───────────────────
  const getCompanyCode = () => {
    return user?.user_metadata?.company_code ?? null;
  };

  // ── GET ROLE from current user ───────────────────────────
  const getRole = () => {
    return user?.user_metadata?.role ?? null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoadingAuth,
      authError,
      login,
      logout,
      signUp,
      resetPassword,
      officerPinLogin,
      candidatePinLogin,
      getCompanyCode,
      getRole,
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
