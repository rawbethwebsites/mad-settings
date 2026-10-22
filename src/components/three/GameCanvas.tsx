'use client';

import { Canvas } from '@react-three/fiber';
import { useReducedMotion } from './useReducedMotion';

interface GameCanvasProps {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
  onWebGLSupport?: (supported: boolean) => void;
}

export function GameCanvas({
  children,
  className = '',
  fallback = null,
  onWebGLSupport,
}: GameCanvasProps) {
  const reduced = useReducedMotion();
  const getWebGLSupport = () => {
    if (typeof window === 'undefined') return true;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  };
  const supported = getWebGLSupport();
  onWebGLSupport?.(supported);

  if (!supported || reduced) {
    return <div className={className} aria-hidden="true">{fallback}</div>;
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div className={className} aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <Canvas
        dpr={isMobile ? 1 : [1, 1.5]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 10], fov: 50, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1a1210', 1);
        }}
      >
        <ambientLight intensity={0.3} color="#ffb380" />
        <directionalLight
          position={[2, 5, 3]}
          intensity={1.2}
          color="#ff8844"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <pointLight position={[0, 2, 2]} intensity={0.8} color="#ffaa66" />
        {children}
      </Canvas>
    </div>
  );
}
