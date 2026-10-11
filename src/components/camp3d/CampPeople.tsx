"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Vec3 } from "@/data/campWorld";
import { registerTalker } from "./CampTalk";

/**
 * Low-poly campers. Built in real-world metres (≈1.8m tall) and scaled down to
 * match the campsite. Every person faces +z in local space.
 */

const PERSON_SCALE = 0.8;

type Pose = "walk" | "run" | "sit" | "ground" | "dance" | "sing" | "dj";
type Hair = "short" | "afro" | "cap" | "bun" | "bald";

type Look = {
  skin: string;
  shirt: string;
  pants: string;
  hair: Hair;
  hairColor?: string;
  build?: number;
};

type PathFn = (t: number) => { x: number; z: number; ry: number };

const SKIN = ["#4a2c1c", "#5c3722", "#6e4129", "#7d4c30", "#8f5a3a", "#3f2618", "#a46b45"];
const SHOE = "#111015";

// Shared geometry: one allocation for every camper on the page.
const GEO = {
  thigh: new THREE.CylinderGeometry(0.078, 0.064, 0.45, 6),
  shin: new THREE.CylinderGeometry(0.062, 0.05, 0.42, 6),
  shoe: new THREE.BoxGeometry(0.11, 0.07, 0.24),
  hips: new THREE.BoxGeometry(0.32, 0.16, 0.2),
  chest: new THREE.CylinderGeometry(0.2, 0.16, 0.5, 6),
  neck: new THREE.CylinderGeometry(0.05, 0.056, 0.1, 6),
  head: new THREE.IcosahedronGeometry(0.12, 1),
  upperArm: new THREE.CylinderGeometry(0.056, 0.048, 0.28, 6),
  forearm: new THREE.CylinderGeometry(0.046, 0.04, 0.26, 6),
  hand: new THREE.IcosahedronGeometry(0.046, 0),
  hairShort: new THREE.SphereGeometry(0.128, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.52),
  afro: new THREE.IcosahedronGeometry(0.17, 1),
  brim: new THREE.BoxGeometry(0.2, 0.024, 0.13),
  bun: new THREE.IcosahedronGeometry(0.06, 0),
  mic: new THREE.CylinderGeometry(0.02, 0.014, 0.16, 6),
  micHead: new THREE.IcosahedronGeometry(0.032, 0),
  log: new THREE.CylinderGeometry(0.17, 0.19, 1.5, 7),
  ball: new THREE.IcosahedronGeometry(0.11, 1),
};

const MATERIALS = new Map<string, THREE.MeshStandardMaterial>();
function mat(color: string, roughness = 0.78) {
  const key = `${color}:${roughness}`;
  let m = MATERIALS.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
    MATERIALS.set(key, m);
  }
  return m;
}

type Rig = {
  root: THREE.Group | null;
  body: THREE.Group | null;
  torso: THREE.Group | null;
  head: THREE.Group | null;
  hip: (THREE.Group | null)[];
  knee: (THREE.Group | null)[];
  shoulder: (THREE.Group | null)[];
  elbow: (THREE.Group | null)[];
};

const SIDES = [-1, 1] as const;

