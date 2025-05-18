import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import './styles.css'; // Your provided CSS

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const REACT_APP_TEST_MODE = process.env.REACT_APP_TEST_MODE === 'true';

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (err) {
        setError('Failed to load user. Please try refreshing the page.');
        console.error(err);
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
        options: { redirectTo: 'https://linkedin-auto-comment.vercel.app/' }
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

    const generatePaymentLink = () => {
    if (!user || typeof user.id !== 'string' || !user.id) {
      console.log('User data not fully loaded yet');
      return '#';
    }
    const userId = user.id;
    const baseUrl = `https://store.payproglobal.com/checkout?products[1][id]=112482&x-user_id=${userId}`;
    return REACT_APP_TEST_MODE ? `${baseUrl}&use-test-mode=true` : baseUrl;
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <header>
        <div className="logo-container">
          <img src="/logo.png" alt="Logo" /> {/* Placeholder logo */}
          <h1>LinkedIn Auto Comment</h1>
        </div>
        <nav>
          <ul>
            <li><a href="#features">Features</a></li>
            <li><a href="#plans">Plans</a></li>
          </ul>
        </nav>
        <div className="auth-buttons">
          {user && (
            <button onClick={handleSignOut} className="sign-out-btn">
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h2>Boost Your LinkedIn Presence</h2>
            <p>Automate comments and engage effortlessly.</p>
            {!user && (
              <div className="hero-cta">
                <button onClick={handleSignIn} className="primary-btn">
                  Sign In with Google
                </button>
              </div>
            )}
          </div>
          <div className="hero-image">
            <img src="/hero-image.png" alt="Hero" /> {/* Placeholder image */}
          </div>
        </section>

        <section id="plans" className="plans">
          <h2>Plans</h2>
          <div className="plan-box" id="free-plan">
            <h3>Free</h3>
            <div className="price">$0/month</div>
            <ul>
              <li><i className="fas fa-check"></i> Basic features</li>
              <li><i className="fas fa-check"></i> Limited comments</li>
            </ul>
            <a href="https://chromewebstore.google.com/detail/placeholder" className="btn">
              Get Extension
            </a>
          </div>
          <div className="plan-box">
            <h3>Pro</h3>
            <div className="price">$10/month</div>
            <ul>
              <li><i className="fas fa-check"></i> Unlimited comments</li>
              <li><i className="fas fa-check"></i> Priority support</li>
            </ul>
            {user ? (
              <a href={generatePaymentLink()} className="btn">
                Upgrade to Pro
              </a>
            ) : (
              <button onClick={handleSignIn} className="btn">
                Sign In to Upgrade
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="text-center text-red-500 mt-4">
            {error}
          </div>
        )}
      </main>

      <footer>
        <div className="footer-content">
          <div className="footer-section">
            <h3>LinkedIn Auto Comment</h3>
            <p>© 2023 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;