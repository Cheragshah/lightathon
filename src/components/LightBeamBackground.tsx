import { useMemo } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // Floating particles
  const particles = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${45 + Math.random() * 10}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 4}s`,
      size: 2 + Math.random() * 3,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Dark gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, hsl(220 25% 6%) 0%, hsl(220 20% 8%) 50%, hsl(220 25% 5%) 100%)",
        }}
      />

      {/* Ambient background glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center top, hsl(185 85% 55% / 0.06) 0%, transparent 50%)",
        }}
      />

      {/* Central Light Beam */}
      <div className="absolute inset-0 flex justify-center">
        {/* Layer 6: Ultra-wide atmospheric glow */}
        <div 
          className={`absolute w-[250px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 55% / 0.04) 20%, hsl(185 85% 55% / 0.06) 50%, hsl(185 85% 55% / 0.04) 80%, transparent 100%)",
            filter: "blur(80px)",
          }}
        />

        {/* Layer 5: Wide glow */}
        <div 
          className="absolute w-[150px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 55% / 0.08) 20%, hsl(185 85% 55% / 0.12) 50%, hsl(185 85% 55% / 0.08) 80%, transparent 100%)",
            filter: "blur(50px)",
          }}
        />

        {/* Layer 4: Medium glow */}
        <div 
          className={`absolute w-[80px] h-full ${!isReducedMotion ? 'animate-beam-glow' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 60% / 0.15) 20%, hsl(185 85% 60% / 0.25) 50%, hsl(185 85% 60% / 0.15) 80%, transparent 100%)",
            filter: "blur(30px)",
          }}
        />

        {/* Layer 3: Inner glow */}
        <div 
          className="absolute w-[30px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 65% / 0.3) 20%, hsl(185 85% 70% / 0.5) 50%, hsl(185 85% 65% / 0.3) 80%, transparent 100%)",
            filter: "blur(15px)",
          }}
        />

        {/* Layer 2: Core beam */}
        <div 
          className={`absolute w-[8px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 70% / 0.6) 15%, hsl(185 85% 80% / 0.9) 50%, hsl(185 85% 70% / 0.6) 85%, transparent 100%)",
            filter: "blur(4px)",
          }}
        />

        {/* Layer 1: Bright center line */}
        <div 
          className="absolute w-[3px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(185 85% 85% / 0.8) 10%, hsl(0 0% 100% / 0.95) 50%, hsl(185 85% 85% / 0.8) 90%, transparent 100%)",
            filter: "blur(1px)",
          }}
        />

        {/* Layer 0: Ultra-bright core */}
        <div 
          className="absolute w-[1px] h-[80%] top-0"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(0 0% 100%) 20%, hsl(0 0% 100%) 80%, transparent 100%)",
          }}
        />
      </div>

      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: particle.left,
            bottom: "-20px",
            width: particle.size,
            height: particle.size,
            backgroundColor: "hsl(185 85% 70%)",
            boxShadow: `0 0 ${particle.size * 3}px hsl(185 85% 60% / 0.8), 0 0 ${particle.size * 6}px hsl(185 85% 55% / 0.4)`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Bottom reflection */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, hsl(185 85% 55% / 0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
