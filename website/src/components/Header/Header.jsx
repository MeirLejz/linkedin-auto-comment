import React from 'react';
import './Header.css';

export const Header = ({ user, onSignIn, onSignOut }) => {
  return (
    <header>
      <div className="logo-container">
        <img src="/logo.png" alt="Logo" />
        <h1>LinkedIn Auto Comment</h1>
      </div>
      <nav>
        <ul>
          <li><a href="#features">Features</a></li>
          <li><a href="#plans">Plans</a></li>
        </ul>
      </nav>
      <div className="auth-buttons">
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
