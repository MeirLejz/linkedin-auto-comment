import { supabase } from './supabase-config.js';

document.getElementById('signInButton').addEventListener('click', async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: chrome.identity.getRedirectURL('auth.html'),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
});

document.getElementById('signOutButton').addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// Update UI state
const updateUI = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    document.getElementById('signInButton').style.display = 'none';
    document.getElementById('signOutButton').style.display = 'block';
    document.getElementById('userInfo').textContent = `Logged in as ${user.email}`;
  } else {
    document.getElementById('signInButton').style.display = 'block';
    document.getElementById('signOutButton').style.display = 'none';
    document.getElementById('userInfo').textContent = '';
  }
};

supabase.auth.getUser().then(updateUI);
supabase.auth.onAuthStateChange(updateUI);
