import { useMemo } from "react";

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // 12 light rays emanating from center
  const rays = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      rotation: i * 30, // 30 degrees apart
      delay: `${i * 0.15}s`,
    }));
  }, []);

  // 20 floating particles
  const particles = useMemo(() => {
    if (isMobile) return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      left: `${45 + Math.random() * 10}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    }));
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${45 + Math.random() * 10}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Dark gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #0a0a0f 0%, #0d0d18 50%, #080810 100%)",
        }}
      />

      {/* Ambient background glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, rgba(100, 130, 255, 0.03) 0%, transparent 70%)",
        }}
      />

      {/* Central Light Beam Container */}
      <div className="absolute inset-0 flex justify-center">
        {/* Layer 6: Extra wide atmospheric glow (200px, purple-500/5, 60px blur) */}
        <div 
          className={`absolute w-[200px] h-full ${!isReducedMotion ? 'animate-beam-flow animation-delay-400' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(168, 85, 247, 0.05) 20%, rgba(168, 85, 247, 0.08) 50%, rgba(168, 85, 247, 0.05) 80%, transparent 100%)",
            filter: "blur(60px)",
          }}
        />

        {/* Layer 5: Wide ambient glow (120px, indigo-500/10, 40px blur) */}
        <div 
          className={`absolute w-[120px] h-full ${!isReducedMotion ? 'animate-beam-flow animation-delay-300' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(99, 102, 241, 0.1) 20%, rgba(99, 102, 241, 0.15) 50%, rgba(99, 102, 241, 0.1) 80%, transparent 100%)",
            filter: "blur(40px)",
          }}
        />

        {/* Layer 4: Outer glow (60px, blue-400/20, 20px blur) */}
        <div 
          className={`absolute w-[60px] h-full ${!isReducedMotion ? 'animate-beam-flow animation-delay-200' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(96, 165, 250, 0.2) 20%, rgba(96, 165, 250, 0.3) 50%, rgba(96, 165, 250, 0.2) 80%, transparent 100%)",
            filter: "blur(20px)",
          }}
        />

        {/* Layer 3: Medium glow (20px, cyan-400/40, 8px blur) */}
        <div 
          className={`absolute w-[20px] h-full ${!isReducedMotion ? 'animate-beam-flow animation-delay-100' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(34, 211, 238, 0.4) 20%, rgba(34, 211, 238, 0.6) 50%, rgba(34, 211, 238, 0.4) 80%, transparent 100%)",
            filter: "blur(8px)",
          }}
        />

        {/* Layer 2: Inner glow (4px, cyan-300/80, 2px blur) */}
        <div 
          className={`absolute w-[4px] h-full ${!isReducedMotion ? 'animate-beam-flow' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(103, 232, 249, 0.8) 20%, rgba(103, 232, 249, 1) 50%, rgba(103, 232, 249, 0.8) 80%, transparent 100%)",
            filter: "blur(2px)",
          }}
        />

        {/* Layer 1: Core beam (2px, white gradient) */}
        <div 
          className={`absolute w-[2px] h-full ${!isReducedMotion ? 'animate-beam-flow' : ''}`}
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.9) 30%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0.9) 70%, transparent 100%)",
          }}
        />
      </div>

      {/* Light Rays - 12 rays emanating from center */}
      {!isReducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          {rays.map((ray) => (
            <div
              key={ray.id}
              className="absolute w-[1px] h-[300px] origin-bottom animate-ray-pulse"
              style={{
                background: "linear-gradient(to top, rgba(100, 200, 255, 0.3) 0%, transparent 100%)",
                transform: `rotate(${ray.rotation}deg)`,
                animationDelay: ray.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Floating Particles */}
      {!isReducedMotion && particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 w-[1px] h-[1px] rounded-full animate-float-particle"
          style={{
            left: particle.left,
            backgroundColor: "rgba(103, 232, 249, 0.6)",
            boxShadow: "0 0 4px rgba(103, 232, 249, 0.8)",
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Bottom Reflection */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px]"
        style={{
          background: "linear-gradient(to top, rgba(6, 182, 212, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
};
