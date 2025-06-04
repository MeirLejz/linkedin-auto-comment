import React from 'react';
import { Chrome } from 'lucide-react';
import { CHROME_STORE_URL } from '../utils/constants';

const Hero = () => {
  return (
    <section className="relative pt-20 pb-32 overflow-hidden" id="hero">
      {/* Background decorative elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      </div>
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Hero Content */}
          <div className="flex-1 text-center lg:text-left max-w-3xl mx-auto lg:mx-0">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Stop Scrolling.<br />
              Start Commenting.<br />
              Start Growing.
            </h1>
            <p className="text-xl text-muted-foreground mb-4">Posting isn't enough.</p>
            <p className="text-xl text-muted-foreground mb-6 font-bold">If you're not commenting, you're invisible.</p>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Ava ai is built for LinkedIn and knows its rules.<br />
              Generate a comment in one click.<br />
              Use it well.<br />
              Grow faster.
            </p>
            <div className="flex justify-center lg:justify-start mb-4">
              <a
                href={CHROME_STORE_URL}
                className="inline-flex items-center bg-primary hover:bg-primary/90 text-white font-semibold text-lg px-6 py-3 rounded-lg shadow-lg transition group"
              >
                <Chrome className="mr-2 h-5 w-5" />
                Try Ava AI now
              </a>
            </div>
          </div>
          {/* Hero Image */}
          <div className="flex-1 w-full">
            <div className="relative w-full rounded-lg shadow-xl overflow-hidden">
              <img
                src="/hero-image.png"
                alt="Hero"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero; 