import React from 'react';
import PlanCard from './PlanCard';
import { CHROME_STORE_URL } from '../utils/constants';

const Plans = ({ user, onSignIn, generatePaymentLink }) => {
  const freePlanFeatures = [
    '10 comments per month',
    //'Unlimited regenerations',
    //'Basic comment suggestions',
    'Chrome extension'
  ];

  const proPlanFeatures = [
    'Unlimited comments',
    //'Unlimited regenerations',
    //'Advanced comment suggestions',
    'Priority support',
    'Chrome extension'
  ];

  // Toggle highlighted plan here
  const highlightPro = true;
  const highlightFree = false;

  return (
    <section id="plans" className="py-20 px-4 md:px-8 bg-slate-50">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Growth Hacker in your pocket for 1€ a day</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pro = only €1/day. One comment a day can change everything.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PlanCard
            title="Free"
            price={0}
            currency="$"
            description="Get started without a credit card"
            features={freePlanFeatures}
            buttonText="Start Free"
            buttonLink={CHROME_STORE_URL}
            isFree={true}
            highlighted={highlightFree}
          />
          <PlanCard
            title="Pro"
            price={19.99}
            currency="$"
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

export default Plans; 