import React from 'react';
import './Header.css';
import { CHROME_STORE_URL } from '../../utils/constants';

export const Header = ({ user, onSignIn, onSignOut }) => {
  return (
    <header>
      <div className="logo-container">
        <img src="/logo.png" alt="Logo" />
        <h1 className="logo-text">
          <span className="logo-ava">Ava</span><span className="logo-ai">AI</span>
        </h1>
      </div>
      <nav>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#plans">Plans</a></li>
        </ul>
      </nav>
      <div className="auth-buttons">
        <a href={CHROME_STORE_URL} className="get-started-btn">Get Started Free</a>
        {user ? (
          <button onClick={onSignOut} className="sign-out-btn">
            Sign Out
          </button>
        ) : (
          <button onClick={onSignIn} className="sign-in-btn">
            Sign In with Google
          </button>
        )}
      </div>
    </header>
  );
};
