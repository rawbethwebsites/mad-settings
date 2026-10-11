"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sampleCamp, TENT_COLORS, type Vec3 } from "@/data/campWorld";

type ProgressRef = React.MutableRefObject<number>;

function Atmosphere({ progress }: { progress: ProgressRef }) {
  const { scene } = useThree();
  const color = useMemo(() => new THREE.Color("#1b1430"), []);
  const from = useMemo(() => new THREE.Color(), []);
  const to = useMemo(() => new THREE.Color(), []);
  const fog = useMemo(() => new THREE.FogExp2("#1b1430", 0.024), []);

  useLayoutEffect(() => {
    scene.background = color;
    scene.fog = fog;
  }, [scene, color, fog]);

  useFrame(() => {
    const sample = sampleCamp(progress.current);
    from.set(sample.skyA);
    to.set(sample.skyB);
    color.copy(from).lerp(to, sample.mix);
    fog.color.copy(color);
    fog.density = 0.016 + (1 - sample.fire) * 0.012;
  });

  return null;
}

function CameraRig({ progress }: { progress: ProgressRef }) {
  const { camera } = useThree();
  const pos = useMemo(() => new THREE.Vector3(0, 5.6, 26), []);
  const look = useMemo(() => new THREE.Vector3(0, 1.3, 4), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const sample = sampleCamp(progress.current);
    targetPos.set(...sample.pos);
    targetLook.set(...sample.look);
    const damp = 1 - Math.pow(0.0008, delta);
    pos.lerp(targetPos, damp);
    look.lerp(targetLook, damp);
    camera.position.copy(pos);
    camera.lookAt(look);
  });

  return null;
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[48, 48]} />
        <meshStandardMaterial color="#142414" roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 10]} receiveShadow>
        <planeGeometry args={[3.2, 22]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} />
      </mesh>
    </group>
  );
}

function Forest() {
  const foliage = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);
  const count = 42;

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 17.5 + (i % 5) * 1.35;
      dummy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      dummy.rotation.set(0, angle, 0);
      dummy.scale.setScalar(0.75 + (i % 4) * 0.22);
      dummy.updateMatrix();
      foliage.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.y = 0;
      dummy.scale.set(0.35, 1, 0.35);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
    }
    if (foliage.current) foliage.current.instanceMatrix.needsUpdate = true;
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, count]}>
        <cylinderGeometry args={[0.18, 0.28, 1.4, 5]} />
        <meshStandardMaterial color="#3b2414" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={foliage} args={[undefined, undefined, count]} position={[0, 2.1, 0]}>
        <coneGeometry args={[1.15, 4.1, 6]} />
        <meshStandardMaterial color="#0f2a18" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

function Tent({ position, color, rotation = 0 }: { position: Vec3; color: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <coneGeometry args={[1.4, 1.8, 4]} />
        <meshStandardMaterial color={color} roughness={0.62} metalness={0.04} />
      </mesh>
      <mesh position={[0, 0.28, 0.62]}>
        <boxGeometry args={[0.58, 0.5, 0.08]} />
        <meshStandardMaterial color="#1a120c" />
      </mesh>
    </group>
  );
}

function TentRing() {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2 + 0.2;
        const radius = 8.2;
        return (
          <Tent
            key={i}
            position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
            color={TENT_COLORS[i % TENT_COLORS.length]}
            rotation={-angle + Math.PI}
          />
        );
      })}
    </group>
  );
}

