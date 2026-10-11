"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { sampleCamp, sampleDaylight, type Vec3 } from "@/data/campWorld";
import CampPeople from "./CampPeople";
import { DJ_BOOTH, PITCH, STAGE, TENTS, treeAllowed } from "@/data/campLayout";
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 8.4]} receiveShadow>
        <planeGeometry args={[3.2, 15]} />
        <meshStandardMaterial color="#3a2a18" roughness={1} />
      </mesh>
    </group>
  );
}

const TREE_SPOTS = (() => {
  const spots: { x: number; z: number; ry: number; s: number }[] = [];
  const count = 70;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 21 + (i % 5) * 1.4 + ((i * 7) % 3) * 0.4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (treeAllowed(x, z)) spots.push({ x, z, ry: angle, s: 0.8 + (i % 4) * 0.22 });
  }
  return spots;
})();

function Forest() {
  const foliage = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    TREE_SPOTS.forEach((t, i) => {
      dummy.position.set(t.x, 0, t.z);
      dummy.rotation.set(0, t.ry, 0);
      dummy.scale.setScalar(t.s);
      dummy.updateMatrix();
      foliage.current?.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(0.35, 1, 0.35);
      dummy.updateMatrix();
      trunks.current?.setMatrixAt(i, dummy.matrix);
    });
    if (foliage.current) foliage.current.instanceMatrix.needsUpdate = true;
    if (trunks.current) trunks.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <group>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_SPOTS.length]} frustumCulled={false}>
        <cylinderGeometry args={[0.18, 0.28, 1.4, 5]} />
        <meshStandardMaterial color="#3b2414" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={foliage} args={[undefined, undefined, TREE_SPOTS.length]} position={[0, 2.1, 0]} frustumCulled={false}>
        <coneGeometry args={[1.15, 4.1, 6]} />
        <meshStandardMaterial color="#0f2a18" roughness={0.85} />
      </instancedMesh>
    </group>
  );
}

/** 50 tents in staggered rings, doors facing the fire. */
function Tents() {
  const shells = useRef<THREE.InstancedMesh>(null);
  const doors = useRef<THREE.InstancedMesh>(null);
  const sheets = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const root = new THREE.Object3D();
    const shell = new THREE.Object3D();
    shell.position.set(0, 0.9, 0);
    shell.rotation.set(0, Math.PI / 4, 0);
    const door = new THREE.Object3D();
    door.position.set(0, 0.42, 0.66);
    door.rotation.set(-0.5, 0, 0);
    root.add(shell, door);
    const color = new THREE.Color();
    TENTS.forEach((tent, i) => {
      root.position.set(tent.x, 0, tent.z);
      root.rotation.set(0, tent.ry, 0);
      root.scale.setScalar(tent.scale);
      root.updateMatrixWorld(true);
      shells.current?.setMatrixAt(i, shell.matrixWorld);
      shells.current?.setColorAt(i, color.set(tent.color));
      doors.current?.setMatrixAt(i, door.matrixWorld);
      sheets.current?.setMatrixAt(i, root.matrixWorld);
    });
    for (const m of [shells.current, doors.current, sheets.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }, []);

  return (
    <group>
      <instancedMesh ref={shells} args={[undefined, undefined, TENTS.length]} frustumCulled={false}>
        <coneGeometry args={[1.4, 1.8, 4]} />
        <meshStandardMaterial roughness={0.62} metalness={0.04} flatShading />
      </instancedMesh>
      <instancedMesh ref={doors} args={[undefined, undefined, TENTS.length]} frustumCulled={false}>
        <planeGeometry args={[0.6, 0.78]} />
        <meshStandardMaterial color="#1a120c" side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={sheets} args={[undefined, undefined, TENTS.length]} frustumCulled={false}>
        <boxGeometry args={[2.2, 0.02, 2.4]} />
        <meshStandardMaterial color="#2b2a24" roughness={1} />
      </instancedMesh>
    </group>
  );
}

function makeGlowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,200,120,1)");
  grad.addColorStop(0.35, "rgba(255,120,40,0.55)");
  grad.addColorStop(1, "rgba(255,60,10,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const FLAMES = [
  // outer tongues
  { x: 0.2, z: 0.05, r: 0.34, h: 1.25, color: "#ff3d14", speed: 9, phase: 0 },
  { x: -0.18, z: 0.12, r: 0.32, h: 1.15, color: "#ff3d14", speed: 10, phase: 1.3 },
  { x: 0.02, z: -0.2, r: 0.33, h: 1.2, color: "#ff4a18", speed: 8.5, phase: 2.1 },
  { x: -0.06, z: 0.22, r: 0.3, h: 1.05, color: "#ff4a18", speed: 11, phase: 3.4 },
  // body
  { x: 0.1, z: -0.04, r: 0.3, h: 1.55, color: "#ff7a1a", speed: 12, phase: 0.7 },
  { x: -0.1, z: 0.04, r: 0.28, h: 1.45, color: "#ff8c1f", speed: 13, phase: 2.6 },
  { x: 0.0, z: 0.1, r: 0.26, h: 1.35, color: "#ff9a24", speed: 10.5, phase: 4.2 },
  // heart
  { x: 0.03, z: 0.0, r: 0.2, h: 1.2, color: "#ffc93c", speed: 14, phase: 1.9 },
  { x: -0.02, z: 0.02, r: 0.11, h: 0.85, color: "#fff1b3", speed: 16, phase: 3.1 },
];

const SPARK_COUNT = 110;

function Bonfire({ progress }: { progress: ProgressRef }) {
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const embers = useRef<THREE.MeshBasicMaterial>(null);
  const glow = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.PointLight>(null);
  const sparks = useRef<THREE.Points>(null);
  const glowTexture = useMemo(makeGlowTexture, []);
  const sparkPositions = useMemo(() => new Float32Array(SPARK_COUNT * 3), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, (_, i) => ({
        a: (i * 2.39996) % (Math.PI * 2),
        s: 0.35 + ((i * 37) % 100) / 100,
        h: 1.4 + ((i * 53) % 100) / 40,
        drift: 0.2 + ((i * 17) % 100) / 180,
      })),
    [],
  );
  const flameMaterials = useMemo(
    () =>
      FLAMES.map(
        (f) =>
          new THREE.MeshBasicMaterial({
            color: f.color,
            transparent: true,
            opacity: 0.68,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const fire = sampleCamp(progress.current).fire;
    const size = 0.55 + fire * 0.75;
    const flicker = 0.85 + Math.sin(t * 11) * 0.08 + Math.sin(t * 17.3) * 0.05 + Math.sin(t * 29.1) * 0.03;

    FLAMES.forEach((f, i) => {
      const m = flames.current[i];
      if (!m) return;
      const lick = 0.78 + Math.sin(t * f.speed + f.phase) * 0.14 + Math.sin(t * f.speed * 1.9 + f.phase * 2) * 0.08;
      m.scale.set(size * (0.9 + Math.sin(t * 7 + f.phase) * 0.08), size * lick, size * (0.9 + Math.cos(t * 6 + f.phase) * 0.08));
      m.position.set(f.x * size, (f.h * size * lick) / 2 + 0.12, f.z * size);
      m.rotation.set(Math.sin(t * 3.1 + f.phase) * 0.12, t * 0.6 + f.phase, Math.cos(t * 2.7 + f.phase) * 0.12);
    });

    if (embers.current) embers.current.color.setRGB(1, 0.32 + flicker * 0.12, 0.08);
    if (glow.current) {
      const s = 2.6 + fire * 3.2 * flicker;
      glow.current.scale.set(s, s * 1.15, 1);
      glow.current.material.opacity = 0.25 + fire * 0.55;
    }
    if (light.current) {
      light.current.intensity = 1.4 + fire * 4.4 * flicker;
      light.current.distance = 18 + fire * 12;
      light.current.position.x = Math.sin(t * 13) * 0.08;
    }
    if (fill.current) fill.current.intensity = 0.5 + fire * 1.6 * (1.7 - flicker);

    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const seed = seeds[i];
      const rise = (t * seed.s * 0.6 + i * 0.037) % 1;
      const swirl = seed.a + t * 0.5 + rise * 3;
      sparkPositions[i * 3] = Math.cos(swirl) * (0.1 + rise * seed.drift * 2.2);
      sparkPositions[i * 3 + 1] = 0.4 + rise * seed.h * (0.6 + fire);
      sparkPositions[i * 3 + 2] = Math.sin(swirl) * (0.1 + rise * seed.drift * 2.2);
    }
    const attr = sparks.current?.geometry.getAttribute("position");
    if (attr) attr.needsUpdate = true;
  });

  return (
    <group>
      {/* stone ring */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.95, 0.09, Math.sin(a) * 0.95]} rotation={[i, i * 2, 0]} scale={[1, 0.7, 1]}>
            <dodecahedronGeometry args={[0.16 + (i % 3) * 0.02, 0]} />
            <meshStandardMaterial color="#55504a" roughness={1} flatShading />
          </mesh>
        );
      })}
      {/* teepee of logs */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.32, 0.42, Math.sin(a) * 0.32]} rotation={[Math.sin(a) * -0.55, 0, Math.cos(a) * 0.55]}>
            <cylinderGeometry args={[0.055, 0.075, 1.0, 6]} />
            <meshStandardMaterial color={i % 2 ? "#3a2210" : "#4a2c16"} roughness={1} flatShading />
          </mesh>
        );
      })}
      {/* ember bed */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.72, 18]} />
        <meshBasicMaterial ref={embers} color="#ff4a12" toneMapped={false} />
      </mesh>
      {FLAMES.map((f, i) => (
        <mesh
          key={i}
          ref={(m) => {
            flames.current[i] = m;
          }}
          material={flameMaterials[i]}
        >
          <coneGeometry args={[f.r, f.h, 7, 1, true]} />
        </mesh>
      ))}
      <sprite ref={glow} position={[0, 0.9, 0]}>
        <spriteMaterial map={glowTexture} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <points ref={sparks}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#ffb347" size={0.07} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
      <pointLight ref={light} position={[0, 1.3, 0]} color="#ff7a2a" intensity={3} distance={24} />
      <pointLight ref={fill} position={[0, 0.5, 0]} color="#ff4a12" intensity={1} distance={8} />
    </group>
  );
}

