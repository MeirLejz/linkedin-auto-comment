import React from 'react';
import './Hero.css';

export const Hero = ({ user, onSignIn }) => {
  return (
    <section className="hero">
      <div className="hero-content">
        <h2>Boost Your LinkedIn Presence</h2>
        <p>Automate comments and engage effortlessly.</p>
        {!user && (
          <div className="hero-cta">
            <button onClick={onSignIn} className="primary-btn">
              Sign In with Google
            </button>
          </div>
        )}
      </div>
      <div className="hero-image">
        <img src="/hero-image.png" alt="Hero" />
      </div>
    </section>
  );
};
