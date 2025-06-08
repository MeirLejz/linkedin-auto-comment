import React from 'react';
import { CheckCircle } from 'lucide-react';

const PlanCard = ({ 
  title, 
  price, 
  currency = '$',
  description,
  features, 
  buttonText, 
  buttonLink, 
  onButtonClick,
  isFree = false,
  highlighted = false,
  tag = 'Most Popular',
}) => {
  return (
    <div 
      className={`rounded-xl overflow-hidden shadow-sm transition-all ${
        highlighted ? 'ring-2 ring-primary shadow-lg scale-105' : 'border border-gray-200 hover:shadow-md'
      }`}
    >
      {highlighted && (
        <div className="bg-primary text-white py-2 px-4 text-center text-sm font-medium">
          {tag}
        </div>
      )}
      <div className="p-8">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold">{currency}{price}</span>
          <span className="text-gray-500 ml-2">/ month</span>
        </div>
        <p className="text-muted-foreground mb-6">{description}</p>
        {buttonLink ? (
          <a
            href={buttonLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full mb-8 block text-center px-4 py-2 rounded-lg font-semibold transition shadow ${
              highlighted ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            {buttonText}
          </a>
        ) : (
          <button
            onClick={onButtonClick}
            className={`w-full mb-8 px-4 py-2 rounded-lg font-semibold transition shadow ${
              highlighted ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
            }`}
          >
            {buttonText}
          </button>
        )}
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PlanCard; 