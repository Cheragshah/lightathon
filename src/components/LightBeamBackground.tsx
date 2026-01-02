import { useMemo } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // Subtle gradient orbs with emerald/teal theme
  const orbs = useMemo(() => [
    { id: 1, color: "160 84% 39%", size: 500, x: "25%", y: "30%", opacity: 0.04 },
    { id: 2, color: "172 66% 50%", size: 400, x: "75%", y: "40%", opacity: 0.03 },
    { id: 3, color: "186 72% 45%", size: 350, x: "50%", y: "85%", opacity: 0.03 },
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base background */}
      <div className="absolute inset-0 bg-background" />

      {/* Central Light Beam - Top to Bottom */}
      <div className="absolute inset-0 flex justify-center">
        {/* Layer 5: Wide atmospheric glow */}
        <div 
          className="absolute w-[300px] h-full"
          style={{
            background: "linear-gradient(to bottom, hsl(160 84% 39% / 0.03) 0%, hsl(172 66% 50% / 0.05) 30%, hsl(172 66% 50% / 0.04) 70%, transparent 100%)",
            filter: "blur(80px)",
          }}
        />

        {/* Layer 4: Medium glow */}
        <div 
          className="absolute w-[150px] h-full"
          style={{
            background: "linear-gradient(to bottom, hsl(160 84% 45% / 0.06) 0%, hsl(172 66% 50% / 0.08) 40%, hsl(160 84% 39% / 0.05) 80%, transparent 100%)",
            filter: "blur(50px)",
          }}
        />

        {/* Layer 3: Inner glow */}
        <div 
          className="absolute w-[60px] h-full"
          style={{
            background: "linear-gradient(to bottom, hsl(160 84% 50% / 0.1) 0%, hsl(172 66% 55% / 0.15) 35%, hsl(160 84% 45% / 0.08) 75%, transparent 100%)",
            filter: "blur(25px)",
          }}
        />

        {/* Layer 2: Core glow */}
        <div 
          className="absolute w-[20px] h-full"
          style={{
            background: "linear-gradient(to bottom, hsl(160 84% 60% / 0.2) 0%, hsl(172 66% 60% / 0.3) 30%, hsl(160 84% 50% / 0.15) 70%, transparent 100%)",
            filter: "blur(10px)",
          }}
        />

        {/* Layer 1: Bright core beam */}
        <div 
          className="absolute w-[4px] h-full"
          style={{
            background: "linear-gradient(to bottom, hsl(160 84% 70% / 0.4) 0%, hsl(172 66% 65% / 0.5) 25%, hsl(160 84% 55% / 0.3) 60%, transparent 100%)",
            filter: "blur(2px)",
          }}
        />

        {/* Layer 0: Ultra-bright center line */}
        <div 
          className="absolute w-[2px] h-[70%]"
          style={{
            background: "linear-gradient(to bottom, hsl(0 0% 100% / 0.6) 0%, hsl(160 84% 70% / 0.5) 20%, hsl(172 66% 60% / 0.3) 50%, transparent 100%)",
          }}
        />
      </div>

      {/* Subtle gradient orbs */}
      {orbs.map((orb) => (
        <div
          key={orb.id}
          className={`absolute rounded-full ${!isReducedMotion ? 'animate-fade-in' : ''}`}
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, hsl(${orb.color} / ${orb.opacity}) 0%, transparent 70%)`,
            filter: "blur(60px)",
          }}
        />
      ))}

      {/* Radial gradient from top center */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 50% 40% at 50% 0%, hsl(160 84% 39% / 0.08) 0%, transparent 100%)",
        }}
      />

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.012] dark:opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
