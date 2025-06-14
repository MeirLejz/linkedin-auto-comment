const express = require('express');
const { supabase } = require('./utils/supabaseClient');
const { calculateWebhookHash } = require('./utils/hashUtils');
const { 
  IPN_TYPES,
  PLAN_TYPES,
  FREE_PLAN_MONTHLY_REQUEST_LIMIT
} = require('./utils/constants');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/webhook', async (req, res) => {
  const data = req.body;
  const receivedHash = data.HASH;

  // Calculate hash based on test mode
  const calculatedHash = calculateWebhookHash(data.ORDER_ID);

  if (receivedHash !== calculatedHash) {
    console.error('Webhook hash mismatch', { receivedHash, calculatedHash });
    return res.status(401).send('Invalid webhook signature');
  }

  // Handle OrderCharged (subscription purchase)
  if (data.IPN_TYPE_ID === IPN_TYPES.ORDER_CHARGED) {
    const customFields = data.ORDER_CUSTOM_FIELDS || '';
    const userIdMatch = customFields.match(/x-user_id=([^&]*)/);
    const subscriptionId = parseInt(data.SUBSCRIPTION_ID, 10);

    console.log(`Processing OrderCharged webhook: customFields=${customFields}, subscriptionId=${subscriptionId}`);

    if (!userIdMatch) {
      console.error('No user_id found in custom fields', { customFields });
      return res.status(400).send('No user_id found in custom fields');
    }

    if (!subscriptionId || isNaN(subscriptionId)) {
      console.error('Invalid or missing SUBSCRIPTION_ID', { subscriptionId });
      return res.status(400).send('Invalid or missing SUBSCRIPTION_ID');
    }

    const userId = userIdMatch[1];
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('app_users')
      .upsert({
        user_id: userId,
        plan_type: PLAN_TYPES.BASIC,
        start_date: now,
        last_renewal_date: now,
        subscription_id: subscriptionId
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(`Supabase upsert error for userId=${userId}, subscriptionId=${subscriptionId}`, error);
      return res.status(500).send(`Database update failed: ${error.message}`);
    }

    console.log(`Successfully updated plan for userId=${userId}, subscriptionId=${subscriptionId}`);
    return res.status(200).send('Plan updated successfully');
  }

  // Handle SubscriptionTerminated (cancellation)
  if (data.IPN_TYPE_ID === IPN_TYPES.SUBSCRIPTION_TERMINATED) {
    const subscriptionId = parseInt(data.SUBSCRIPTION_ID, 10);

    console.log(`Processing SubscriptionTerminated webhook: subscriptionId=${subscriptionId}`);

    if (!subscriptionId || isNaN(subscriptionId)) {
      console.error('Invalid or missing SUBSCRIPTION_ID', { subscriptionId });
      return res.status(400).send('Invalid or missing SUBSCRIPTION_ID');
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('app_users')
      .update({
        plan_type: PLAN_TYPES.FREE,
        subscription_id: null,
        last_renewal_date: now,
        start_date: now,
        remaining_user_requests: FREE_PLAN_MONTHLY_REQUEST_LIMIT
      })
      .eq('subscription_id', subscriptionId);

    if (error) {
      console.error(`Supabase update error for subscriptionId=${subscriptionId}`, error);
      return res.status(500).send(`Database update failed: ${error.message}`);
    }

    console.log(`Successfully canceled subscription for subscriptionId=${subscriptionId}`);
    return res.status(200).send('Subscription canceled successfully');
  }

  console.log('Webhook received, no action taken', { ipnTypeId: data.IPN_TYPE_ID });
  res.status(200).send('Webhook received');
});

module.exports = app;