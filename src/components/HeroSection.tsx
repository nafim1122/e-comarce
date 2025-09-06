

import React from 'react';
import { ArrowRight, Leaf, Shield, Star } from 'lucide-react';
import './HeroSection.css';

const HeroSection = () => {
  return (
    <section id="home" className="relative py-20 lg:py-32 overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat hero-bg"
      >
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-medium">
                <Leaf className="h-5 w-5" />
                <span>Premium Quality from Sreemangal</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Finest Tea from
                <span className="block text-amber-400">Bangladesh's Tea Capital</span>
              </h1>
              <p className="text-xl text-gray-200 leading-relaxed max-w-lg">
                Premium tea leaves, blends, and accessories delivered fresh 
                from the gardens of Sreemangal to your doorstep.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold">Quality Assured</div>
                  <div className="text-sm text-gray-300">Direct from Gardens</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <Star className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold">Premium Grade</div>
                  <div className="text-sm text-gray-300">Finest Selection</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <Leaf className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <div className="font-semibold">100% Fresh</div>
                  <div className="text-sm text-gray-300">Garden to Cup</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="#products"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Shop Tea Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href="#about"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-gray-800 transition-all duration-200"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <img
                src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop"
                alt="Premium Tea Collection"
                className="w-full h-96 object-cover rounded-xl shadow-2xl"
              />
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">500+</div>
                  <div className="text-sm text-gray-600">Happy Customers</div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600">100%</div>
                  <div className="text-sm text-gray-600">Fresh</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
