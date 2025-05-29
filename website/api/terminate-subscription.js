const express = require('express');
const { supabase } = require('./utils/supabaseClient');
const { 
  PAYPRO_TERMINATE_URL, 
  PAYPRO_VENDOR_ACCOUNT_ID, 
  PAYPRO_API_SECRET_KEY,
  PLAN_TYPES
} = require('./utils/constants');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/terminate-subscription', async (req, res) => {
  const { subscriptionId } = req.body;
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid authorization token' });
  }
  console.log('Subscription ID:', subscriptionId);
  if (!subscriptionId || isNaN(subscriptionId)) {
    return res.status(400).json({ message: `Invalid or missing subscriptionId: ${subscriptionId}` });
  }

  try {
    // Verify user identity
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Verify subscription belongs to user
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('subscription_id')
      .eq('user_id', user.id)
      .eq('subscription_id', subscriptionId)
      .single();

    if (userError || !userData) {
      return res.status(403).json({ message: 'Subscription not found or not owned by user' });
    }

    // Call PayPro Global API
    const response = await fetch(PAYPRO_TERMINATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: parseInt(subscriptionId, 10),
        vendorAccountId: PAYPRO_VENDOR_ACCOUNT_ID,
        apiSecretKey: PAYPRO_API_SECRET_KEY,
        sendCustomerNotification: true,
        cancellationReasonId: 2 // "I no longer need this product"
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('PayPro Global API error:', result);
      return res.status(response.status).json({ message: result.message || 'Failed to cancel subscription' });
    }

    // Webhook will handle database update, but optionally update here
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        plan_type: PLAN_TYPES.FREE,
        subscription_id: null,
        last_renewal_date: null
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      // Don't fail the request, as webhook will retry
    }

    return res.status(200).json({ message: 'Subscription canceled successfully' });
  } catch (err) {
    console.error('Termination error:', err);
    return res.status(500).json({ message: 'Server error during cancellation' });
  }
});

module.exports = app;