import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Pre-calculate star positions once
  const stars = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      width: Math.random() * 2 + 1,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: Math.random() * 2 + 1.5,
      delay: Math.random() * 1.5,
    })), []
  );

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 2200);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, []);

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
      {/* Reduced starfield - 20 stars with simpler animation */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              width: star.width,
              height: star.width,
              left: `${star.left}%`,
              top: `${star.top}%`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: star.duration,
              repeat: 2,
              delay: star.delay,
            }}
          />
        ))}
      </div>

      {/* Simplified beam effect */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-[150px] h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 55% / 0.1) 30%, hsl(210 100% 60% / 0.15) 50%, hsl(210 100% 55% / 0.1) 70%, transparent 100%)",
          filter: "blur(30px)",
        }}
      />

      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-[4px] h-full"
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 70% / 0.8) 30%, hsl(0 0% 100%) 50%, hsl(210 100% 70% / 0.8) 70%, transparent 100%)",
        }}
      />

      {/* Logo and text container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          className="relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Simplified glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, hsl(210 100% 55% / 0.3) 0%, transparent 70%)",
              filter: "blur(20px)",
              transform: "scale(1.5)",
            }}
          />

          {/* Logo circle */}
          <div
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(210 100% 50%) 0%, hsl(220 100% 45%) 100%)",
              boxShadow: "0 0 40px hsl(210 100% 55% / 0.5)",
            }}
          >
            <span className="font-display text-3xl sm:text-4xl font-bold text-white">
              L
            </span>
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-col items-center gap-3"
        >
          <h1
            className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white"
            style={{
              textShadow: "0 0 20px hsl(210 100% 60% / 0.5)",
            }}
          >
            LIGHTATHON
          </h1>

          <motion.p
            className="text-xs sm:text-sm tracking-[0.3em] uppercase text-primary/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.8 }}
          >
            Journey to LightOS
          </motion.p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-2 mt-4"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};
