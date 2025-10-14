import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            setLoading(false);
          } else {
            const { data: { session: newAnonymousSession }, error: signInError } = await supabase.auth.signInAnonymously();

            if (signInError) throw signInError;

            if (isMounted && newAnonymousSession) {
              setSession(newAnonymousSession);
              setUser(newAnonymousSession.user);
              setLoading(false);
            }
          }
        }
      } catch (error) {
        console.error("Authentication Error:", error);
        if (isMounted) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "Could not establish a secure session. Please refresh the page.",
          });
          setLoading(false);
        }
      }
    };

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
      }
    });
    
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
  }), [user, session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};