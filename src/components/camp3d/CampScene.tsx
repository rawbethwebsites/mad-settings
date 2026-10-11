"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sampleCamp, sampleDaylight, TENT_COLORS, type Vec3 } from "@/data/campWorld";
import CampPeople, { Dj, Footballers, KaraokeCrowd } from "./CampPeople";
import { TalkDirector } from "./CampTalk";

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
    const { day } = sampleDaylight(progress.current);
    fog.density = (0.016 + (1 - sample.fire) * 0.012) * (1 - day * 0.55);
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

const GRASS_NIGHT = new THREE.Color("#142414");
const GRASS_DAY = new THREE.Color("#4f7a3a");

function Ground({ progress }: { progress: ProgressRef }) {
  const grass = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    grass.current?.color.copy(GRASS_NIGHT).lerp(GRASS_DAY, sampleDaylight(progress.current).day);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[48, 48]} />
        <meshStandardMaterial ref={grass} color="#142414" roughness={0.95} />
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
      <mesh position={[0, 0.84, -0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#FDFBF7" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.48, -0.12]} rotation={[0.5, 0, 0]}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      <pointLight ref={left} position={[-1.4, 2.2, 0.6]} color="#6D28D9" intensity={0.4} distance={8} />
      <pointLight ref={right} position={[1.4, 2.2, 0.6]} color="#22D3EE" intensity={0.4} distance={8} />
      <KaraokeCrowd />
    </group>
  );
}

function DjBooth() {
  return (
    <group position={[-10.2, 0, 5.4]} rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[2.4, 0.92, 1.1]} />
        <meshStandardMaterial color="#1a1028" />
      </mesh>
      <mesh position={[0, 0.98, 0.1]}>
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
      <Dj />
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
      <Footballers />
    </group>
  );
}

function Stars({ progress }: { progress: ProgressRef }) {
  const material = useRef<THREE.PointsMaterial>(null);
  useFrame(() => {
    if (material.current) material.current.opacity = 1 - Math.min(1, sampleDaylight(progress.current).day * 1.6);
  });
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
      <pointsMaterial ref={material} color="#FDFBF7" size={0.11} sizeAttenuation transparent depthWrite={false} />
    </points>
  );
}

function Moon({ progress }: { progress: ProgressRef }) {
  const moon = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!moon.current) return;
    const night = 1 - sampleDaylight(progress.current).day;
    moon.current.visible = night > 0.05;
    (moon.current.material as THREE.MeshStandardMaterial).opacity = night;
  });
  return (
    <mesh ref={moon} position={[-12, 16, -10]}>
      <sphereGeometry args={[1.4, 16, 16]} />
      <meshStandardMaterial color="#FDFBF7" emissive="#FDFBF7" emissiveIntensity={0.7} transparent />
    </mesh>
  );
}

const SUN_WARM = new THREE.Color("#ff8a4c");
const SUN_WHITE = new THREE.Color("#fff6e0");

/** Sets behind the movie screen in the evening, rises over the pitch in the morning. */
function Sun({ progress }: { progress: ProgressRef }) {
  const sun = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const t = progress.current;
    const { sun: height, glow } = sampleDaylight(t);
    const evening = t < 0.5;
    const x = evening ? -14 : 18;
    const z = evening ? -46 : 52;
    const y = -3 + height * 24;
    const color = SUN_WHITE.clone().lerp(SUN_WARM, Math.max(glow, 1 - Math.min(1, height * 2)));
    for (const m of [sun.current, halo.current]) {
      if (!m) continue;
      m.position.set(x, y, z);
      m.visible = height > -0.2;
      (m.material as THREE.MeshBasicMaterial).color.copy(color);
    }
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.18 + glow * 0.25;
  });
  return (
    <group>
      <mesh ref={sun}>
        <sphereGeometry args={[2.4, 20, 16]} />
        <meshBasicMaterial color="#fff6e0" fog={false} toneMapped={false} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[4.6, 20, 16]} />
        <meshBasicMaterial color="#ffb37a" fog={false} transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

const SUNLIGHT_DAY = new THREE.Color("#fff3df");
const SUNLIGHT_GOLD = new THREE.Color("#ff9a5a");
const HEMI_NIGHT = new THREE.Color("#9bb7ff");
const HEMI_DAY = new THREE.Color("#cfe6ff");

