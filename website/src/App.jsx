import React from 'react';

import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Plans } from './components/Plans';
import { Footer } from './components/Footer';

import { generatePaymentLink } from './services';
import { useAuth } from './hooks/useAuth';

import './styles/variables.css';
import './styles/global.css';

function App() {
  const { user, loading, error, handleSignIn, handleSignOut } = useAuth();

  const handlePaymentLink = () => {
    return generatePaymentLink(user?.id);
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onSignOut={handleSignOut} onSignIn={handleSignIn} />

      <main>
        <Hero user={user} onSignIn={handleSignIn} />

        <Plans 
          user={user} 
          onSignIn={handleSignIn} 
          generatePaymentLink={handlePaymentLink} 
        />

        {error && (
          <div className="text-center text-red-500 mt-4">
            {error}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;