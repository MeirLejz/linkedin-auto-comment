import React from 'react';
import './Plans.css';
import { CHROME_STORE_URL } from '../../utils/constants';
import { PlanCard } from './PlanCard';

export const Plans = ({ user, onSignIn, generatePaymentLink }) => {
  const freePlanFeatures = [
    '10 comments per month',
    'Unlimited regenerations',
    'Basic comment suggestions',
    'Chrome extension'
  ];

  const proPlanFeatures = [
    'Unlimited comments',
    'Unlimited regenerations',
    'Advanced comment suggestions',
    'Priority support',
    'Chrome extension'
  ];

  // Toggle highlighted plan here
  const highlightPro = true;
  const highlightFree = false;

  return (
    <section id="plans" className="plans">
      <div className="container">
        <div className="plans-title">Your Growth Hacker in your pocket for 1€ a day</div>
        <div className="plans-subtitle">Pro = only €1/day. One comment a day can change everything.</div>
        <div className="plans-cards-row">
          <PlanCard
            title="Free"
            price={0}
            currency="€"
            description="Get started without a credit card"
            features={freePlanFeatures}
            buttonText="Start Free"
            buttonLink={CHROME_STORE_URL}
            isFree={true}
            highlighted={highlightFree}
          />
          <PlanCard
            title="Pro"
            price={29.99}
            currency="€"
            description="For power users who need the best engagement tools"
            features={proPlanFeatures}
            buttonText={user ? "Get Pro Plan" : "Sign In to Upgrade"}
            buttonLink={user ? generatePaymentLink() : null}
            onButtonClick={!user ? onSignIn : null}
            highlighted={highlightPro}
            tag="Most Popular"
          />
        </div>
      </div>
    </section>
  );
};
