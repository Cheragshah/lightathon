import { useMemo } from "react";

export const LightBeamBackground = () => {
  // Generate random stars
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      size: Math.random() * 2 + 1,
    }));
  }, []);

  // Generate floating particles
  const particles = useMemo(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      id: i,
      left: `${30 + Math.random() * 40}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 2}s`,
    }));
  }, []);

  // Generate light rays
  const rays = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      rotation: i * 30,
      delay: `${i * 0.25}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Base gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, #0a0a0f 0%, #080810 100%)",
        }}
      />

      {/* Top purple ambient glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
        style={{
          background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Main light beam container */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer purple glow */}
        <div 
          className="absolute w-[600px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(139, 92, 246, 0.1) 30%, rgba(139, 92, 246, 0.2) 50%, rgba(139, 92, 246, 0.1) 70%, transparent 100%)",
            filter: "blur(60px)",
          }}
        />

        {/* Indigo layer */}
        <div 
          className="absolute w-[400px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(99, 102, 241, 0.15) 30%, rgba(99, 102, 241, 0.25) 50%, rgba(99, 102, 241, 0.15) 70%, transparent 100%)",
            filter: "blur(40px)",
          }}
        />

        {/* Blue layer */}
        <div 
          className="absolute w-[250px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.2) 30%, rgba(59, 130, 246, 0.35) 50%, rgba(59, 130, 246, 0.2) 70%, transparent 100%)",
            filter: "blur(25px)",
          }}
        />

        {/* Cyan layer */}
        <div 
          className="absolute w-[150px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(34, 211, 238, 0.3) 30%, rgba(34, 211, 238, 0.5) 50%, rgba(34, 211, 238, 0.3) 70%, transparent 100%)",
            filter: "blur(15px)",
          }}
        />

        {/* White core */}
        <div 
          className="absolute w-[60px] h-full"
          style={{
            background: "linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.4) 30%, rgba(255, 255, 255, 0.7) 50%, rgba(255, 255, 255, 0.4) 70%, transparent 100%)",
            filter: "blur(8px)",
          }}
        />

        {/* Beam flow animation overlay */}
        <div 
          className="absolute w-[80px] h-[200px] animate-beam-flow"
          style={{
            background: "linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.3), transparent)",
            filter: "blur(10px)",
          }}
        />
      </div>

      {/* Radiating light rays */}
      <div className="absolute inset-0 flex items-center justify-center">
        {rays.map((ray) => (
          <div
            key={ray.id}
            className="absolute w-[2px] h-[500px] origin-bottom animate-ray-pulse"
            style={{
              background: "linear-gradient(to top, rgba(56, 189, 248, 0.4) 0%, transparent 100%)",
              transform: `rotate(${ray.rotation}deg)`,
              animationDelay: ray.delay,
            }}
          />
        ))}
      </div>

      {/* Floating particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 w-2 h-2 rounded-full animate-float-particle"
          style={{
            left: particle.left,
            background: "radial-gradient(circle, rgba(34, 211, 238, 0.8) 0%, transparent 70%)",
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}

      {/* Twinkling stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-foreground/80 animate-twinkle"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* Bottom cyan reflection */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]"
        style={{
          background: "radial-gradient(ellipse at center bottom, rgba(34, 211, 238, 0.2) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};
