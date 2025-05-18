const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
);

const PAYPRO_SECRET_KEY = process.env.REACT_APP_PAYPRO_SECRET_KEY;

app.post('/webhook', async (req, res) => {
  const data = req.body;
  const receivedHash = data.HASH;
  const calculatedHash = crypto
    .createHash('md5')
    .update(data.ORDER_ID + PAYPRO_SECRET_KEY)
    .digest('hex');

  if (receivedHash !== calculatedHash) {
    console.error('Webhook hash mismatch');
    return res.status(401).send('Invalid webhook signature');
  }

  if (data.IPN_TYPE_ID === '1') { // OrderCharged
    const customFields = data.ORDER_CUSTOM_FIELDS || '';
    const userIdMatch = customFields.match(/x-user_id=([^&]*)/);
    if (!userIdMatch) {
      console.error('No user_id found in webhook');
      return res.status(400).send('Missing user_id in custom fields');
    }

    const userId = userIdMatch[1];
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('users')
      .upsert({
        user_id: userId,
        plan_type: 'basic',
        start_date: now,
        last_renewal_date: now
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).send(`Database update failed: ${error.message}`);
    }
    return res.status(200).send('Plan updated successfully');
  }

  res.status(200).send('Webhook received');
});

module.exports = app;