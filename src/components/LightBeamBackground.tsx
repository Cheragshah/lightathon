import { useMemo, useState, useEffect, useCallback, useRef } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const lastMouseUpdate = useRef(0);

  // Throttled mouse handler - only update every 100ms
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isReducedMotion) return;
    const now = Date.now();
    if (now - lastMouseUpdate.current < 100) return;
    lastMouseUpdate.current = now;
    
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Reduced starfield - 50 total stars instead of 160
  const stars = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      twinkleDelay: Math.random() * 5,
      twinkleDuration: 3 + Math.random() * 2,
    }));
  }, []);

  // Reduced orbs - only 2 instead of 4
  const orbs = useMemo(() => {
    if (isReducedMotion) return [];
    return [
      { left: '10%', top: '20%', size: 300, color: 'hsl(210 100% 50% / 0.05)' },
      { left: '85%', top: '60%', size: 250, color: 'hsl(220 100% 55% / 0.04)' },
    ];
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Deep space gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, hsl(225 50% 3%) 0%, hsl(230 60% 6%) 30%, hsl(225 50% 8%) 60%, hsl(220 45% 4%) 100%)",
        }}
      />

      {/* Static CSS-animated starfield */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${(mousePosition.x - 0.5) * 5}px, ${(mousePosition.y - 0.5) * 5}px)`,
          transition: 'transform 0.3s ease-out',
          willChange: 'transform',
        }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              backgroundColor: `hsl(210 100% 90% / ${star.opacity})`,
              boxShadow: `0 0 ${star.size}px hsl(210 100% 80% / ${star.opacity * 0.3})`,
              animationDelay: `${star.twinkleDelay}s`,
              animationDuration: `${star.twinkleDuration}s`,
            }}
          />
        ))}
      </div>

      {/* Simplified orbs - no parallax, just static glow */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: orb.left,
            top: orb.top,
            width: orb.size,
            height: orb.size,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
        />
      ))}

      {/* SIMPLIFIED CENTRAL LIGHT BEAM - fewer layers, less blur */}
      <div className="absolute inset-0 flex justify-center overflow-hidden">
        {/* Wide atmospheric glow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[300px] sm:w-[400px] h-full opacity-60"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 50% / 0.05) 20%, hsl(210 100% 60% / 0.1) 50%, hsl(210 100% 50% / 0.05) 80%, transparent 100%)",
            filter: "blur(60px)",
          }}
        />

        {/* Medium glow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[100px] sm:w-[150px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 60% / 0.25) 20%, hsl(215 100% 65% / 0.45) 50%, hsl(210 100% 60% / 0.25) 80%, transparent 100%)",
            filter: "blur(25px)",
          }}
        />

        {/* Core beam */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[20px] sm:w-[28px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 70% / 0.7) 15%, hsl(200 100% 85% / 0.95) 50%, hsl(210 100% 70% / 0.7) 85%, transparent 100%)",
            filter: "blur(4px)",
          }}
        />

        {/* Bright center line */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-[6px] sm:w-[10px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, hsl(200 100% 90% / 0.9) 10%, hsl(0 0% 100%) 50%, hsl(200 100% 90% / 0.9) 90%, transparent 100%)",
          }}
        />

        {/* Static center glow */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[300px] sm:w-[400px] h-[400px] sm:h-[600px]"
          style={{
            background: "radial-gradient(ellipse at center, hsl(210 100% 60% / 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      </div>

      {/* Bottom reflection - simplified */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[800px] h-[200px] sm:h-[300px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, hsl(210 100% 55% / 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.01]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
