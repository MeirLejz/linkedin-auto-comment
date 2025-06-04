import React from 'react';

const HowItWorksCard = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm text-center">
    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default HowItWorksCard; 