function makeAdStrip() {
  const c = document.createElement("canvas");
  c.width = 2048;
  c.height = 176;
  const g = c.getContext("2d")!;
  g.fillStyle = "#6D28D9";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#BEF264";
  g.fillRect(0, 0, 18, c.height);
  const font = "system-ui, -apple-system, Helvetica, Arial, sans-serif";
  g.textBaseline = "middle";
  g.fillStyle = "#FDFBF7";
  g.font = `900 60px ${font}`;
  g.fillText("THE BOOST NATION", 60, 92);
  const titleEnd = 60 + g.measureText("THE BOOST NATION").width;
  g.font = `900 48px ${font}`;
  const url = "theboostnation.space";
  const urlStart = c.width - 50 - g.measureText(url).width;
  g.fillStyle = "#BEF264";
  g.fillText(url, urlStart, 92);
  g.fillStyle = "#FDFBF7";
  g.font = `600 46px ${font}`;
  const line = "Idea → live page in 48–72 hours";
  const gap = urlStart - titleEnd;
  g.fillText(line, titleEnd + (gap - g.measureText(line).width) / 2, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** The camp screen plays a TBN ad between films: the live site, slowly zooming. */
function MovieScreen({ progress }: { progress: ProgressRef }) {
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const site = useMemo(() => {
    const tex = new THREE.TextureLoader().load("/ads/tbn-site.jpg");
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
  const strip = useMemo(makeAdStrip, []);

  useFrame(({ clock }) => {
    const t = progress.current;
    const showtime = smoothstep(0.32, 0.4, t) * (1 - smoothstep(0.46, 0.54, t));
    const { day } = sampleDaylight(t);
    if (screen.current) {
      const b = 0.62 + showtime * 0.38 - day * 0.1;
      screen.current.color.setRGB(b, b, b);
    }
    // Ken Burns: wide shot → push in on the headline → drift to the offer → back out.
    const cycle = (clock.elapsedTime % 26) / 26;
    const push = 0.5 - 0.5 * Math.cos(cycle * Math.PI * 2);
    const zoom = 1 + push * 0.55;
    const cu = 0.36 + Math.sin(cycle * Math.PI * 2) * 0.08 * push;
    const cv = 0.6 - push * 0.08;
    site.repeat.set(1 / zoom, 1 / zoom);
    site.offset.set(
      Math.min(1 - 1 / zoom, Math.max(0, cu - 0.5 / zoom)),
      Math.min(1 - 1 / zoom, Math.max(0, cv - 0.5 / zoom)),
    );
  });

  return (
    <group position={[0, 0, -12.4]}>
      {/* frame */}
      <mesh position={[0, 2.75, -0.06]}>
        <boxGeometry args={[6.7, 3.9, 0.14]} />
        <meshStandardMaterial color="#0c0b12" />
      </mesh>
      <mesh position={[0, 2.75, 0.02]}>
        <planeGeometry args={[6.4, 3.6]} />
        <meshBasicMaterial ref={screen} map={site} toneMapped={false} />
      </mesh>
      {/* ad strip under the screen */}
      <mesh position={[0, 0.58, 0.02]}>
        <planeGeometry args={[6.4, 0.55]} />
        <meshBasicMaterial map={strip} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.58, -0.04]}>
        <boxGeometry args={[6.5, 0.62, 0.08]} />
        <meshStandardMaterial color="#0c0b12" />
      </mesh>
      {[-3.15, 3.15].map((x) => (
        <mesh key={x} position={[x, 2.3, -0.12]}>
          <boxGeometry args={[0.16, 4.6, 0.16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
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
    <group position={[STAGE.x, 0, STAGE.z]} rotation={[0, STAGE.ry, 0]}>
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
    </group>
  );
}

function DjBooth() {
  return (
    <group position={[DJ_BOOTH.x, 0, DJ_BOOTH.z]} rotation={[0, DJ_BOOTH.ry, 0]}>
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
    </group>
  );
}

const LINE = "#FDFBF7";

/** A flat painted line on the pitch, pitch-local metres. */
function PitchLine({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color={LINE} />
    </mesh>
  );
}

function Goal({ side }: { side: 1 | -1 }) {
  const x = side * (PITCH.length / 2);
  const depth = 0.8 * side;
  const post = <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />;
  const white = <meshStandardMaterial color="#FDFBF7" roughness={0.4} />;
  const net = <meshBasicMaterial color="#e8e8e8" wireframe transparent opacity={0.55} side={THREE.DoubleSide} />;
  return (
    <group>
      {[-1.5, 1.5].map((z) => (
        <mesh key={z} position={[x, 0.6, z]}>
          {post}
          {white}
        </mesh>
      ))}
      <mesh position={[x, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 3.1, 8]} />
        {white}
      </mesh>
      {/* net: back, roof, sides */}
      <mesh position={[x + depth, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3, 1.2, 15, 6]} />
        {net}
      </mesh>
      <mesh position={[x + depth / 2, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.8, 3, 4, 15]} />
        {net}
      </mesh>
      {[-1.5, 1.5].map((z) => (
        <mesh key={z} position={[x + depth / 2, 0.6, z]}>
          <planeGeometry args={[0.8, 1.2, 4, 6]} />
          {net}
        </mesh>
      ))}
    </group>
  );
}

function FootballPitch() {
  const L = PITCH.length;
  const W = PITCH.width;
  const lw = 0.08;
  const stripes = 8;
  return (
    <group position={[PITCH.x, 0, PITCH.z]}>
      {/* apron and mown stripes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[L + 2.4, W + 2.4]} />
        <meshStandardMaterial color="#2e5e2a" roughness={0.95} />
      </mesh>
      {Array.from({ length: stripes }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-L / 2 + (i + 0.5) * (L / stripes), 0.02, 0]} receiveShadow>
          <planeGeometry args={[L / stripes, W]} />
          <meshStandardMaterial color={i % 2 ? "#3f8a3c" : "#357a33"} roughness={0.9} />
        </mesh>
      ))}
      {/* touchlines, goal lines, halfway */}
      <PitchLine x={0} z={-W / 2} w={L} d={lw} />
      <PitchLine x={0} z={W / 2} w={L} d={lw} />
      <PitchLine x={-L / 2} z={0} w={lw} d={W} />
      <PitchLine x={L / 2} z={0} w={lw} d={W} />
      <PitchLine x={0} z={0} w={lw} d={W} />
      {/* centre circle and spot */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[1.42, 1.5, 48]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color={LINE} />
      </mesh>
      {/* penalty areas, goal areas and spots */}
      {([-1, 1] as const).map((side) => {
        const gx = (side * L) / 2;
        return (
          <group key={side}>
            <PitchLine x={gx - side * 2.4} z={0} w={lw} d={5.2} />
            <PitchLine x={gx - side * 1.2} z={-2.6} w={2.4} d={lw} />
            <PitchLine x={gx - side * 1.2} z={2.6} w={2.4} d={lw} />
            <PitchLine x={gx - side * 0.9} z={0} w={lw} d={3.6} />
            <PitchLine x={gx - side * 0.45} z={-1.8} w={0.9} d={lw} />
            <PitchLine x={gx - side * 0.45} z={1.8} w={0.9} d={lw} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[gx - side * 1.9, 0.03, 0]}>
              <circleGeometry args={[0.08, 12]} />
              <meshBasicMaterial color={LINE} />
            </mesh>
            <Goal side={side} />
          </group>
        );
      })}
      {/* corner flags */}
      {[
        [-L / 2, -W / 2],
        [L / 2, -W / 2],
        [-L / 2, W / 2],
        [L / 2, W / 2],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
            <meshStandardMaterial color="#FDFBF7" />
          </mesh>
          <mesh position={[0.14, 0.88, 0]}>
            <planeGeometry args={[0.28, 0.2]} />
            <meshStandardMaterial color={i % 2 ? "#BEF264" : "#FB7185"} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
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
      <Tents />
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
