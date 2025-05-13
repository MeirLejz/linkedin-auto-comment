document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    const plan = urlParams.get('plan');
  
    if (email && plan) {
      try {
        await callSupabaseFunction(email, plan);
        console.log('Plan updated successfully');
      } catch (error) {
        console.error('Error updating plan:', error);
      }
    }
  });

  
// Function to handle plan upgrade
async function handleSignup(planType) {
    console.log(`Attempting to upgrade to ${planType} plan...`);
    
    const user = await getCurrentUser();
    if (!user) {
      console.error('User not authenticated. Cannot upgrade plan.');
      return;
    }
  
    try {
      const { data, error } = await supabase.rpc('update_user_plan', {
        p_user_id: user.id,
        p_new_plan_type: planType
      });
  
      if (error) {
        console.error('Error updating user plan:', error.message);
      } else {
        console.log('User plan updated successfully:', data);
        // Optionally, update the UI or redirect the user
      }
    } catch (error) {
      console.error('Unexpected error during plan upgrade:', error);
    }
  }