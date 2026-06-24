import React from 'react';
import { motion } from 'framer-motion';

export function ThinkingAnimation() {
  const dotVariants = {
    initial: { scale: 1 },
    animate: { scale: [1, 1.4, 1] },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  return (
    <motion.div 
      className="flex items-center gap-[6px] py-2"
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          variants={dotVariants}
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 0.2,
            ease: "easeInOut",
          }}
          className="w-1.5 h-1.5 rounded-full bg-violet"
        />
      ))}
    </motion.div>
  );
}
