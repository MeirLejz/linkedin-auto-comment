// URLs
export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/placeholder';
export const PAYPRO_BASE_URL = 'https://store.payproglobal.com/checkout';
export const REDIRECT_URL = 'https://linkedin-auto-comment.vercel.app/';

// Product IDs
export const PAYPRO_PRODUCT_ID = '112482';

// Routes
export const ROUTES = {
  HOME: '/',
  MANAGE_SUBSCRIPTION: '/manage-subscription'
};

// Environment Variables
export const ENV = {
  TEST_MODE: process.env.REACT_APP_TEST_MODE === 'true',
  PAYPRO_SECRET_KEY: process.env.REACT_APP_PAYPRO_SECRET_KEY
};
