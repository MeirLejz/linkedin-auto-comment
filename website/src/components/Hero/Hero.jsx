import React from 'react';
import './Hero.css';
import { CHROME_STORE_URL } from '../../utils/constants';

export const Hero = () => {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <div className="hero-content">
          <h1 className="hero-title">
            Stop Scrolling.<br />
            Start Commenting.<br />
            Start Growing.
          </h1>
          <p className="hero-subtle">Posting isn't enough.</p>
          <p className="hero-bold">If you're not commenting, you're invisible.</p>
          <p className="hero-desc">
            Ava ai is built for LinkedIn and knows its rules.<br />
            Generate a comment in one click.<br />
            Use it well.<br />
            Grow faster.
          </p>
          <div className="hero-cta">
            <a href={CHROME_STORE_URL} className="get-started-btn">Try Ava AI now</a>
          </div>
        </div>
        <div className="hero-image">
          <img src="/hero-image.png" alt="Hero" />
        </div>
      </div>
    </section>
  );
};
