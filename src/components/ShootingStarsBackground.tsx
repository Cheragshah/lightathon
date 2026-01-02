import { useState, useEffect, useMemo } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  duration: number;
}

export const ShootingStarsBackground = () => {
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);

  // Reduced static ambient stars - 15 instead of 40
  const ambientStars = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      twinkleDelay: Math.random() * 5,
      twinkleDuration: 3 + Math.random() * 2,
    }));
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;
    
    const createShootingStar = () => {
      const id = Date.now() + Math.random();
      const startX = Math.random() * 80 + 10;
      const startY = Math.random() * 30;
      const angle = 25 + Math.random() * 25;
      const duration = 0.8 + Math.random() * 0.4;
      
      setShootingStars(prev => [...prev, { id, startX, startY, angle, duration }]);
      
      setTimeout(() => {
        setShootingStars(prev => prev.filter(star => star.id !== id));
      }, duration * 1000 + 100);
    };

    // Increased interval: 6-14 seconds instead of 3-8
    let timeoutId: NodeJS.Timeout;
    const scheduleNext = () => {
      const interval = 6000 + Math.random() * 8000;
      timeoutId = setTimeout(() => {
        createShootingStar();
        scheduleNext();
      }, interval);
    };

    const initialTimeout = setTimeout(createShootingStar, 3000);
    scheduleNext();

    return () => {
      clearTimeout(initialTimeout);
      clearTimeout(timeoutId);
    };
  }, []);

  if (isReducedMotion) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: "radial-gradient(ellipse at top, hsl(220 60% 20% / 0.3) 0%, transparent 60%)",
        }}
      />

      {/* Ambient twinkling stars - CSS animation only */}
      {ambientStars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            backgroundColor: `hsl(210 80% 80% / ${star.opacity})`,
            boxShadow: `0 0 ${star.size}px hsl(210 80% 70% / ${star.opacity * 0.3})`,
            animationDelay: `${star.twinkleDelay}s`,
            animationDuration: `${star.twinkleDuration}s`,
          }}
        />
      ))}

      {/* Shooting Stars */}
      {shootingStars.map((star) => (
        <div
          key={star.id}
          className="absolute"
          style={{
            left: `${star.startX}%`,
            top: `${star.startY}%`,
            transform: `rotate(${star.angle}deg)`,
            animation: `shootingStarDash ${star.duration}s linear forwards`,
          }}
        >
          <div
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: 'hsl(0 0% 100%)',
              boxShadow: '0 0 4px 1px hsl(210 100% 80%), 0 0 8px 2px hsl(210 100% 60%)',
            }}
          />
          <div
            className="absolute h-[1.5px] rounded-full"
            style={{
              width: '50px',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(to left, hsl(210 100% 85% / 0.7), hsl(210 100% 60% / 0.2), transparent)',
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes shootingStarDash {
          0% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(var(--angle, 35deg));
          }
          100% {
            opacity: 0;
            transform: translateX(200px) translateY(120px) rotate(var(--angle, 35deg));
          }
        }
      `}</style>
    </div>
  );
};
