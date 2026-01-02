import { useMemo } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // Floating particles
  const particles = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: `${40 + Math.random() * 20}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${8 + Math.random() * 6}s`,
      size: 2 + Math.random() * 4,
    }));
  }, []);

  // Side orbs
  const orbs = useMemo(() => {
    if (isReducedMotion) return [];
    return [
      { left: '10%', top: '20%', size: 300, delay: '0s', color: 'hsl(210 100% 50% / 0.08)' },
      { left: '85%', top: '60%', size: 250, delay: '2s', color: 'hsl(220 100% 60% / 0.06)' },
      { left: '5%', top: '70%', size: 200, delay: '4s', color: 'hsl(200 100% 55% / 0.05)' },
      { left: '90%', top: '15%', size: 180, delay: '1s', color: 'hsl(230 100% 65% / 0.07)' },
    ];
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Deep space gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(220 50% 3%) 0%, hsl(230 60% 6%) 30%, hsl(220 50% 8%) 60%, hsl(210 40% 4%) 100%)",
        }}
      />

      {/* Starfield effect */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 20% 30%, hsl(210 100% 80%) 1px, transparent 0),
            radial-gradient(1px 1px at 40% 70%, hsl(220 100% 75%) 1px, transparent 0),
            radial-gradient(1px 1px at 60% 20%, hsl(200 100% 85%) 1px, transparent 0),
            radial-gradient(1px 1px at 80% 50%, hsl(230 100% 70%) 1px, transparent 0),
            radial-gradient(2px 2px at 10% 80%, hsl(210 100% 90%) 1px, transparent 0),
            radial-gradient(2px 2px at 90% 10%, hsl(220 100% 85%) 1px, transparent 0),
            radial-gradient(1px 1px at 50% 50%, hsl(200 100% 80%) 1px, transparent 0),
            radial-gradient(1px 1px at 30% 90%, hsl(210 100% 70%) 1px, transparent 0),
            radial-gradient(1px 1px at 70% 40%, hsl(230 100% 75%) 1px, transparent 0)
          `,
          backgroundSize: '100% 100%',
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className={!isReducedMotion ? 'animate-float-orb' : ''}
          style={{
            position: 'absolute',
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
            animationDelay: orb.delay,
          }}
        />
      ))}

      {/* CENTRAL ANIMATED LIGHT BEAM */}
      <div className="absolute inset-0 flex justify-center overflow-hidden">
        {/* Beam container with vertical animation */}
        <div 
          className={`absolute w-full h-[200%] ${!isReducedMotion ? 'animate-beam-travel' : ''}`}
          style={{ top: '-50%' }}
        >
          {/* Layer 6: Ultra-wide atmospheric glow */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[300px] sm:w-[400px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 50% / 0.03) 20%, hsl(210 100% 60% / 0.05) 50%, hsl(210 100% 50% / 0.03) 80%, transparent 100%)",
              filter: "blur(100px)",
            }}
          />

          {/* Layer 5: Wide glow */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[180px] sm:w-[250px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(215 100% 55% / 0.08) 15%, hsl(220 100% 60% / 0.15) 50%, hsl(215 100% 55% / 0.08) 85%, transparent 100%)",
              filter: "blur(60px)",
            }}
          />

          {/* Layer 4: Medium glow */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[100px] sm:w-[140px] h-full ${!isReducedMotion ? 'animate-beam-glow' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 60% / 0.2) 20%, hsl(215 100% 65% / 0.35) 50%, hsl(210 100% 60% / 0.2) 80%, transparent 100%)",
              filter: "blur(35px)",
            }}
          />

          {/* Layer 3: Inner glow */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[40px] sm:w-[60px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 65% / 0.4) 20%, hsl(210 100% 70% / 0.6) 50%, hsl(210 100% 65% / 0.4) 80%, transparent 100%)",
              filter: "blur(18px)",
            }}
          />

          {/* Layer 2: Core beam */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[12px] sm:w-[16px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 70% / 0.7) 15%, hsl(200 100% 80% / 0.95) 50%, hsl(210 100% 70% / 0.7) 85%, transparent 100%)",
              filter: "blur(5px)",
            }}
          />

          {/* Layer 1: Bright center line */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[4px] sm:w-[6px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(200 100% 85% / 0.85) 10%, hsl(0 0% 100% / 0.98) 50%, hsl(200 100% 85% / 0.85) 90%, transparent 100%)",
              filter: "blur(2px)",
            }}
          />

          {/* Layer 0: Ultra-bright core */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[2px] h-[70%] top-[15%]"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(0 0% 100%) 20%, hsl(0 0% 100%) 80%, transparent 100%)",
            }}
          />
        </div>

        {/* Static glow at center to maintain visibility */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[200px] sm:w-[300px] h-[400px] sm:h-[600px]"
          style={{
            background: "radial-gradient(ellipse at center, hsl(210 100% 60% / 0.15) 0%, transparent 70%)",
            filter: "blur(50px)",
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
            backgroundColor: "hsl(210 100% 75%)",
            boxShadow: `0 0 ${particle.size * 4}px hsl(210 100% 65% / 0.9), 0 0 ${particle.size * 8}px hsl(220 100% 60% / 0.5)`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Bottom reflection pool */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[200px] sm:h-[300px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, hsl(210 100% 55% / 0.12) 0%, hsl(220 100% 50% / 0.05) 40%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Top subtle glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] h-[150px] sm:h-[250px]"
        style={{
          background: "radial-gradient(ellipse at center top, hsl(215 100% 60% / 0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};