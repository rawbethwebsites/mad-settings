"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Crowd } from "./CampPeople";
import { camperLook, type PersonSpec } from "@/data/campLayout";
import type { AvatarLook, Gender } from "@/data/avatar";

// One camper on a small stage, gently turning: the live preview on My camp
export default function AvatarStage({ gender, look }: { gender: Gender; look: AvatarLook }) {
  const people = useMemo<PersonSpec[]>(
    () => [{
      x: 0, y: 0, z: 0, ry: 0, phase: 0, pose: "stand",
      look: camperLook({ gender, look }),
      path: (t) => ({ x: 0, z: 0, ry: Math.sin(t * 0.6) * 0.7 }),
    }],
    [gender, look],
  );
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0.85, 3.6], fov: 30 }} onCreated={({ camera }) => camera.lookAt(0, 0.78, 0)}>
      <color attach="background" args={["#1b1430"]} />
      <hemisphereLight args={["#e8e4ff", "#2a1d3a", 1.1]} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} />
      <Crowd key={`${look.hair}-${look.shape}-${gender}`} people={people} />
    </Canvas>
  );
}
