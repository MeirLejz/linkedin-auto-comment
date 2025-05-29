const crypto = require('crypto');
const { PAYPRO_SECRET_KEY, REACT_APP_TEST_MODE } = require('./constants');

const calculateWebhookHash = (orderId) => {
  if (REACT_APP_TEST_MODE) {
    return crypto.createHash('md5').update('1').digest('hex');
  }
  return crypto.createHash('md5').update(orderId + PAYPRO_SECRET_KEY).digest('hex');
};

module.exports = { calculateWebhookHash }; 