function SkyLights({ progress }: { progress: ProgressRef }) {
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const moonLight = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);
  useFrame(() => {
    const t = progress.current;
    const { day, glow, sun } = sampleDaylight(t);
    const evening = t < 0.5;
    if (sunLight.current) {
      sunLight.current.position.set(evening ? -14 : 18, Math.max(0.5, sun * 24), evening ? -46 : 52);
      sunLight.current.intensity = day * 1.9;
      sunLight.current.color.copy(SUNLIGHT_DAY).lerp(SUNLIGHT_GOLD, glow);
    }
    if (moonLight.current) moonLight.current.intensity = 0.55 * (1 - day);
    if (hemi.current) {
      hemi.current.intensity = 0.45 + day * 0.85;
      hemi.current.color.copy(HEMI_NIGHT).lerp(HEMI_DAY, day);
    }
    if (ambient.current) ambient.current.intensity = 0.16 + day * 0.25;
  });
  return (
    <>
      <hemisphereLight ref={hemi} args={["#9bb7ff", "#1a120c", 0.45]} />
      <directionalLight ref={moonLight} position={[-12, 18, -8]} intensity={0.55} color="#e8e4ff" />
      <directionalLight ref={sunLight} position={[-14, 20, -46]} intensity={0} color="#fff3df" />
      <ambientLight ref={ambient} intensity={0.16} />
    </>
  );
}

const CLOUD_PUFF = new THREE.IcosahedronGeometry(1, 1);
const CLOUD_MAT = new THREE.MeshStandardMaterial({ color: "#3a3157", emissive: "#1b1430", roughness: 1, flatShading: true });
const CLOUD_NIGHT = new THREE.Color("#4a3f6e");
const CLOUD_DAWN = new THREE.Color("#ffd6e4");
const CLOUD_DAY = new THREE.Color("#ffffff");
const GLOW_NIGHT = new THREE.Color("#2a2147");
const GLOW_DAY = new THREE.Color("#a99fb0");

function buildClouds() {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 13 }, (_, i) => {
    const angle = (i / 13) * Math.PI * 2 + rand() * 0.3;
    const radius = 23 + rand() * 11;
    const puffs = Array.from({ length: 4 + Math.floor(rand() * 3) }, (_, j) => {
      const big = j === 0 ? 1.35 : 0.75 + rand() * 0.55;
      return {
        pos: [(j - 2) * 1.25 + rand() * 0.6, rand() * 0.5 + (j === 0 ? 0.4 : 0), (rand() - 0.5) * 1.2] as Vec3,
        scale: [big * 1.5, big * 0.95, big * 1.15] as Vec3,
      };
    });
    return {
      pos: [Math.cos(angle) * radius, 7 + rand() * 4.5, Math.sin(angle) * radius] as Vec3,
      rot: -angle + Math.PI / 2,
      size: 1.5 + rand() * 1.1,
      bob: rand() * Math.PI * 2,
      puffs,
    };
  });
}

const CLOUDS = buildClouds();

/** Low-poly clouds drifting over the treeline: white by day, pink at sunset and sunrise, moonlit at night. */
function Clouds({ progress }: { progress: ProgressRef }) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    const { day, glow } = sampleDaylight(progress.current);
    CLOUD_MAT.color.copy(CLOUD_NIGHT).lerp(CLOUD_DAY, day).lerp(CLOUD_DAWN, glow * 0.8);
    CLOUD_MAT.emissive.copy(GLOW_NIGHT).lerp(GLOW_DAY, Math.max(day * 0.5, glow));
    if (!group.current) return;
    group.current.rotation.y += delta * 0.006;
    group.current.children.forEach((cloud, i) => {
      cloud.position.y = CLOUDS[i].pos[1] + Math.sin(clock.elapsedTime * 0.15 + CLOUDS[i].bob) * 0.35;
    });
  });

  return (
    <group ref={group}>
      {CLOUDS.map((c, i) => (
        <group key={i} position={c.pos} rotation={[0, c.rot, 0]} scale={c.size}>
          {c.puffs.map((p, j) => (
            <mesh key={j} geometry={CLOUD_PUFF} material={CLOUD_MAT} position={p.pos} scale={p.scale} />
          ))}
        </group>
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
      <SkyLights progress={progress} />
      <Ground progress={progress} />
      <Forest />
      <TentRing />
      <Bonfire progress={progress} />
      <MovieScreen progress={progress} />
      <KaraokeStage progress={progress} />
      <DjBooth />
      <FootballPitch />
      <Stars progress={progress} />
      <Moon progress={progress} />
      <Sun progress={progress} />
      <Clouds progress={progress} />
      <CampPeople />
      <TalkDirector />
    </>
  );
}
