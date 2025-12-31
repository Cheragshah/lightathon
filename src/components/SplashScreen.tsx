import { motion } from "framer-motion";
import { Brain } from "lucide-react";
import { useSystemBranding } from "@/hooks/useSystemBranding";

interface SplashScreenProps {
  onComplete?: () => void;
}

export const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const { appName, appLogo, appTagline } = useSystemBranding();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 2 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      {/* Gradient background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.3 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.2 }}
          transition={{ duration: 2, delay: 0.2, ease: "easeOut" }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-accent/40 to-primary/40 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated logo */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            duration: 0.8, 
            type: "spring", 
            stiffness: 200,
            damping: 15 
          }}
          className="relative"
        >
          {/* Glow effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-full blur-2xl scale-150"
          />
          
          {/* Icon/Logo container */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-2xl">
            {appLogo ? (
              <img 
                src={appLogo} 
                alt={appName} 
                className="w-16 h-16 object-contain"
              />
            ) : (
              <Brain className="w-16 h-16 text-primary-foreground" strokeWidth={1.5} />
            )}
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient-primary mb-2">
            {appName}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {appTagline}
          </p>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.5 }}
              animate={{ scale: [0.5, 1, 0.5] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-accent"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};
