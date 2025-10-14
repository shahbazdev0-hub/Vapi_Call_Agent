import { supabase } from '../lib/customSupabaseClient';

/**
 * Sign up a new user
 */
export const signUp = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
};

/**
 * Sign in existing user
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

/**
 * Sign out current user
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error };
  }
};

/**
 * Get current session
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return { session, error: null };
  } catch (error) {
    console.error('Get session error:', error);
    return { session: null, error };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }
};

/**
 * Get user's orders
 */
export const getUserOrders = async (userEmail) => {
  try {
    console.log('Fetching orders for email:', userEmail);
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .ilike('customer_email', userEmail)  // Changed from .eq to .ilike
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get orders error:', error);
      throw error;
    }
    
    console.log('Orders found:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Get orders error:', error);
    return { data: null, error };
  }
};

/**
 * Get call report for an order
 */
export const getCallReport = async (orderId) => {
  try {
    const { data, error } = await supabase
      .from('calls')
      .select(`
        *,
        leads (
          name,
          phone,
          company,
          email
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Get call report error:', error);
    return { data: null, error };
  }
};

export default {
  signUp,
  signIn,
  signOut,
  getSession,
  getCurrentUser,
  getUserOrders,
  getCallReport,
};