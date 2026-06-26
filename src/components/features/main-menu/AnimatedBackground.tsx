import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020617] perspective-1000">
      {/* Deep Space Background Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black opacity-90" />
      
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20" />

      {/* Dynamic Aura Cores - Fast rendering with Framer Motion, no heavy CSS mix-blend */}
      <div className="absolute inset-0 opacity-50">
        <motion.div 
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            rotate: { duration: 100, repeat: Infinity, ease: "linear" },
            scale: { duration: 30, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 20, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-[150vw] h-[150vw] sm:w-[120vw] sm:h-[120vw] top-[-30%] left-[-20%] rounded-[45%] bg-[radial-gradient(circle,_rgba(56,189,248,0.2)_0%,_transparent_60%)] blur-[90px]" 
        />
        <motion.div 
          animate={{
            rotate: [360, 0],
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            rotate: { duration: 130, repeat: Infinity, ease: "linear" },
            scale: { duration: 40, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 25, repeat: Infinity, ease: "easeInOut" }
          }}
          className="absolute w-[160vw] h-[160vw] sm:w-[100vw] sm:h-[100vw] top-[0%] left-[20%] rounded-[40%] bg-[radial-gradient(circle,_rgba(168,85,247,0.15)_0%,_transparent_60%)] blur-[100px]" 
        />
        <motion.div 
          animate={{
            rotate: [0, -180, -360],
            x: [0, 100, 0],
            y: [0, -100, 0],
          }}
          transition={{
            duration: 60, repeat: Infinity, ease: "easeInOut"
          }}
          className="absolute w-[120vw] h-[120vw] sm:w-[80vw] sm:h-[80vw] top-[40%] left-[-10%] rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.25)_0%,_transparent_70%)] blur-[120px]" 
        />
      </div>

      {/* Floating Particles - Dense */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-80">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-blue-300"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
              scale: Math.random() * 0.3 + 0.1,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              y: [null, Math.random() * -150 - 50],
              x: [null, Math.random() * 80 - 40],
              opacity: [null, Math.random() * 0.7 + 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 15 + 15,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              boxShadow: "0 0 15px rgba(147,197,253,0.4)",
            }}
          />
        ))}
      </div>

      {/* Shooting Stars / Light streaks effect */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute h-[1px] w-[300px] left-[-100px] top-[20%] bg-gradient-to-r from-transparent via-cyan-300 to-transparent rotate-[-35deg] animate-[ping_8s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="absolute h-[1px] w-[400px] right-[-100px] top-[60%] bg-gradient-to-r from-transparent via-purple-300 to-transparent rotate-[-45deg] animate-[ping_12s_cubic-bezier(0,0,0.2,1)_infinite_3s]" />
      </div>
      
      {/* Dynamic Grid Overlay (Vignette) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617]/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/30 via-transparent to-[#020617]/30" />
    </div>
  );
};


