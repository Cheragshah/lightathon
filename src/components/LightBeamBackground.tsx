import { useMemo } from "react";

const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const LightBeamBackground = () => {
  // Subtle gradient orbs (Apple-style)
  const orbs = useMemo(() => [
    { id: 1, color: "262 83% 58%", size: 600, x: "20%", y: "20%", opacity: 0.08 },
    { id: 2, color: "250 89% 64%", size: 500, x: "80%", y: "30%", opacity: 0.06 },
    { id: 3, color: "280 80% 60%", size: 400, x: "50%", y: "80%", opacity: 0.05 },
  ], []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Base background */}
      <div className="absolute inset-0 bg-background" />

      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 dark:opacity-100 opacity-50"
        style={{
          background: "radial-gradient(ellipse at top, hsl(var(--primary) / 0.03) 0%, transparent 50%)",
        }}
      />

      {/* Gradient orbs */}
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
            filter: "blur(80px)",
          }}
        />
      ))}

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
