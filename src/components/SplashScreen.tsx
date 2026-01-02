import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2.2 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2200);

    // Complete after fade animation (2.2s + 0.6s)
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, []); // Empty dependency array - only run once

  if (!isVisible) {
    return null;
  }

  if (isFadingOut) {
    return (
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: "linear-gradient(180deg, hsl(225 50% 3%) 0%, hsl(230 60% 6%) 50%, hsl(220 50% 4%) 100%)",
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(180deg, hsl(225 50% 3%) 0%, hsl(230 60% 6%) 50%, hsl(220 50% 4%) 100%)",
      }}
    >
      {/* Animated starfield background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{
              duration: Math.random() * 2 + 1,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Central beam effect */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-[200px] h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 55% / 0.1) 30%, hsl(210 100% 60% / 0.2) 50%, hsl(210 100% 55% / 0.1) 70%, transparent 100%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-[4px] h-full"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 70% / 0.8) 30%, hsl(0 0% 100%) 50%, hsl(210 100% 70% / 0.8) 70%, transparent 100%)",
        }}
      />

      {/* Logo and text container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated logo glow */}
        <motion.div
          className="relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Outer glow rings */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(210 100% 55% / 0.4) 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Inner pulse */}
          <motion.div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(210 100% 50%) 0%, hsl(220 100% 45%) 100%)",
              boxShadow: "0 0 40px hsl(210 100% 55% / 0.5), inset 0 0 20px hsl(210 100% 70% / 0.3)",
            }}
            animate={{
              boxShadow: [
                "0 0 40px hsl(210 100% 55% / 0.5), inset 0 0 20px hsl(210 100% 70% / 0.3)",
                "0 0 60px hsl(210 100% 60% / 0.7), inset 0 0 30px hsl(210 100% 75% / 0.4)",
                "0 0 40px hsl(210 100% 55% / 0.5), inset 0 0 20px hsl(210 100% 70% / 0.3)",
              ],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.span
              className="font-display text-3xl sm:text-4xl font-bold text-white"
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              L
            </motion.span>
          </motion.div>
        </motion.div>

        {/* LIGHTATHON text with letter-by-letter animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex overflow-hidden">
            {"LIGHTATHON".split("").map((letter, i) => (
              <motion.span
                key={i}
                className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  duration: 0.4,
                  delay: 0.8 + i * 0.05,
                  ease: "easeOut",
                }}
                style={{
                  textShadow: "0 0 20px hsl(210 100% 60% / 0.5), 0 0 40px hsl(210 100% 55% / 0.3)",
                }}
              >
                {letter}
              </motion.span>
            ))}
          </div>

          <motion.p
            className="text-xs sm:text-sm tracking-[0.3em] uppercase text-primary/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.4 }}
          >
            Journey to LightOS
          </motion.p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="flex items-center gap-2 mt-4"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};
