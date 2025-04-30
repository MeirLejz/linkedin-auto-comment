import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// ─── 1) Supabase Setup ─────────────────────────────────────────────────────────
const SUPABASE_URL   = 'https://hzhuqrztsisuwjilobiv.supabase.co';
const SUPABASE_ANON  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6aHVxcnp0c2lzdXdqaWxvYml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MzA3MTQsImV4cCI6MjA1OTEwNjcxNH0.yNW1jkUTkIpanoQJP0dsFCfr5swXF10QX4nHNIoem8E';
const supabase      = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── 2) Payment Links ──────────────────────────────────────────────────────────
// Fill in your real PayProGlobal URL when available:
const PRO_PAYMENT_LINK = ''; // ← e.g. 'https://store.payproglobal.com/checkout?...'

// Free plan has no payment URL
const FREE_PLAN_LINK = window.location.href; // just reload

// ─── 3) UI Elements ───────────────────────────────────────────────────────────
const signOutBtn = document.getElementById('sign-out-btn');

// ─── 4) Auth State Handling ──────────────────────────────────────────────────
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Show or hide Sign-Out button based on auth state
async function updateUIForAuth() {
  const user = await getCurrentUser();
  if (user) {
    signOutBtn.classList.add('visible');
  } else {
    signOutBtn.classList.remove('visible');
  }
}

// Listen for auth changes (e.g. redirect back after Google sign-in)
supabase.auth.onAuthStateChange(() => {
  handlePostSignInRedirect();
  updateUIForAuth();
});

// ─── 5) Signup / Redirect Logic ───────────────────────────────────────────────
async function handleSignup(tier) {
  const user = await getCurrentUser();
  const targetURL = (tier === 'pro') ? PRO_PAYMENT_LINK : FREE_PLAN_LINK;

  if (user) {
    // Already signed in → go straight to target
    window.location.href = targetURL;
  } else {
    // Not signed in → start OAuth and redirect back to this page with tier info
    const redirectTo = window.location.origin + window.location.pathname + `?tier=${tier}`;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
  }
}

// After redirect from OAuth, send user to payment if needed
async function handlePostSignInRedirect() {
  const params = new URLSearchParams(window.location.search);
  const tier = params.get('tier');
  if (!tier) return;

  // Clear the URL param so we don’t loop endlessly
  history.replaceState({}, document.title, window.location.pathname);

  const user = await getCurrentUser();
  if (!user) return; // still not signed in

  if (tier === 'pro' && PRO_PAYMENT_LINK) {
    window.location.href = PRO_PAYMENT_LINK;
  } else if (tier === 'free') {
    // Free plan: just reload to signal “you’re signed in”
    window.location.href = FREE_PLAN_LINK;
  }
}

// ─── 6) Sign Out ───────────────────────────────────────────────────────────────
async function signOut() {
  await supabase.auth.signOut();
  // Clear any query params
  history.replaceState({}, document.title, window.location.pathname);
  updateUIForAuth();
}

signOutBtn.addEventListener('click', signOut);

// ─── 7) Initialize UI ─────────────────────────────────────────────────────────
updateUIForAuth();
handlePostSignInRedirect();
