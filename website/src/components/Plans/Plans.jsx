import React from 'react';
import './Plans.css';
import { CHROME_STORE_URL } from '../../utils/constants';
import { PlanCard } from './PlanCard';

export const Plans = ({ user, onSignIn, generatePaymentLink }) => {
  const freePlanFeatures = [
    'Basic features',
    'Limited comments'
  ];

  const proPlanFeatures = [
    'Unlimited comments',
    'Priority support'
  ];

  return (
    <section id="plans" className="plans">
      <h2>Plans</h2>
      <PlanCard
        title="Free"
        price="$0/month"
        features={freePlanFeatures}
        buttonText="Get Extension"
        buttonLink={CHROME_STORE_URL}
        isFree={true}
      />
      <PlanCard
        title="Pro"
        price="$10/month"
        features={proPlanFeatures}
        buttonText={user ? "Upgrade to Pro" : "Sign In to Upgrade"}
        buttonLink={user ? generatePaymentLink() : null}
        onButtonClick={!user ? onSignIn : null}
      />
    </section>
  );
};
