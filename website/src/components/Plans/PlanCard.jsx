import React from 'react';

export const PlanCard = ({ 
  title, 
  price, 
  features, 
  buttonText, 
  buttonLink, 
  onButtonClick,
  isFree = false 
}) => {
  return (
    <div className={`plan-box ${isFree ? 'free-plan' : ''}`}>
      <h3>{title}</h3>
      <div className="price">{price}</div>
      <ul>
        {features.map((feature, index) => (
          <li key={index}>
            <i className="fas fa-check"></i> {feature}
          </li>
        ))}
      </ul>
      {buttonLink ? (
        <a href={buttonLink} className="btn">
          {buttonText}
        </a>
      ) : (
        <button onClick={onButtonClick} className="btn">
          {buttonText}
        </button>
      )}
    </div>
  );
};
