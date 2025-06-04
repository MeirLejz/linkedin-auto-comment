import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Footer from './components/Footer';
import { generatePaymentLink } from './services';
import { useAuth } from './hooks/useAuth';
import Plans from './components/Plans'
import './styles/variables.css';
import './styles/global.css';
import WhyCommentCard from './components/WhyCommentCard';
import HowItWorksCard from './components/HowItWorksCard';
import FeatureCard from './components/FeatureCard';
import { Chrome, MessageSquare, Users, Zap, RefreshCw, Shield } from 'lucide-react';

function App() {
  const { user, loading, error, handleSignIn, handleSignOut } = useAuth();

  const handlePaymentLink = () => {
    return generatePaymentLink(user?.id);
  };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onSignOut={handleSignOut} onSignIn={handleSignIn} />
      <main className="flex-1">
        <Hero user={user} onSignIn={handleSignIn} />

        {/* Why Comments Matter Section */}
        <section className="py-20 px-4 md:px-8 bg-slate-50" id="why-comments">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Comments Matter Now</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <WhyCommentCard
                title="Comments are the new posts."
                description="LinkedIn now shows impressions per comment. Every comment is exposure."
              />
              <WhyCommentCard
                title="Posting without engaging doesn't work."
                description="If you post but never comment on others, you're missing 80% of the opportunity."
              />
              <WhyCommentCard
                title="Your comment is your brand"
                description="It builds relationships, increases visibility, and gets you discovered faster than likes or shares."
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 px-4 md:px-8 bg-slate-50">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How Ava AI Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Engaging on LinkedIn has never been easier
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <HowItWorksCard
                icon={<Chrome className="text-purple-600 w-8 h-8" />}
                title="Install Extension"
                description="Add Ava AI to Chrome in seconds"
              />
              <HowItWorksCard
                icon={<MessageSquare className="text-purple-600 w-8 h-8" />}
                title="Click Generate"
                description="When viewing a LinkedIn post, click the Ava AI button"
              />
              <HowItWorksCard
                icon={<Users className="text-purple-600 w-8 h-8" />}
                title="Post & Engage"
                description="Use the comment as-is or regenerate until it's perfect"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 md:px-8" id="features">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">What Ava AI Does</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Ava AI is not a generic AI tool - it's built specifically for LinkedIn, and it plays by LinkedIn's real rules.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-purple-500" />}
                title="One-Click LinkedIn Comments"
                description="Generate relevant comments instantly - built to match LinkedIn's tone, format, and culture."
              />
              <FeatureCard
                icon={<RefreshCw className="h-8 w-8 text-purple-500" />}
                title="Comments That Sound Like You"
                description="Regenerate until it fits your voice. No ChatGPT vibes - just clean, professional LinkedIn-style copy."
              />
              <FeatureCard
                icon={<MessageSquare className="h-8 w-8 text-purple-500" />}
                title="Deep Comments That Get Likes"
                description="Longer, smarter, and context-aware. Deep Comments scrape web content to add insight - perfect for thought leadership and visibility."
              />
              <FeatureCard
                icon={<Chrome className="h-8 w-8 text-purple-500" />}
                title="Chrome Extension for LinkedIn"
                description="Works natively inside LinkedIn. Just open a post and comment - no switching tabs, no copy-paste."
              />
              <FeatureCard
                icon={<Users className="h-8 w-8 text-purple-500" />}
                title="Built for LinkedIn Creators"
                description="Made for content creators, influencers, sales pros, and anyone who wants to grow on LinkedIn by actually engaging with others."
              />
              <FeatureCard
                icon={<Shield className="h-8 w-8 text-purple-500" />}
                title="Made for LinkedIn. Period."
                description="We know the rules. We know the feed. Ava AI is engineered to grow your brand the LinkedIn-native way - with real engagement."
              />
            </div>
          </div>
        </section>

        {/* Pricing Section (keep your own) */}
        <Plans
          user={user}
          onSignIn={handleSignIn}
          generatePaymentLink={handlePaymentLink}
        />

        {/* Error display */}
        {error && (
          <div className="text-center text-red-500 mt-4">
            {error}
          </div>
        )}

        {/* CTA Section */}
        <section className="py-20 px-4 md:px-8 bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Grow your LinkedIn in five minutes a day.</h2>
            <p className="max-w-2xl mx-auto mb-8 opacity-90">
              Install the Chrome extension. Try it free. Let Ava AI handle the comment block so you can stay consistent.
            </p>
            <div className="flex justify-center">
              <a
                href="https://chrome.google.com/webstore/detail/ava-ai-linkedin-comments/" // Update with your actual Chrome store URL if needed
                className="bg-white text-purple-700 hover:bg-gray-100 font-semibold py-3 px-8 rounded-lg text-lg shadow transition"
              >
                Get Started for Free
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;