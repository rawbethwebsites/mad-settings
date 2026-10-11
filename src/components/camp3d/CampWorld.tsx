"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import CampScene from "./CampScene";

export default function CampWorld() {
  const progress = useRef(0);
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    document.body.classList.add("camp-night");
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) {
      setSupported(false);
      return () => document.body.classList.remove("camp-night");
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = max > 0 ? window.scrollY / max : 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    setReady(!reduced);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.body.classList.remove("camp-night");
    };
  }, []);

  if (!supported) {
    return <div className="camp-world-fallback" aria-hidden="true" />;
  }

  if (!ready) {
    return <div className="camp-world-fallback" aria-hidden="true" />;
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div className="camp-world" aria-hidden="true">
      <Canvas
        dpr={isMobile ? 1 : [1, 1.6]}
        gl={{ antialias: !isMobile, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 5.6, 26], fov: 50, near: 0.1, far: 120 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#1b1430");
        }}
      >
        <CampScene progress={progress} />
      </Canvas>
    </div>
  );
}
