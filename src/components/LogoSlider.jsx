import React from 'react';
import { motion } from 'framer-motion';

const logos = [
  { name: 'Triad Securities' },
  { name: 'Lead411' },
  { name: 'Aude' },
  { name: 'Boston University' },
  { name: 'Indelibly' },
  { name: 'Stackcurve' },
  { name: 'SWTCH' },
];

const duplicatedLogos = [...logos, ...logos];

const sliderVariants = {
  animate: {
    x: ['-100%', '0%'],
    transition: {
      x: {
        repeat: Infinity,
        repeatType: 'loop',
        duration: 35,
        ease: 'linear',
      },
    },
  },
};

const LogoSlider = () => {
  return (
    <div className="relative h-full w-full overflow-hidden py-4">
      <div className="absolute inset-0 z-10" style={{
        background: 'linear-gradient(to right, white, transparent 10%, transparent 90%, white)'
      }}></div>
      <motion.div
        className="flex items-center"
        variants={sliderVariants}
        animate="animate"
      >
        {duplicatedLogos.map((logo, index) => (
          <div key={index} className="flex-shrink-0 mx-8 flex items-center justify-center" style={{ width: '150px' }}>
            <span className="text-xl font-bold text-gray-400 whitespace-nowrap">{logo.name}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default LogoSlider;