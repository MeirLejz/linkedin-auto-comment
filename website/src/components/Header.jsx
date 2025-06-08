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
                Welcome, {getFirstName()}!
              </span>
            )}
            {user ? (
              <button onClick={onSignOut} className="text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium">
                Sign Out
              </button>
            ) : (
              <button onClick={onSignIn} className="text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium flex items-center gap-2">
                <span className="inline-block" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      <path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.77h5.48a4.68 4.68 0 01-2.03 3.07v2.55h3.28c1.92-1.77 3.03-4.38 3.03-7.39z" fill="#4285F4"/>
                      <path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.28-2.55c-.91.61-2.07.97-3.35.97-2.57 0-4.75-1.74-5.53-4.07H1.09v2.6A10 10 0 0010 20z" fill="#34A853"/>
                      <path d="M4.47 11.91A5.99 5.99 0 014.09 10c0-.66.12-1.31.33-1.91V5.49H1.09A10 10 0 000 10c0 1.64.39 3.19 1.09 4.51l3.38-2.6z" fill="#FBBC05"/>
                      <path d="M10 4.01c1.47 0 2.78.51 3.81 1.51l2.85-2.85C14.97 1.13 12.7.01 10 .01A10 10 0 001.09 5.49l3.38 2.6C5.25 5.75 7.43 4.01 10 4.01z" fill="#EA4335"/>
                    </g>
                  </svg>
                </span>
                Sign In with Google
              </button>
            )}
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="bg-primary hover:bg-primary/90 text-white shadow-md px-4 py-2 rounded font-medium transition-colors">
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
                <button onClick={onSignIn} className="w-full text-gray-600 hover:text-primary transition-colors px-4 py-2 rounded font-medium flex items-center justify-center gap-2">
                  <span className="inline-block" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path d="M19.6 10.23c0-.68-.06-1.36-.17-2H10v3.77h5.48a4.68 4.68 0 01-2.03 3.07v2.55h3.28c1.92-1.77 3.03-4.38 3.03-7.39z" fill="#4285F4"/>
                        <path d="M10 20c2.7 0 4.97-.9 6.63-2.44l-3.28-2.55c-.91.61-2.07.97-3.35.97-2.57 0-4.75-1.74-5.53-4.07H1.09v2.6A10 10 0 0010 20z" fill="#34A853"/>
                        <path d="M4.47 11.91A5.99 5.99 0 014.09 10c0-.66.12-1.31.33-1.91V5.49H1.09A10 10 0 000 10c0 1.64.39 3.19 1.09 4.51l3.38-2.6z" fill="#FBBC05"/>
                        <path d="M10 4.01c1.47 0 2.78.51 3.81 1.51l2.85-2.85C14.97 1.13 12.7.01 10 .01A10 10 0 001.09 5.49l3.38 2.6C5.25 5.75 7.43 4.01 10 4.01z" fill="#EA4335"/>
                      </g>
                    </svg>
                  </span>
                  Sign In with Google
                </button>
              )}
              <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="w-full block bg-primary hover:bg-primary/90 text-white shadow-sm px-4 py-2 rounded font-medium text-center transition-colors">
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