function Bonfire({ progress }: { progress: ProgressRef }) {
  const flameA = useRef<THREE.Mesh>(null);
  const flameB = useRef<THREE.Mesh>(null);
  const flameC = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.PointLight>(null);
  const sparkPositions = useMemo(() => new Float32Array(48 * 3), []);
  const sparks = useRef<THREE.Points>(null);
  const seeds = useMemo(
    () => Array.from({ length: 48 }, () => ({ a: Math.random() * Math.PI * 2, s: 0.45 + Math.random() * 0.9, h: 1.1 + Math.random() * 2.2 })),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const fire = sampleCamp(progress.current).fire;
    const flicker = 0.86 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17) * 0.05;
    if (flameA.current) flameA.current.scale.set(0.9 * fire * flicker, (1.1 + fire) * flicker, 0.9 * fire * flicker);
    if (flameB.current) flameB.current.scale.set(0.7 * fire, (0.85 + fire * 0.8) * (0.9 + Math.sin(t * 9) * 0.1), 0.7 * fire);
    if (flameC.current) flameC.current.scale.set(0.45 * fire, 0.6 + fire * 0.7, 0.45 * fire);
    if (light.current) {
      light.current.intensity = 1.1 + fire * 3.4 * flicker;
      light.current.distance = 18 + fire * 10;
    }
    for (let i = 0; i < 48; i += 1) {
      const seed = seeds[i];
      const rise = (t * seed.s + i * 0.07) % 1;
      sparkPositions[i * 3] = Math.cos(seed.a + t * 0.4) * (0.12 + rise * 0.55);
      sparkPositions[i * 3 + 1] = 0.35 + rise * seed.h * (0.5 + fire);
      sparkPositions[i * 3 + 2] = Math.sin(seed.a + t * 0.4) * (0.12 + rise * 0.55);
    }
    const attr = sparks.current?.geometry.getAttribute("position");
    if (attr) attr.needsUpdate = true;
  });

  return (
    <group>
      <mesh position={[0.35, 0.12, 0.1]} rotation={[0.2, 0.4, 0.2]}>
        <boxGeometry args={[0.9, 0.18, 0.22]} />
        <meshStandardMaterial color="#4a2c16" roughness={1} />
      </mesh>
      <mesh position={[-0.3, 0.12, -0.05]} rotation={[-0.15, -0.5, 0.1]}>
        <boxGeometry args={[0.85, 0.16, 0.2]} />
        <meshStandardMaterial color="#3a2210" roughness={1} />
      </mesh>
      <mesh ref={flameA} position={[0, 0.55, 0]}>
        <coneGeometry args={[0.55, 1.5, 6]} />
        <meshStandardMaterial color="#FB7185" emissive="#FB7185" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh ref={flameB} position={[0.08, 0.7, 0.04]}>
        <coneGeometry args={[0.32, 1.15, 5]} />
        <meshStandardMaterial color="#BEF264" emissive="#F59E0B" emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <mesh ref={flameC} position={[0, 0.85, 0]}>
        <coneGeometry args={[0.16, 0.8, 5]} />
        <meshStandardMaterial color="#FDFBF7" emissive="#FDFBF7" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <points ref={sparks}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#FB7185" size={0.07} transparent opacity={0.85} depthWrite={false} />
      </points>
      <pointLight ref={light} position={[0, 1.4, 0]} color="#FB7185" intensity={3} distance={22} />
    </group>
  );
}

function MovieScreen({ progress }: { progress: ProgressRef }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = progress.current;
    const on = smoothstep(0.32, 0.4, t) * (1 - smoothstep(0.46, 0.54, t));
    if (mat.current) {
      mat.current.emissiveIntensity = 0.15 + on * (1.8 + Math.sin(clock.elapsedTime * 8) * 0.2);
    }
  });
  return (
    <group position={[0, 0, -12.4]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[6.4, 3.6, 0.16]} />
        <meshStandardMaterial ref={mat} color="#111018" emissive="#22D3EE" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, 0.3, 0.4]}>
        <boxGeometry args={[0.25, 0.6, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0.3, -0.4]}>
        <boxGeometry args={[0.25, 0.6, 0.25]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  );
}

