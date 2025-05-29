import { useState, useEffect } from 'react';
import { supabase } from '../services';
import { REDIRECT_URL } from '../utils/constants';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('No session found:', error.message);
          setUser(null);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (err) {
        console.error('Error fetching user session:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setError(null);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: REDIRECT_URL }
      });
      if (error) throw error;
    } catch (err) {
      setError('Sign-in failed. Please check your network and try again.');
      console.error(err);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (err) {
      setError('Sign-out failed. Please try again.');
      console.error(err);
    }
  };

  return { user, loading, error, handleSignIn, handleSignOut };
};
