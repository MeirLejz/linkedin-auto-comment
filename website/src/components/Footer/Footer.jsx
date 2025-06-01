import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { ROUTES } from '../../utils/constants';

export const Footer = () => {
  return (
    <footer>
      <div className="container">
        <Link to={ROUTES.MANAGE_SUBSCRIPTION} className="text-blue-300 hover:underline">
          Manage Subscription
        </Link>
      </div>
    </footer>
  );
};
