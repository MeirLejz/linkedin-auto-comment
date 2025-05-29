import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import { ROUTES } from '../../utils/constants';

export const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 text-center">
      <Link to={ROUTES.MANAGE_SUBSCRIPTION} className="text-blue-300 hover:underline">
        Manage Subscription
      </Link>
    </footer>
  );
};
