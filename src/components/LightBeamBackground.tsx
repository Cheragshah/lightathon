import { useMemo, useState, useEffect, useCallback } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isReducedMotion) return;
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    setMousePosition({ x, y });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Parallax starfield layers
  const starLayers = useMemo(() => {
    if (isReducedMotion) return [];
    return [
      // Far stars (slow movement)
      Array.from({ length: 80 }, (_, i) => ({
        id: `far-${i}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        parallaxStrength: 0.02,
        twinkleDelay: Math.random() * 5,
      })),
      // Mid stars (medium movement)
      Array.from({ length: 50 }, (_, i) => ({
        id: `mid-${i}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.6 + 0.3,
        parallaxStrength: 0.04,
        twinkleDelay: Math.random() * 5,
      })),
      // Near stars (fast movement)
      Array.from({ length: 30 }, (_, i) => ({
        id: `near-${i}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() * 2.5 + 1.5,
        opacity: Math.random() * 0.8 + 0.4,
        parallaxStrength: 0.08,
        twinkleDelay: Math.random() * 5,
      })),
    ];
  }, []);

  // Floating particles
  const particles = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${40 + Math.random() * 20}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 6}s`,
      size: 2 + Math.random() * 4,
    }));
  }, []);

  // Floating orbs
  const orbs = useMemo(() => {
    if (isReducedMotion) return [];
    return [
      { left: '8%', top: '15%', size: 350, delay: '0s', color: 'hsl(210 100% 50% / 0.06)' },
      { left: '88%', top: '65%', size: 280, delay: '2s', color: 'hsl(220 100% 55% / 0.05)' },
      { left: '3%', top: '75%', size: 220, delay: '4s', color: 'hsl(200 100% 50% / 0.04)' },
      { left: '92%', top: '10%', size: 200, delay: '1s', color: 'hsl(230 100% 60% / 0.05)' },
    ];
  }, []);

  // Shooting stars
  const [shootingStars, setShootingStars] = useState<Array<{
    id: number;
    startX: number;
    startY: number;
    angle: number;
    duration: number;
    delay: number;
  }>>([]);

  useEffect(() => {
    if (isReducedMotion) return;
    
    const createShootingStar = () => {
      const id = Date.now();
      const startX = Math.random() * 100;
      const startY = Math.random() * 40; // Start in upper portion
      const angle = 25 + Math.random() * 20; // Angle between 25-45 degrees
      const duration = 0.8 + Math.random() * 0.6; // 0.8-1.4 seconds
      
      setShootingStars(prev => [...prev, { id, startX, startY, angle, duration, delay: 0 }]);
      
      // Remove after animation completes
      setTimeout(() => {
        setShootingStars(prev => prev.filter(star => star.id !== id));
      }, duration * 1000 + 100);
    };

    // Create shooting stars at random intervals (every 2-6 seconds)
    const scheduleNext = () => {
      const interval = 2000 + Math.random() * 4000;
      return setTimeout(() => {
        createShootingStar();
        scheduleNext();
      }, interval);
    };

    // Initial shooting star after 1 second
    const initialTimeout = setTimeout(createShootingStar, 1000);
    const intervalId = scheduleNext();

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(intervalId);
    };
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

      {/* Interactive parallax starfield */}
      {starLayers.map((layer, layerIndex) => (
        <div
          key={`layer-${layerIndex}`}
          className="absolute inset-0 transition-transform duration-300 ease-out"
          style={{
            transform: `translate(${(mousePosition.x - 0.5) * layer[0]?.parallaxStrength * 100}px, ${(mousePosition.y - 0.5) * layer[0]?.parallaxStrength * 100}px)`,
          }}
        >
          {layer.map((star) => (
            <div
              key={star.id}
              className="absolute rounded-full"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                backgroundColor: `hsl(210 100% 90% / ${star.opacity})`,
                boxShadow: `0 0 ${star.size * 2}px hsl(210 100% 80% / ${star.opacity * 0.5})`,
                animation: !isReducedMotion ? `twinkle ${3 + Math.random() * 2}s ease-in-out infinite ${star.twinkleDelay}s` : undefined,
              }}
            />
          ))}
        </div>
      ))}

      {/* Floating orbs with parallax */}
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
            filter: 'blur(50px)',
            animationDelay: orb.delay,
            transform: `translate(${(mousePosition.x - 0.5) * 20}px, ${(mousePosition.y - 0.5) * 20}px)`,
            transition: 'transform 0.5s ease-out',
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
            className="absolute left-1/2 -translate-x-1/2 w-[350px] sm:w-[500px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 50% / 0.03) 20%, hsl(210 100% 60% / 0.06) 50%, hsl(210 100% 50% / 0.03) 80%, transparent 100%)",
              filter: "blur(120px)",
            }}
          />

          {/* Layer 5: Wide glow */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[200px] sm:w-[300px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(215 100% 55% / 0.08) 15%, hsl(220 100% 60% / 0.18) 50%, hsl(215 100% 55% / 0.08) 85%, transparent 100%)",
              filter: "blur(70px)",
            }}
          />

          {/* Layer 4: Medium glow */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[120px] sm:w-[180px] h-full ${!isReducedMotion ? 'animate-beam-glow' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 60% / 0.2) 20%, hsl(215 100% 65% / 0.4) 50%, hsl(210 100% 60% / 0.2) 80%, transparent 100%)",
              filter: "blur(40px)",
            }}
          />

          {/* Layer 3: Inner glow */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[50px] sm:w-[80px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 65% / 0.45) 20%, hsl(210 100% 70% / 0.7) 50%, hsl(210 100% 65% / 0.45) 80%, transparent 100%)",
              filter: "blur(22px)",
            }}
          />

          {/* Layer 2: Core beam */}
          <div 
            className={`absolute left-1/2 -translate-x-1/2 w-[16px] sm:w-[22px] h-full ${!isReducedMotion ? 'animate-beam-pulse' : ''}`}
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(210 100% 70% / 0.75) 15%, hsl(200 100% 85% / 0.98) 50%, hsl(210 100% 70% / 0.75) 85%, transparent 100%)",
              filter: "blur(6px)",
            }}
          />

          {/* Layer 1: Bright center line */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[5px] sm:w-[8px] h-full"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(200 100% 88% / 0.9) 10%, hsl(0 0% 100%) 50%, hsl(200 100% 88% / 0.9) 90%, transparent 100%)",
              filter: "blur(2px)",
            }}
          />

          {/* Layer 0: Ultra-bright core */}
          <div 
            className="absolute left-1/2 -translate-x-1/2 w-[2px] sm:w-[3px] h-[70%] top-[15%]"
            style={{
              background: "linear-gradient(to bottom, transparent 0%, hsl(0 0% 100%) 20%, hsl(0 0% 100%) 80%, transparent 100%)",
            }}
          />
        </div>

        {/* Static glow at center */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[250px] sm:w-[400px] h-[500px] sm:h-[700px]"
          style={{
            background: "radial-gradient(ellipse at center, hsl(210 100% 60% / 0.18) 0%, transparent 70%)",
            filter: "blur(60px)",
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
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1000px] h-[250px] sm:h-[350px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, hsl(210 100% 55% / 0.14) 0%, hsl(220 100% 50% / 0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Top subtle glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] sm:w-[700px] h-[180px] sm:h-[280px]"
        style={{
          background: "radial-gradient(ellipse at center top, hsl(215 100% 60% / 0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Subtle noise texture */}
      <div 
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Shooting Stars */}
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="absolute pointer-events-none"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            animation: `shootingStar ${star.duration}s linear forwards`,
            transform: `rotate(${star.angle}deg)`,
          }}
        >
          {/* Star head */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: 'hsl(0 0% 100%)',
              boxShadow: '0 0 6px 2px hsl(210 100% 80%), 0 0 12px 4px hsl(210 100% 60%)',
            }}
          />
          {/* Star tail */}
          <div
            className="absolute h-[2px] rounded-full"
            style={{
              width: '80px',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(to left, hsl(210 100% 80% / 0.9), hsl(210 100% 60% / 0.4), transparent)',
            }}
          />
        </div>
      ))}

      {/* CSS for animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shootingStar {
          0% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(var(--angle, 35deg));
          }
          100% {
            opacity: 0;
            transform: translateX(300px) translateY(180px) rotate(var(--angle, 35deg));
          }
        }
      `}</style>
    </div>
  );
};