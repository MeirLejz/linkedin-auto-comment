import React, { useState } from 'react';
import { CHROME_STORE_URL } from '../utils/constants';
import { Menu, X } from 'lucide-react';

const Header = ({ user, onSignIn, onSignOut }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Extract first name from user object
  const getFirstName = () => {
    if (!user) return '';
    // Try to get from user_metadata
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name;
    if (fullName) return fullName.split(' ')[0];
    // Fallback to email prefix
    if (user.email) return user.email.split('@')[0];
    return '';
  };

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-200">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-10 w-10 mr-2"
            />
            <span className="font-bold text-xl">
              <span className="text-primary">Ava</span>AI
            </span>
          </div>
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors">Features</a>
            <a href="#plans" className="text-gray-600 hover:text-primary transition-colors">Plans</a>
          </nav>
          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <span className="text-gray-700 font-medium mr-2">
                Hello, {getFirstName()}
              </span>
            )}
            {user ? (
              <button onClick={onSignOut} className="text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium">
                Sign Out
              </button>
            ) : (
              <button onClick={onSignIn} className="text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium">
                Sign In with Google
              </button>
            )}
            <a href={CHROME_STORE_URL} className="bg-primary hover:bg-primary/90 text-white shadow-md px-4 py-2 rounded font-medium transition-colors">
              Get Started Free
            </a>
          </div>
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              className="text-gray-600 hover:text-primary p-2 rounded"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden p-4 bg-white border-b">
          <nav className="flex flex-col space-y-4">
            <a href="#features" className="text-gray-600 hover:text-primary transition-colors py-2">Features</a>
            <a href="#plans" className="text-gray-600 hover:text-primary transition-colors py-2">Plans</a>
            <div className="pt-2 space-y-2">
              {user && (
                <span className="block text-gray-700 font-medium mb-2">
                  Hello, {getFirstName()}
                </span>
              )}
              {user ? (
                <button onClick={onSignOut} className="w-full text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium">
                  Sign Out
                </button>
              ) : (
                <button onClick={onSignIn} className="w-full text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium">
                  Sign In with Google
                </button>
              )}
              <a href={CHROME_STORE_URL} className="w-full block bg-primary hover:bg-primary/90 text-white shadow-sm px-4 py-2 rounded font-medium text-center transition-colors">
                Get Started Free
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header; 