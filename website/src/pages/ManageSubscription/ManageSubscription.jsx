import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services';
import Header from '../../components/Header';
import './ManageSubscription.css';

const ManageSubscription = () => {
  const [subscriptionId, setSubscriptionId] = React.useState(null);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const { user, handleSignIn, handleSignOut } = useAuth();

  // Check user authentication and fetch subscription status
  React.useEffect(() => {
    const fetchSubscription = async () => {
      if (user) {
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

    fetchSubscription();
  }, [user]);

  const handleCancelSubscription = async () => {
    if (!subscriptionId) {
      setError('No active subscription found.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/terminate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
        },
        body: JSON.stringify({ subscriptionId })
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message);
      } else {
        setSubscriptionId(null);
        setError('Subscription canceled successfully.');
      }
    } catch (err) {
      console.error('Cancellation error:', err);
      setError(err.message || 'Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Header user={user} onSignIn={handleSignIn} onSignOut={handleSignOut} />
      
      <div className="manage-subscription">
        <h1>Manage Subscription</h1>

        {!user ? (
          <div className="auth-prompt">
            <p>Please sign in to manage your subscription.</p>
            <button
              onClick={() => navigate('/')}
              className="back-button"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <div className="subscription-content">
            <p className="subscription-status">
              {subscriptionId
                ? 'You have an active Pro subscription.'
                : 'No active subscription found.'}
            </p>
            
            {subscriptionId && (
              <div className="subscription-actions">
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading}
                  className={`cancel-button ${loading ? 'loading' : ''}`}
                >
                  {loading ? 'Canceling...' : 'Cancel Subscription'}
                </button>
                {error && <p className="error-message">{error}</p>}
              </div>
            )}
            
            <button
              onClick={() => navigate('/')}
              className="back-button"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default ManageSubscription;