function Person({
  position = [0, 0, 0],
  rotation = 0,
  look,
  pose,
  phase = 0,
  path,
  mic = false,
}: {
  position?: Vec3;
  rotation?: number;
  look: Look;
  pose: Pose;
  phase?: number;
  path?: PathFn;
  mic?: boolean;
}) {
  const rig = useRef<Rig>({ root: null, body: null, torso: null, head: null, hip: [], knee: [], shoulder: [], elbow: [] });
  const build = look.build ?? 1;
  const shirt = mat(look.shirt, 0.7);
  const pants = mat(look.pants);
  const skin = mat(look.skin, 0.6);
  const hair = mat(look.hairColor ?? "#120c08", 0.95);
  const shoe = mat(SHOE);
  const talkId = useId();

  useEffect(() => {
    const { root, head } = rig.current;
    if (!root || !head) return;
    return registerTalker(talkId, { root, head });
  }, [talkId]);

  useFrame(({ clock }) => {
    const r = rig.current;
    if (!r.body || !r.torso || !r.head) return;
    const t = clock.elapsedTime + phase;

    if (path && r.root) {
      const p = path(clock.elapsedTime);
      r.root.position.set(p.x, 0, p.z);
      r.root.rotation.y = p.ry;
    }

    // Reset to a relaxed stand, then layer the pose on top.
    let bodyY = 0;
    let lean = 0;
    let sway = 0;
    let headX = 0;
    let headY = 0;
    const hip = [0, 0];
    const knee = [0, 0];
    const sx = [0.1, 0.1];
    const sz = [0, 0];
    const el = [-0.15, -0.15];

    switch (pose) {
      case "walk":
      case "run": {
        const run = pose === "run";
        const w = t * (run ? 10.5 : 6.2);
        const s = Math.sin(w);
        const amp = run ? 0.85 : 0.45;
        hip[0] = s * amp;
        hip[1] = -s * amp;
        knee[0] = Math.max(0, -Math.cos(w)) * (run ? 1.5 : 0.75);
        knee[1] = Math.max(0, Math.cos(w)) * (run ? 1.5 : 0.75);
        sx[0] = -s * (run ? 0.9 : 0.4);
        sx[1] = s * (run ? 0.9 : 0.4);
        el[0] = el[1] = run ? -1.4 : -0.3;
        bodyY = Math.abs(Math.cos(w)) * (run ? 0.07 : 0.03) - (run ? 0.04 : 0);
        lean = run ? 0.22 : 0.04;
        headY = run ? 0 : Math.sin(t * 0.4) * 0.35; // glancing at a friend
        break;
      }
      case "sit": {
        bodyY = -0.45;
        hip[0] = hip[1] = -1.5;
        knee[0] = knee[1] = 1.5;
        lean = 0.18;
        sx[0] = sx[1] = -0.55;
        el[0] = el[1] = -0.65;
        // Every few seconds someone starts talking with their hands.
        const talk = Math.max(0, Math.sin(t * 0.35)) ** 3;
        sx[1] = -0.55 - talk * (0.6 + Math.sin(t * 5) * 0.25);
        el[1] = -0.65 - talk * 0.9;
        headY = Math.sin(t * 0.27) * 0.55;
        headX = Math.sin(t * 1.3) * 0.04 - talk * 0.1;
        sway = Math.sin(t * 0.5) * 0.03;
        break;
      }
      case "ground": {
        bodyY = -0.66;
        hip[0] = hip[1] = -1.9;
        knee[0] = knee[1] = 2.5;
        lean = -0.05;
        sx[0] = sx[1] = -1.0;
        sz[0] = -0.12;
        sz[1] = 0.12;
        el[0] = el[1] = -0.9;
        headX = -0.12 + Math.sin(t * 0.6) * 0.03;
        headY = Math.sin(t * 0.2) * 0.12;
        break;
      }
      case "dance": {
        const w = t * 7.6;
        const b = Math.abs(Math.sin(w));
        bodyY = -b * 0.07;
        hip[0] = hip[1] = -b * 0.25;
        knee[0] = knee[1] = b * 0.5;
        const handsUp = Math.max(0, Math.sin(t * 0.6)) > 0.35;
        sx[0] = handsUp ? -2.7 + Math.sin(w) * 0.2 : -0.6 + Math.sin(w) * 0.35;
        sx[1] = handsUp ? -2.7 - Math.sin(w) * 0.2 : -0.6 - Math.sin(w) * 0.35;
        sz[0] = handsUp ? -0.25 : -0.15;
        sz[1] = handsUp ? 0.25 : 0.15;
        el[0] = el[1] = handsUp ? -0.2 : -1.2;
        sway = Math.sin(w / 2) * 0.12;
        headX = b * 0.15;
        break;
      }
      case "sing": {
        const w = t * 3.2;
        bodyY = -Math.abs(Math.sin(w)) * 0.03;
        knee[0] = knee[1] = Math.abs(Math.sin(w)) * 0.12;
        // right hand holds the mic up to the mouth
        sx[1] = -1.2;
        sz[1] = -0.28;
        el[1] = -1.95;
        // left arm reaches out to the crowd
        sx[0] = -1.1 + Math.sin(t * 1.1) * 0.5;
        sz[0] = -0.7 - Math.sin(t * 0.8) * 0.3;
        el[0] = -0.3;
        sway = Math.sin(w / 2) * 0.08;
        lean = -0.08 + Math.sin(t * 0.7) * 0.06;
        headX = -0.12;
        break;
      }
      case "dj": {
        const w = t * 2 * Math.PI * 1.05;
        const nod = Math.sin(w);
        headX = 0.1 + nod * 0.14;
        bodyY = -Math.abs(nod) * 0.03;
        knee[0] = knee[1] = Math.abs(nod) * 0.1;
        lean = 0.12;
        sx[0] = -0.75;
        el[0] = -0.75 + Math.sin(t * 3) * 0.1; // riding the fader
        const pump = Math.max(0, Math.sin(t * 0.9)) > 0.55;
        sx[1] = pump ? -2.8 + nod * 0.15 : -0.8;
        el[1] = pump ? -0.25 : -0.7;
        sz[1] = pump ? 0.15 : 0;
        break;
      }
    }

    r.body.position.y = bodyY;
    r.torso.rotation.set(lean, 0, sway);
    r.head.rotation.set(headX, headY, 0);
    for (let i = 0; i < 2; i += 1) {
      r.hip[i]?.rotation.set(hip[i], 0, 0);
      r.knee[i]?.rotation.set(knee[i], 0, 0);
      r.shoulder[i]?.rotation.set(sx[i], 0, sz[i] + SIDES[i] * -0.08);
      r.elbow[i]?.rotation.set(el[i], 0, 0);
    }
  });

  return (
    <group
      ref={(g) => {
        rig.current.root = g;
      }}
      position={position}
      rotation={[0, rotation, 0]}
      scale={PERSON_SCALE}
    >
      <group
        ref={(g) => {
          rig.current.body = g;
        }}
      >
        {SIDES.map((side, i) => (
          <group
            key={`leg${side}`}
            position={[side * 0.1 * build, 0.9, 0]}
            ref={(g) => {
              rig.current.hip[i] = g;
            }}
          >
            <mesh geometry={GEO.thigh} material={pants} position={[0, -0.225, 0]} scale={[build, 1, build]} />
            <group
              position={[0, -0.45, 0]}
              ref={(g) => {
                rig.current.knee[i] = g;
              }}
            >
              <mesh geometry={GEO.shin} material={pants} position={[0, -0.21, 0]} />
              <mesh geometry={GEO.shoe} material={shoe} position={[0, -0.43, 0.05]} />
            </group>
          </group>
        ))}

        <group
          position={[0, 0.9, 0]}
          ref={(g) => {
            rig.current.torso = g;
          }}
        >
          <mesh geometry={GEO.hips} material={pants} position={[0, 0.05, 0]} scale={[build, 1, 1]} />
          <mesh geometry={GEO.chest} material={shirt} position={[0, 0.33, 0]} scale={[build, 1, 0.62]} />
          <mesh geometry={GEO.neck} material={skin} position={[0, 0.62, 0]} />
          <group
            position={[0, 0.66, 0]}
            ref={(g) => {
              rig.current.head = g;
            }}
          >
            <mesh geometry={GEO.head} material={skin} position={[0, 0.11, 0.01]} scale={[0.95, 1.1, 1]} />
            {look.hair !== "bald" && look.hair !== "afro" && (
              <mesh geometry={GEO.hairShort} material={hair} position={[0, 0.13, -0.01]} rotation={[-0.25, 0, 0]} />
            )}
            {look.hair === "afro" && <mesh geometry={GEO.afro} material={hair} position={[0, 0.19, -0.03]} scale={[1, 0.85, 1]} />}
            {look.hair === "cap" && <mesh geometry={GEO.brim} material={hair} position={[0, 0.17, 0.13]} rotation={[-0.15, 0, 0]} />}
            {look.hair === "bun" && <mesh geometry={GEO.bun} material={hair} position={[0, 0.26, -0.08]} />}
          </group>

          {SIDES.map((side, i) => (
            <group
              key={`arm${side}`}
              position={[side * 0.235 * build, 0.52, 0]}
              ref={(g) => {
                rig.current.shoulder[i] = g;
              }}
            >
              <mesh geometry={GEO.upperArm} material={shirt} position={[0, -0.14, 0]} />
              <group
                position={[0, -0.28, 0]}
                ref={(g) => {
                  rig.current.elbow[i] = g;
                }}
              >
                <mesh geometry={GEO.forearm} material={skin} position={[0, -0.13, 0]} />
                <mesh geometry={GEO.hand} material={skin} position={[0, -0.29, 0]} />
                {mic && side === 1 && (
                  <group position={[0, -0.3, 0.02]} rotation={[0.5, 0, 0]}>
                    <mesh geometry={GEO.mic} material={mat("#0A0A0A", 0.4)} position={[0, 0.05, 0]} />
                    <mesh geometry={GEO.micHead} material={mat("#c9c9d1", 0.3)} position={[0, 0.14, 0]} />
                  </group>
                )}
              </group>
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

const pick = <T,>(list: readonly T[], i: number) => list[i % list.length];

/** Friends sitting on logs around the fire, leaving the camera's side open. */
function FireCircle() {
  const logs = [150, 215, 280, 345];
  const looks: Look[] = [
    { skin: SKIN[0], shirt: "#6D28D9", pants: "#1d1d2a", hair: "afro" },
    { skin: SKIN[3], shirt: "#FDFBF7", pants: "#2a3a5a", hair: "bun", build: 0.92 },
    { skin: SKIN[1], shirt: "#BEF264", pants: "#22222e", hair: "cap" },
    { skin: SKIN[5], shirt: "#FB7185", pants: "#1d1d2a", hair: "short", build: 0.94 },
    { skin: SKIN[4], shirt: "#22D3EE", pants: "#3a3226", hair: "short", build: 1.08 },
    { skin: SKIN[2], shirt: "#2b2b3a", pants: "#2a3a5a", hair: "afro", build: 0.92 },
    { skin: SKIN[6], shirt: "#F59E0B", pants: "#1d1d2a", hair: "bald", build: 1.05 },
  ];
  const seats: { a: number; offset: number }[] = [];
  logs.forEach((deg, i) => {
    seats.push({ a: deg, offset: -0.42 });
    if (i !== 2) seats.push({ a: deg, offset: 0.42 });
  });

  return (
    <group>
      {logs.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <mesh
            key={deg}
            geometry={GEO.log}
            material={mat("#4a2c16", 1)}
            position={[Math.cos(a) * 2.75, 0.17, Math.sin(a) * 2.75]}
            rotation={[0, -a, Math.PI / 2]}
          />
        );
      })}
      {seats.map(({ a: deg, offset }, i) => {
        const a = (deg * Math.PI) / 180;
        const r = 2.75;
        // tangent offset along the log, then pull slightly toward the fire
        const x = Math.cos(a) * r - Math.sin(a) * offset + Math.cos(a) * 0.12;
        const z = Math.sin(a) * r + Math.cos(a) * offset + Math.sin(a) * 0.12;
        const face = Math.atan2(-x, -z);
        return <Person key={i} position={[x, 0.02, z]} rotation={face} look={looks[i]} pose="sit" phase={i * 2.3} />;
      })}
    </group>
  );
}

/** Pairs strolling a lap of the camp, between the fire and the tents. */
function Strollers() {
  const walkers: { r: number; start: number; look: Look }[] = [
    { r: 5.2, start: 0, look: { skin: SKIN[2], shirt: "#BEF264", pants: "#22222e", hair: "short" } },
    { r: 5.85, start: 0.02, look: { skin: SKIN[4], shirt: "#6D28D9", pants: "#2a3a5a", hair: "bun", build: 0.92 } },
    { r: 5.5, start: Math.PI, look: { skin: SKIN[0], shirt: "#FDFBF7", pants: "#3a3226", hair: "cap" } },
    { r: 5.5, start: Math.PI + 2.1, look: { skin: SKIN[5], shirt: "#FB7185", pants: "#1d1d2a", hair: "afro", build: 0.95 } },
  ];
  return (
    <group>
      {walkers.map((w, i) => {
        const path: PathFn = (time) => {
          const a = w.start + time * 0.16;
          return { x: Math.cos(a) * w.r, z: Math.sin(a) * w.r, ry: -a };
        };
        return <Person key={i} look={w.look} pose="walk" phase={i * 0.9} path={path} />;
      })}
    </group>
  );
}

/** A row of silhouettes on the grass, hugging their knees in front of the screen. */
function MovieCrowd() {
  const spots: Vec3[] = [
    [-2.1, 0, -7.6],
    [-0.75, 0, -7.9],
    [0.6, 0, -7.7],
    [2.0, 0, -7.95],
    [-1.4, 0, -6.5],
    [1.35, 0, -6.6],
  ];
  return (
    <group>
      {spots.map((p, i) => (
        <Person
          key={i}
          position={p}
          rotation={Math.PI + (p[0] > 0 ? 0.08 : -0.08)}
          look={{ skin: pick(SKIN, i + 2), shirt: pick(["#2b2b3a", "#6D28D9", "#22D3EE", "#FB7185", "#1d1d2a", "#BEF264"], i), pants: "#1d1d2a", hair: pick(["afro", "short", "bun", "cap", "short", "bald"] as const, i) }}
          pose="ground"
          phase={i * 1.7}
        />
      ))}
    </group>
  );
}

/** Lives inside the karaoke stage group so positions are stage-local. */
export function KaraokeCrowd() {
  return (
    <group>
      <Person position={[0.55, 0.24, 0.35]} look={{ skin: SKIN[3], shirt: "#BEF264", pants: "#1d1d2a", hair: "bun", build: 0.92 }} pose="sing" mic />
      <Person position={[-1.15, 0.24, -0.75]} rotation={0.25} look={{ skin: SKIN[5], shirt: "#22D3EE", pants: "#1d1d2a", hair: "afro" }} pose="dance" phase={0.7} />
      <Person position={[1.6, 0.24, -0.95]} rotation={-0.3} look={{ skin: SKIN[2], shirt: "#FB7185", pants: "#2a3a5a", hair: "cap", build: 1.05 }} pose="dance" phase={2.4} />
      {(
        [
          [-2.1, 0, 1.5],
          [-1.15, 0, 2.05],
          [-2.9, 0, 0.35],
          [2.55, 0, 0.9],
        ] as Vec3[]
      ).map((p, i) => (
        <Person
          key={i}
          position={p}
          rotation={Math.atan2(0.55 - p[0], 0.35 - p[2])}
          look={{ skin: pick(SKIN, i + 4), shirt: pick(["#FB7185", "#22D3EE", "#6D28D9", "#FDFBF7"], i), pants: pick(["#2a3a5a", "#1d1d2a"], i), hair: pick(["afro", "cap", "short", "bun"] as const, i) }}
          pose="dance"
          phase={i * 1.3}
        />
      ))}
    </group>
  );
}

/** Lives inside the DJ booth group. */
export function Dj() {
  return <Person position={[0, 0, -0.85]} look={{ skin: SKIN[1], shirt: "#0A0A0A", pants: "#1d1d2a", hair: "cap", hairColor: "#6D28D9", build: 1.06 }} pose="dj" />;
}

/** Morning five-a-side: everyone chasing the same ball. Lives inside the pitch group. */
export function Footballers() {
  const ball = useRef<THREE.Mesh>(null);
  const ballAt = (t: number) => ({ x: Math.sin(t * 0.45) * 5.2 + Math.sin(t * 1.3) * 0.6, z: Math.sin(t * 0.33) * 3 });
  const players = useMemo(
    () =>
      [
        { lag: 0.35, ox: 0.6, oz: 0.3, look: { skin: SKIN[0], shirt: "#BEF264", pants: "#FDFBF7", hair: "short" } },
        { lag: 0.8, ox: -0.9, oz: 0.8, look: { skin: SKIN[4], shirt: "#BEF264", pants: "#FDFBF7", hair: "bald" } },
        { lag: 0.5, ox: 0.4, oz: -1.0, look: { skin: SKIN[2], shirt: "#6D28D9", pants: "#0A0A0A", hair: "afro" } },
        { lag: 1.4, ox: -1.8, oz: -0.6, look: { skin: SKIN[5], shirt: "#6D28D9", pants: "#0A0A0A", hair: "cap" } },
      ] as { lag: number; ox: number; oz: number; look: Look }[],
    [],
  );

  useFrame(({ clock }) => {
    const p = ballAt(clock.elapsedTime);
    ball.current?.position.set(p.x, 0.09, p.z);
    if (ball.current) ball.current.rotation.x = clock.elapsedTime * 4;
  });

  return (
    <group>
      <mesh ref={ball} geometry={GEO.ball} material={mat("#FDFBF7", 0.5)} />
      {players.map((pl, i) => {
        const path: PathFn = (time) => {
          const at = (s: number) => {
            const b = ballAt(s - pl.lag);
            return { x: b.x + pl.ox, z: b.z + pl.oz };
          };
          const now = at(time);
          const next = at(time + 0.05);
          return { x: now.x, z: now.z, ry: Math.atan2(next.x - now.x, next.z - now.z) };
        };
        return <Person key={i} look={pl.look} pose="run" phase={i * 0.4} path={path} />;
      })}
    </group>
  );
}

export default function CampPeople() {
  return (
    <group>
      <FireCircle />
      <Strollers />
      <MovieCrowd />
    </group>
  );
}
