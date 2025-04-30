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
const demoAiButton = document.getElementById('demo-ai-button');
const demoComment = document.getElementById('demo-comment');

// Demo content setup
const demoPostContent = "Just published my latest article on leveraging AI for content marketing strategies. The results have been incredible - 3x engagement and 45% more conversions. Who else is using AI in their marketing efforts?";
const demoComments = [
  "AI dramatically boosts marketing impact.",
  "Smart marketers are already winning with AI.",
  "Content + AI = marketing gold.",
  "Been using AI for months. Results are stunning.",
  "Your conversion rate is impressive. AI delivers."
];

// ─── 4) Animation and Interactive Elements ───────────────────────────────────
// Add animations on scroll
function animateOnScroll() {
  const elements = document.querySelectorAll('.feature-card, .step, .plan-box, .testimonial');
  
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  elements.forEach(element => {
    element.classList.add('pre-animation');
    observer.observe(element);
  });
}

// Handle demo comment generation
function handleDemoCommentGeneration() {
  if (!demoAiButton || !demoComment) return;
  
  demoAiButton.addEventListener('click', async () => {
    // Update comment placeholder to show thinking state
    demoComment.textContent = "Thinking...";
    demoComment.classList.add('thinking');
    
    // Simulate AI response with typing effect
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Randomly select a comment from the demo comments
    const randomComment = demoComments[Math.floor(Math.random() * demoComments.length)];
    
    // Clear the placeholder
    demoComment.textContent = "";
    demoComment.classList.remove('thinking');
    
    // Type the comment one character at a time
    let i = 0;
    const typingInterval = setInterval(() => {
      if (i < randomComment.length) {
        demoComment.textContent += randomComment.charAt(i);
        i++;
      } else {
        clearInterval(typingInterval);
        // Add a subtle highlight effect to show completion
        demoComment.classList.add('highlight');
        setTimeout(() => {
          demoComment.classList.remove('highlight');
        }, 500);
      }
    }, 25);
  });
}

// Add hover effects to plan boxes
function setupPlanHoverEffects() {
  const planBoxes = document.querySelectorAll('.plan-box');
  
  planBoxes.forEach(plan => {
    plan.addEventListener('mouseenter', () => {
      planBoxes.forEach(p => {
        if (p !== plan) p.classList.add('dimmed');
      });
    });
    
    plan.addEventListener('mouseleave', () => {
      planBoxes.forEach(p => p.classList.remove('dimmed'));
    });
  });
}

// Initialize the nav menu animation
function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('nav ul li a');
  
  // Helper function to get current scroll position
  const getScrollPosition = () => {
    return window.scrollY || document.documentElement.scrollTop;
  };
  
  // Update active nav link based on scroll position
  const updateActiveNavLink = () => {
    const scrollPosition = getScrollPosition() + 100; // Add offset
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        const id = section.getAttribute('id');
        
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  };
  
  // Listen for scroll events
  window.addEventListener('scroll', updateActiveNavLink);
  
  // Initial check
  updateActiveNavLink();
}

// Add text animation to the hero title
function setupHeroAnimation() {
  const heroTitle = document.querySelector('.animated-text');
  
  if (heroTitle) {
    const text = heroTitle.textContent;
    heroTitle.innerHTML = '';
    
    // Create a wrapper for the letters
    const wrapper = document.createElement('span');
    wrapper.className = 'text-animation-wrapper';
    
    // Add each letter with a span
    [...text].forEach((letter, i) => {
      const span = document.createElement('span');
      span.textContent = letter;
      span.style.animationDelay = `${i * 0.05}s`;
      wrapper.appendChild(span);
    });
    
    heroTitle.appendChild(wrapper);
  }
}

// ─── 5) Auth State Handling ──────────────────────────────────────────────────
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

// ─── 6) Signup / Redirect Logic ───────────────────────────────────────────────
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

  // Clear the URL param so we don't loop endlessly
  history.replaceState({}, document.title, window.location.pathname);

  const user = await getCurrentUser();
  if (!user) return; // still not signed in

  if (tier === 'pro' && PRO_PAYMENT_LINK) {
    window.location.href = PRO_PAYMENT_LINK;
  } else if (tier === 'free') {
    // Free plan: just reload to signal "you're signed in"
    window.location.href = FREE_PLAN_LINK;
  }
}

// ─── 7) Sign Out ───────────────────────────────────────────────────────────────
async function signOut() {
  await supabase.auth.signOut();
  // Clear any query params
  history.replaceState({}, document.title, window.location.pathname);
  updateUIForAuth();
}

if (signOutBtn) {
  signOutBtn.addEventListener('click', signOut);
}

// ─── 8) Initialize UI ─────────────────────────────────────────────────────────
function initializeUI() {
  // Initialize animations and interactions
  animateOnScroll();
  handleDemoCommentGeneration();
  setupPlanHoverEffects();
  initNavHighlight();
  setupHeroAnimation();
  
  // Handle auth state
  updateUIForAuth();
  handlePostSignInRedirect();
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeUI);

// Add CSS for animations
document.head.insertAdjacentHTML('beforeend', `
<style>
  /* Animation classes */
  .pre-animation {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.6s ease-out, transform 0.6s ease-out;
  }
  
  .animate-in {
    opacity: 1;
    transform: translateY(0);
  }
  
  .dimmed {
    opacity: 0.6;
    filter: grayscale(0.4);
    transform: scale(0.98);
    transition: all 0.3s ease;
  }
  
  .text-animation-wrapper span {
    display: inline-block;
    opacity: 0;
    transform: translateY(20px);
    animation: fadeInLetter 0.5s forwards;
  }
  
  @keyframes fadeInLetter {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .thinking {
    color: #9ca3af;
    animation: pulse 1.2s infinite;
  }
  
  .highlight {
    background-color: rgba(124, 58, 237, 0.1);
    transition: background-color 0.5s;
  }
  
  nav ul li a.active {
    color: var(--purple);
  }
  
  nav ul li a.active::after {
    width: 100%;
  }
</style>
`);
