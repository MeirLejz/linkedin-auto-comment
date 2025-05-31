import React from 'react';

export const PlanCard = ({ 
  title, 
  price, 
  currency = '$',
  description,
  features, 
  buttonText, 
  buttonLink, 
  onButtonClick,
  isFree = false 
}) => {
  return (
    <div className={`plan-card${isFree ? ' free-plan' : ''}`}> 
      <div className="plan-title">{title}</div>
      <div className="plan-price-row">
        <span className="plan-price">0</span>
        <span className="plan-currency">{currency}</span>
        <span className="plan-per">/ month</span>
      </div>
      <div className="plan-desc">{description}</div>
      {buttonLink ? (
        <a href={buttonLink} className="plan-btn">
          {buttonText}
        </a>
      ) : (
        <button onClick={onButtonClick} className="plan-btn">
          {buttonText}
        </button>
      )}
      <ul className="plan-benefits">
        {features.map((feature, index) => (
          <li key={index} className="plan-benefit">
            <i className="fas fa-check"></i> {feature}
          </li>
        ))}
      </ul>
    </div>
  );
};