function KaraokeStage({ progress }: { progress: ProgressRef }) {
  const left = useRef<THREE.PointLight>(null);
  const right = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = progress.current;
    const on = smoothstep(0.42, 0.48, t) * (1 - smoothstep(0.54, 0.6, t)) + 0.15;
    const pulse = 0.6 + Math.sin(clock.elapsedTime * 4) * 0.4;
    if (left.current) left.current.intensity = on * 2.2 * pulse;
    if (right.current) right.current.intensity = on * 2.2 * (1.2 - pulse);
  });
  return (
    <group position={[10.4, 0, 3.4]} rotation={[0, -0.7, 0]}>
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[4.2, 0.24, 3.1]} />
        <meshStandardMaterial color="#2a1248" />
      </mesh>
      <mesh position={[0, 1.1, -0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 1.8, 8]} />
        <meshStandardMaterial color="#FDFBF7" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 2.05, -0.05]} rotation={[0.5, 0, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      <pointLight ref={left} position={[-1.4, 2.2, 0.6]} color="#6D28D9" intensity={0.4} distance={8} />
      <pointLight ref={right} position={[1.4, 2.2, 0.6]} color="#22D3EE" intensity={0.4} distance={8} />
    </group>
  );
}

function DjBooth() {
  return (
    <group position={[-10.2, 0, 5.4]} rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.4, 1.2, 1.1]} />
        <meshStandardMaterial color="#1a1028" />
      </mesh>
      <mesh position={[0, 1.36, 0.2]}>
        <boxGeometry args={[1.6, 0.12, 0.7]} />
        <meshStandardMaterial color="#0A0A0A" emissive="#6D28D9" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-1.5, 0.9, 0.1]}>
        <boxGeometry args={[0.7, 1.6, 0.7]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[1.5, 0.9, 0.1]}>
        <boxGeometry args={[0.7, 1.6, 0.7]} />
        <meshStandardMaterial color="#111" />
      </mesh>
    </group>
  );
}

function FootballPitch() {
  return (
    <group position={[0, 0, 20.5]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color="#2f6b32" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[0.12, 10]} />
        <meshBasicMaterial color="#FDFBF7" />
      </mesh>
      <mesh position={[0, 0.7, -5.1]}>
        <boxGeometry args={[3.2, 1.4, 0.12]} />
        <meshStandardMaterial color="#FDFBF7" />
      </mesh>
      <mesh position={[0, 0.7, 5.1]}>
        <boxGeometry args={[3.2, 1.4, 0.12]} />
        <meshStandardMaterial color="#FDFBF7" />
      </mesh>
    </group>
  );
}

function Stars() {
  const positions = useMemo(() => {
    const arr = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i += 1) {
      const radius = 36 + Math.random() * 28;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.42;
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = 10 + radius * Math.cos(phi);
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#FDFBF7" size={0.11} sizeAttenuation />
    </points>
  );
}

function Moon() {
  return (
    <mesh position={[-12, 16, -10]}>
      <sphereGeometry args={[1.4, 16, 16]} />
      <meshStandardMaterial color="#FDFBF7" emissive="#FDFBF7" emissiveIntensity={0.7} />
    </mesh>
  );
}

function Campers() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime * 0.18;
    group.current.children.forEach((child, i) => {
      const angle = t + (i / group.current!.children.length) * Math.PI * 2;
      child.position.set(Math.cos(angle) * 4.6, 0.55, Math.sin(angle) * 4.6);
      child.rotation.y = -angle + Math.PI / 2;
    });
  });
  const colors = ["#6D28D9", "#BEF264", "#FB7185", "#22D3EE", "#FDFBF7", "#FB7185"];
  return (
    <group ref={group}>
      {colors.map((color, i) => (
        <mesh key={i} castShadow>
          <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export default function CampScene({ progress }: { progress: ProgressRef }) {
  return (
    <>
      <Atmosphere progress={progress} />
      <CameraRig progress={progress} />
      <hemisphereLight args={["#9bb7ff", "#1a120c", 0.45]} />
      <directionalLight position={[-12, 18, -8]} intensity={0.55} color="#e8e4ff" />
      <ambientLight intensity={0.16} />
      <Ground />
      <Forest />
      <TentRing />
      <Bonfire progress={progress} />
      <MovieScreen progress={progress} />
      <KaraokeStage progress={progress} />
      <DjBooth />
      <FootballPitch />
      <Stars />
      <Moon />
      <Campers />
    </>
  );
}
