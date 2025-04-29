function handleSignup(tier) {
    const isLoggedIn = false; // Placeholder – check Supabase session in future
  
    if (!isLoggedIn) {
      alert("Please sign in with Google from the extension first.");
      return;
    }
  
    if (tier === 'pro') {
      window.location.href = "https://your-payproglobal-link.com"; // Replace with real link
    } else {
      alert("Free plan activated — use AVA AI from your extension.");
    }
  }
  