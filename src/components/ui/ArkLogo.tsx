import React from 'react';
import { motion } from 'framer-motion';

interface ArkLogoProps {
  size?: number;
  className?: string;
}

export const ArkLogo: React.FC<ArkLogoProps> = ({ size = 100, className = '' }) => {
  return (
    <div 
      className={`${className} relative flex items-center justify-center select-none`}
      style={{ 
        width: size, 
        height: size,
      }}
    >
      {/* Deep Glow Behind Logo */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-cyan-500/20 blur-[20px]"
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Outer Tech Ring */}
      <motion.div 
        className="absolute inset-0 rounded-full border border-sky-500/30 border-t-sky-400 border-b-cyan-600 shadow-[0_0_15px_rgba(56,189,248,0.5)_inset]"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Dashed Ring */}
      <motion.div 
        className="absolute w-[80%] h-[80%] rounded-full border-2 border-dashed border-cyan-400/50"
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Center Core Glow */}
      <div className="absolute w-[60%] h-[60%] rounded-full bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-700 shadow-[0_0_20px_rgba(56,189,248,0.8)] flex items-center justify-center overflow-hidden">
        
        {/* Core Pulsing Sheen */}
        <motion.div 
          className="absolute inset-0 bg-white/30"
          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />

        {/* The 'A' / Ship Motif */}
        <motion.svg
          width="60%"
          height="60%"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.9)]"
        >
          {/* Futuristic Ship or A shape */}
          <path
            d="M50 15L20 75L35 75L50 45L65 75L80 75L50 15Z"
            className="fill-white"
          />
          {/* Subtle accent beam */}
          <line x1="50" y1="40" x2="50" y2="85" stroke="currentColor" strokeWidth="4" />
        </motion.svg>
      </div>

    </div>
  );
};
