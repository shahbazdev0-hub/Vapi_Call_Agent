import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CallToAction = () => {
  const handleBookDemo = () => {
    window.open('https://calendly.com/jonwlaw/30min', '_blank', 'noopener,noreferrer');
  };

  const scrollToForm = () => {
    const formSection = document.getElementById('form-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.5,
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-lg mt-4 p-4 rounded-xl glass-effect flex items-center justify-between gap-4"
    >
      <div className="flex-1">
        <p className="text-sm text-navy-700 font-medium text-center sm:text-left">
          Get a free enhanced list with a <strong className="text-orange-600 font-semibold">demo call</strong>, or scroll to <strong className="text-orange-600 font-semibold">place an order</strong> instantly.
        </p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBookDemo}
          className="font-semibold border-navy-200 text-navy-800 bg-white/50 hover:bg-white hover:border-navy-300 shadow-sm transition-all duration-300 group"
        >
          <Calendar className="w-4 h-4 mr-2 text-orange-500 transition-transform group-hover:scale-110" /> Book a Demo
        </Button>
        <Button
          onClick={scrollToForm}
          size="sm"
          className="font-semibold text-white bg-orange-500 hover:bg-orange-600 shadow-sm transition-all duration-300 group"
        >
          <Download className="w-4 h-4 mr-2 transition-transform group-hover:translate-y-0.5" /> Place an Order
        </Button>
      </div>
    </motion.div>
  );
};

export default CallToAction;