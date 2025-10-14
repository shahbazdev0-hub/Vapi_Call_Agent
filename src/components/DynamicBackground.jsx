import React from 'react';
import { motion } from 'framer-motion';

const DynamicBackground = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0),
            radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)
          `,
          backgroundSize: '40px 40px',
          backgroundPosition: '0 0, 20px 20px',
          maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 100%)',
          opacity: 0.5,
        }}
      ></div>
    </motion.div>
  );
};

export default DynamicBackground;