import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function ManageSubscription() {
  const [user, setUser] = useState(null);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Check user authentication and fetch subscription status
  useEffect(() => {
    const fetchUserAndSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        // Fetch subscription_id from app_users
        const { data, error } = await supabase
          .from('app_users')
          .select('subscription_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
          setError('Failed to load subscription status');
        } else if (data && data.subscription_id) {
          setSubscriptionId(data.subscription_id);
        }
      }
    };

    fetchUserAndSubscription();
  }, []);

  // Handle Google Sign-In
  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/manage-subscription' }
    });
    if (error) {
      console.error('Sign-in error:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!subscriptionId) {
      setError('No active subscription found.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('../../api/terminate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add Supabase auth token for verification
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({ subscriptionId })
      });
      console.log('API response:', response);
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel subscription');
      }

      setSubscriptionId(null);
      setError('Subscription canceled successfully.');
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manage Subscription</h1>

      {!user ? (
        <div>
          <p className="mb-4">Please sign in to manage your subscription.</p>
          <button
            onClick={handleSignIn}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Sign In with Google
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-4">
            {subscriptionId
              ? 'You have an active Pro subscription.'
              : 'No active subscription found.'}
          </p>
          {subscriptionId && (
            <>
              <button
                onClick={handleCancelSubscription}
                disabled={loading}
                className={`bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Canceling...' : 'Cancel Subscription'}
              </button>
              {error && <p className="text-red-500 mt-2">{error}</p>}
            </>
          )}
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-blue-500 underline"
          >
            Back to Home
          </button>
        </div>
      )}
    </div>
  );
}