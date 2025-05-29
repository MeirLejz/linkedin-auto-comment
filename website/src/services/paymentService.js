import { PAYPRO_BASE_URL, PAYPRO_PRODUCT_ID, ENV } from '../utils/constants';

export const generatePaymentLink = (userId) => {
  if (!userId || typeof userId !== 'string') {
    console.log('User data not fully loaded yet');
    return '#';
  }
  
  const baseUrl = `${PAYPRO_BASE_URL}?products[1][id]=${PAYPRO_PRODUCT_ID}&x-user_id=${userId}`;
  return ENV.TEST_MODE ? `${baseUrl}&use-test-mode=true&secret-key=${ENV.PAYPRO_SECRET_KEY}` : baseUrl;
};
