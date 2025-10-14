import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownCircle, ShieldCheck, X } from 'lucide-react';
import Header from '@/components/Header';
import LogoSlider from '@/components/LogoSlider';
import CallToAction from '@/components/CallToAction';
import OrderFlow from '@/components/OrderFlow';
import DynamicBackground from '@/components/DynamicBackground';
import Footer from '@/components/Footer';

const HomePage = () => {
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const titleVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.1 } },
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.3 } },
  };

  const highlights = [
    {
      icon: ShieldCheck,
      text: "industry-leading no questions asked refund guarantee.",
      color: "text-green-600",
      highlight: "120-day",
      highlightFirst: true,
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col items-center relative overflow-hidden bg-white font-sans transition-all duration-300 ${showAnnouncement ? 'pt-36' : 'pt-24'}`}>
      {showAnnouncement && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 text-center text-sm font-semibold flex justify-center items-center">
          <span>
            ✨ NEW: Now offering 100,000 credits for each qualified referral.&nbsp;
            <a 
              href="https://calendly.com/your-username" 
              onClick={(e) => {
                e.preventDefault();
                if (window.Calendly) {
                  window.Calendly.initPopupWidget({url: 'https://calendly.com/your-username'});
                }
                return false;
              }}
              className="underline hover:text-white/80 transition-colors"
            >
              Join now!
            </a>
            &nbsp;✨
          </span>
          <button onClick={() => setShowAnnouncement(false)} className="absolute right-4 text-white hover:text-white/80 transition-colors">
            <X size={18} />
          </button>
        </div>
      )}
      <DynamicBackground />
      <Header showAnnouncement={showAnnouncement}/>
      <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-orange-400/30 rounded-full blur-[150px] opacity-50 -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-amber-400/30 rounded-full blur-[150px] opacity-50 translate-x-1/2 translate-y-1/2"></div>
      
      <div className="absolute inset-0 z-0 bg-noise"></div>
      
      <main className="relative z-10 w-full max-w-4xl flex flex-col items-center mt-20 md:mt-16 flex-grow">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-6"
        >
          <motion.h1 
            variants={titleVariants}
            initial="hidden"
            animate="visible"
            className="gradient-shimmer text-5xl md:text-6xl mb-3">
              Verifies.co
          </motion.h1>
          <motion.p 
            variants={subtitleVariants}
            initial="hidden"
            animate="visible"
            className="text-md md:text-lg text-navy-700 max-w-xl mx-auto font-medium">
            Boost pickup rates by 2.5x-8x with out propietary AI stack for $0.03 per lead, or buy pre-enhanced leads for $0.08.
          </motion.p>
        </motion.div>

        <CallToAction />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.9 }}
          className="w-full max-w-md mt-8 flex flex-col items-center"
        >
          <div className="w-full rounded-xl shadow-lg p-1 bg-gradient-to-br from-orange-400 to-amber-500">
            <div className="overflow-hidden rounded-lg">
              <div style={{padding:"56.25% 0 0 0",position:"relative"}}>
                <iframe 
                  src="https://player.vimeo.com/video/1118616190?background=1&autoplay=1&loop=1&muted=1&app_id=58479" 
                  frameBorder="0" 
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" 
                  referrerPolicy="strict-origin-when-cross-origin" 
                  style={{position:"absolute",top:"-5%",left:"-5%",width:"110%",height:"110%"}} 
                  title="Sequence 12">
                </iframe>
              </div>
            </div>
          </div>
           <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-xs text-navy-600 mt-2 text-center"
          >
            A quick demo of the order process.
          </motion.p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.7 }}
          className="w-full max-w-md mt-6 space-y-4"
        >
          {highlights.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <item.icon className={`w-8 h-8 ${item.color} flex-shrink-0`} />
              <p className="text-sm text-navy-700 font-medium">
                {item.highlightFirst ? (
                  <>
                    <span className="font-bold text-orange-600 bg-orange-100/80 px-2 py-1 rounded-md">{item.highlight}</span> {item.text}
                  </>
                ) : (
                  <>
                    {item.text} <span className="font-bold text-orange-600 bg-orange-100/80 px-2 py-1 rounded-md">{item.highlight}</span> {item.suffix}
                  </>
                )}
              </p>
            </div>
          ))}
        </motion.div>

        <div className="w-full max-w-2xl mt-8">
          <LogoSlider />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 1.2,
            duration: 0.8,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeOut",
            repeatDelay: 0.5,
          }}
          className="text-orange-500 mt-4 mb-2"
        >
          <ArrowDownCircle className="w-8 h-8 md:h-10 animate-bounce" />
        </motion.div>
      </main>
      
      <div className="wavy-divider w-full z-10">
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="shape-fill"></path>
        </svg>
      </div>

      <div id="form-section" className="relative z-10 w-full max-w-2xl pb-20 flex justify-center bg-white">
        <OrderFlow />
      </div>

      <Footer />
    </div>
  );
};

export default HomePage;