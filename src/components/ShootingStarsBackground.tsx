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

  // Static ambient stars
  const ambientStars = useMemo(() => {
    if (isReducedMotion) return [];
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      twinkleDelay: Math.random() * 5,
    }));
  }, []);

  useEffect(() => {
    if (isReducedMotion) return;
    
    const createShootingStar = () => {
      const id = Date.now() + Math.random();
      const startX = Math.random() * 80 + 10; // 10-90%
      const startY = Math.random() * 30; // Upper 30%
      const angle = 25 + Math.random() * 25; // 25-50 degrees
      const duration = 0.6 + Math.random() * 0.5; // 0.6-1.1 seconds
      
      setShootingStars(prev => [...prev, { id, startX, startY, angle, duration }]);
      
      // Remove after animation
      setTimeout(() => {
        setShootingStars(prev => prev.filter(star => star.id !== id));
      }, duration * 1000 + 100);
    };

    // Create shooting stars at random intervals
    let timeoutId: NodeJS.Timeout;
    const scheduleNext = () => {
      const interval = 3000 + Math.random() * 5000; // 3-8 seconds
      timeoutId = setTimeout(() => {
        createShootingStar();
        scheduleNext();
      }, interval);
    };

    // Initial star after a short delay
    const initialTimeout = setTimeout(createShootingStar, 2000);
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
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at top, hsl(220 60% 20% / 0.3) 0%, transparent 60%)",
        }}
      />

      {/* Ambient twinkling stars */}
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
            boxShadow: `0 0 ${star.size * 2}px hsl(210 80% 70% / ${star.opacity * 0.5})`,
            animationDelay: `${star.twinkleDelay}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
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
          {/* Star head */}
          <div
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: 'hsl(0 0% 100%)',
              boxShadow: '0 0 4px 1px hsl(210 100% 80%), 0 0 8px 2px hsl(210 100% 60%)',
            }}
          />
          {/* Star tail */}
          <div
            className="absolute h-[1.5px] rounded-full"
            style={{
              width: '60px',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'linear-gradient(to left, hsl(210 100% 85% / 0.8), hsl(210 100% 60% / 0.3), transparent)',
            }}
          />
        </div>
      ))}

      {/* CSS for shooting star animation */}
      <style>{`
        @keyframes shootingStarDash {
          0% {
            opacity: 1;
            transform: translateX(0) translateY(0) rotate(var(--angle, 35deg));
          }
          100% {
            opacity: 0;
            transform: translateX(250px) translateY(150px) rotate(var(--angle, 35deg));
          }
        }
      `}</style>
    </div>
  );
};
