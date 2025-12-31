import { useMemo } from "react";

const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // Reduced counts for performance
  const stars = useMemo(() => {
    const count = isMobile ? 15 : 25;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      size: Math.random() * 2 + 1,
    }));
  }, []);

  // Reduced floating particles
  const particles = useMemo(() => {
    if (isMobile) return []; // Skip on mobile
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      left: `${30 + Math.random() * 40}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 2}s`,
    }));
  }, []);

  // Reduced light rays
  const rays = useMemo(() => {
    const count = isMobile ? 6 : 8;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      rotation: i * (360 / count),
      delay: `${i * 0.3}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none will-change-transform">
      {/* Base gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #0a0a0f 0%, #080810 100%)",
        }}
      />

      {/* Top purple ambient glow - simplified */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Main light beam container - simplified layers */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Combined glow layers */}
        <div 
          className="absolute w-[400px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(99, 102, 241, 0.15) 30%, rgba(59, 130, 246, 0.25) 50%, rgba(99, 102, 241, 0.15) 70%, transparent 100%)",
            filter: "blur(40px)",
          }}
        />

        {/* Core glow */}
        <div 
          className="absolute w-[100px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(34, 211, 238, 0.3) 30%, rgba(255, 255, 255, 0.5) 50%, rgba(34, 211, 238, 0.3) 70%, transparent 100%)",
            filter: "blur(12px)",
          }}
        />

        {/* Beam flow animation - skip on reduced motion */}
        {!isReducedMotion && (
          <div 
            className="absolute w-[60px] h-[150px] animate-beam-flow"
            style={{
              background: "linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.25), transparent)",
              filter: "blur(8px)",
            }}
          />
        )}
      </div>

      {/* Radiating light rays - reduced */}
      {!isReducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          {rays.map((ray) => (
            <div
              key={ray.id}
              className="absolute w-[2px] h-[400px] origin-bottom animate-ray-pulse"
              style={{
                background: "linear-gradient(to top, rgba(56, 189, 248, 0.3) 0%, transparent 100%)",
                transform: `rotate(${ray.rotation}deg)`,
                animationDelay: ray.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Floating particles - skip on mobile */}
      {!isReducedMotion && particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 w-2 h-2 rounded-full animate-float-particle"
          style={{
            left: particle.left,
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.7) 0%, transparent 70%)",
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Twinkling stars - reduced */}
      {stars.map((star) => (
        <div
          key={star.id}
          className={`absolute rounded-full bg-foreground/70 ${isReducedMotion ? '' : 'animate-twinkle'}`}
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* Bottom cyan reflection - simplified */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, rgba(34, 211, 238, 0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};
