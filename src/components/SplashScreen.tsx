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
      transition={{ duration: 0.4, delay: 0.8 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      {/* Simple gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-br from-accent/30 to-primary/30 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Logo - simplified animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          <div className="relative p-5 rounded-2xl bg-gradient-to-br from-primary to-accent shadow-xl">
            {appLogo ? (
              <img 
                src={appLogo} 
                alt={appName} 
                className="w-12 h-12 object-contain"
                loading="eager"
              />
            ) : (
              <Brain className="w-12 h-12 text-primary-foreground" strokeWidth={1.5} />
            )}
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient-primary mb-1">
            {appName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {appTagline}
          </p>
        </motion.div>

        {/* Simple loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
        />
      </div>
    </motion.div>
  );
};
