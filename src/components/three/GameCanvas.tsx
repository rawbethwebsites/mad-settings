'use client';

import { Component, useEffect, useState, type ReactNode } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';

interface GameCanvasProps {
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
  onWebGLSupport?: (supported: boolean) => void;
  camera?: CanvasProps['camera'];
  orthographic?: boolean;
  background?: string;
}

// Keep the playable DOM board when a driver cannot create (or loses) a context.
class CanvasBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

export function GameCanvas({
  children,
  className = '',
  fallback = null,
  onWebGLSupport,
  camera = { position: [0, 0, 10], fov: 50, near: 0.1, far: 100 },
  orthographic = false,
  background = '#201b24',
}: GameCanvasProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => {
    let available = false;
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      available = !!gl;
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    } catch { /* The fallback is also used when WebGL is blocked by policy. */ }
    const timer = window.setTimeout(() => setSupported(available), 0);
    onWebGLSupport?.(available);
    return () => window.clearTimeout(timer);
  }, [onWebGLSupport]);

  return (
    <div className={className} aria-hidden="true" style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', borderRadius: 'inherit', pointerEvents: 'none' }}>
      {supported === true ? <CanvasBoundary fallback={fallback}>
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={camera}
        orthographic={orthographic}
        fallback={fallback}
        onCreated={({ gl }) => {
          gl.setClearColor(background, 1);
          gl.domElement.addEventListener('webglcontextlost', () => setSupported(false), { once: true });
        }}
      >
        <ambientLight intensity={1.05} color="#fff4e8" />
        <hemisphereLight intensity={1.4} color="#e5edff" groundColor="#9c6344" />
        <directionalLight position={[-3, 5, 6]} intensity={2.3} color="#ffc48e" />
        <directionalLight position={[4, 2, 5]} intensity={1.5} color="#dbe7ff" />
        {children}
      </Canvas>
      </CanvasBoundary> : fallback}
    </div>
  );
}
