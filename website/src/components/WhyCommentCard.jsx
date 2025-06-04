import React from 'react';

const WhyCommentCard = ({ title, description }) => (
  <div className="bg-white p-8 rounded-xl shadow-sm text-center">
    <h3 className="text-xl font-semibold mb-4">{title}</h3>
    <p className="text-muted-foreground">{description}</p>
  </div>
);

export default WhyCommentCard; 