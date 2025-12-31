import { useRef, useMemo, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Check if device is mobile/low-end
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const isReducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reduced particle counts for performance
const PARTICLE_COUNT = isMobile ? 400 : 1000;
const ORB_COUNT = isMobile ? 6 : 12;
const NODE_COUNT = isMobile ? 20 : 40;

// Simplified particle wave component
function ParticleWave() {
  const ref = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.5;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }
    
    return positions;
  }, []);

  useFrame((state) => {
    if (ref.current && !isReducedMotion) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.03;
      
      // Simpler animation - just rotate, don't update each particle
      if (!isMobile) {
        const positions = ref.current.geometry.attributes.position.array as Float32Array;
        const time = state.clock.elapsedTime;
        for (let i = 0; i < positions.length / 3; i += 4) { // Skip particles for performance
          const x = positions[i * 3];
          const z = positions[i * 3 + 2];
          positions[i * 3 + 1] = Math.sin(x * 0.5 + time) * Math.cos(z * 0.5 + time * 0.5) * 1.5;
        }
        ref.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <group position={[0, -1, 0]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled>
        <PointMaterial
          transparent
          color="#ff6b35"
          size={isMobile ? 0.1 : 0.08}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

// Simplified floating orbs
function GlowingOrbs() {
  const groupRef = useRef<THREE.Group>(null);
  
  const orbs = useMemo(() => {
    return Array.from({ length: ORB_COUNT }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 8
      ] as [number, number, number],
      scale: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.2,
      offset: Math.random() * Math.PI * 2
    }));
  }, []);

  useFrame((state) => {
    if (groupRef.current && !isReducedMotion) {
      groupRef.current.children.forEach((child, i) => {
        const orb = orbs[i];
        child.position.y = orb.position[1] + Math.sin(state.clock.elapsedTime * orb.speed + orb.offset) * 0.5;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial
            color={i % 2 === 0 ? "#ff6b35" : "#ffa500"}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

// Simplified neural network
function NeuralNetwork() {
  const ref = useRef<THREE.Group>(null);
  
  const nodePositions = useMemo(() => {
    const positions = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (ref.current && !isReducedMotion) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={ref}>
      <Points positions={nodePositions} stride={3}>
        <PointMaterial
          transparent
          color="#ff9500"
          size={0.15}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
}

// Main Scene
function Scene() {
  return (
    <>
      <color attach="background" args={['#0a0a0a']} />
      <fog attach="fog" args={['#0a0a0a', 5, 25]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ff6b35" />
      
      <ParticleWave />
      <GlowingOrbs />
      {!isMobile && <NeuralNetwork />}
    </>
  );
}

// Gradient fallback for when 3D isn't needed
const GradientFallback = () => (
  <div 
    className="absolute inset-0 w-full h-full"
    style={{
      background: 'radial-gradient(ellipse at center, rgba(255, 107, 53, 0.15) 0%, rgba(10, 10, 10, 1) 70%)'
    }}
  />
);

export const Hero3D = () => {
  const [shouldRender3D, setShouldRender3D] = useState(false);
  
  useEffect(() => {
    // Delay 3D rendering to allow initial paint
    const timer = setTimeout(() => {
      setShouldRender3D(!isReducedMotion);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Don't render 3D on very small screens
  if (typeof window !== 'undefined' && window.innerWidth < 480) {
    return (
      <div className="absolute inset-0 w-full h-full">
        <GradientFallback />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {!shouldRender3D ? (
        <GradientFallback />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          dpr={isMobile ? 1 : [1, 1.5]}
          gl={{ 
            antialias: !isMobile, 
            alpha: true,
            powerPreference: 'low-power'
          }}
          frameloop={isReducedMotion ? 'demand' : 'always'}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      )}
      
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60 pointer-events-none" />
    </div>
  );
};
