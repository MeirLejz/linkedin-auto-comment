import React from 'react';
import { LINKEDIN_URL, CHROME_STORE_URL, PRIVACY_POLICY_URL, WHATSAPP_NUMBER } from '../utils/constants';
import { Linkedin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* About */}
          <div>
            <div className="flex items-center mb-4">
              <img 
                src="/logo.png" 
                alt="Ava AI Logo" 
                className="h-8 w-8 mr-2"
              />
              <h3 className="font-bold text-xl">
                <span className="text-purple-600">Ava</span>AI
              </h3>
            </div>
            <p className="text-muted-foreground mb-4">
              Comment smarter on LinkedIn with AI that sounds like you.
            </p>
            <div className="flex space-x-4">
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded hover:bg-purple-100 transition">
                <Linkedin className="h-4 w-4 text-purple-600" />
              </a>
            </div>
          </div>
          {/* Product */}
          <div>
            <h3 className="font-bold mb-4">Product</h3>
            <ul className="space-y-3">
              <li><a href="#features" className="text-muted-foreground hover:text-purple-600 transition-colors">Features</a></li>
              <li><a href="#plans" className="text-muted-foreground hover:text-purple-600 transition-colors">Pricing</a></li>
              <li><a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-purple-600 transition-colors">Chrome Extension</a></li>
              <li>
                <a
                  href={ROUTES.MANAGE_SUBSCRIPTION}
                  className="text-muted-foreground hover:text-purple-600 transition-colors"
                >
                  Manage Subscription
                </a>
              </li>
            </ul>
          </div>
          {/* Legal */}
          <div>
            <h3 className="font-bold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-purple-600 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
          {/* Contact */}
          <div>
            <h3 className="font-bold mb-4">Contact</h3>
            <div className="flex items-center space-x-2 text-muted-foreground">
              {/* WhatsApp icon as SVG for best compatibility */}
              <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.472-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.571-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.099 3.2 5.077 4.366.71.306 1.263.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 6.318h-.001a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.455 4.436-9.89 9.893-9.89 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.896 6.994c-.003 5.456-4.438 9.891-9.893 9.891zm8.413-18.304A11.815 11.815 0 0012.05 0C5.495 0 .06 5.435.058 12.088c0 2.13.557 4.21 1.615 6.032L0 24l6.063-1.594a11.876 11.876 0 005.978 1.547h.005c6.554 0 11.89-5.435 11.893-12.088a11.82 11.82 0 00-3.487-8.669z"/></svg>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-600 transition-colors font-medium"
              >
                {WHATSAPP_NUMBER}
              </a>
            </div>
          </div>
        </div>
        <hr className="my-8 border-slate-200" />
        <div className="text-center text-muted-foreground text-sm">
          <p>© 2025 Ava AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 