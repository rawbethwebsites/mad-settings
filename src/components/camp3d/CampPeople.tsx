"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ballAt, FIRE_LOG_ANGLES, FIRE_LOG_RADIUS, PITCH, type Look, type PersonSpec, type Pose } from "@/data/campLayout";
import { campPeople } from "@/lib/campCampers";
import { registerTalker, setTalkPicker } from "./CampTalk";

/**
 * The whole crowd (~100 campers) drawn with one instanced mesh per body part.
 * Each frame every camper is posed on a single invisible skeleton, and that
 * skeleton's part transforms are copied into the instance buffers.
 * Built in real-world metres (≈1.8m tall), scaled to the campsite, facing +z.
 */

const PERSON_SCALE = 0.8;
const SIDES = [-1, 1] as const;

// ── Poses ───────────────────────────────────────────────────────────────────
type Joints = {
  bodyY: number;
  lean: number;
  sway: number;
  headX: number;
  headY: number;
  hip: [number, number];
  knee: [number, number];
  sx: [number, number];
  sz: [number, number];
  el: [number, number];
};

const J: Joints = { bodyY: 0, lean: 0, sway: 0, headX: 0, headY: 0, hip: [0, 0], knee: [0, 0], sx: [0, 0], sz: [0, 0], el: [0, 0] };

function poseAt(pose: Pose, t: number, j: Joints) {
  j.bodyY = j.lean = j.sway = j.headX = j.headY = 0;
  j.hip[0] = j.hip[1] = j.knee[0] = j.knee[1] = 0;
  j.sx[0] = j.sx[1] = 0.1;
  j.sz[0] = j.sz[1] = 0;
  j.el[0] = j.el[1] = -0.15;

  switch (pose) {
    case "walk":
    case "run": {
      const run = pose === "run";
      const w = t * (run ? 10.5 : 6.2);
      const s = Math.sin(w);
      const amp = run ? 0.85 : 0.45;
      j.hip[0] = s * amp;
      j.hip[1] = -s * amp;
      j.knee[0] = Math.max(0, -Math.cos(w)) * (run ? 1.5 : 0.75);
      j.knee[1] = Math.max(0, Math.cos(w)) * (run ? 1.5 : 0.75);
      j.sx[0] = -s * (run ? 0.9 : 0.4);
      j.sx[1] = s * (run ? 0.9 : 0.4);
      j.el[0] = j.el[1] = run ? -1.4 : -0.3;
      j.bodyY = Math.abs(Math.cos(w)) * (run ? 0.07 : 0.03) - (run ? 0.04 : 0);
      j.lean = run ? 0.22 : 0.04;
      j.sway = Math.sin(w) * 0.03;
      j.headY = run ? 0 : Math.sin(t * 0.4) * 0.35; // glancing at a friend
      break;
    }
    case "stand": {
      // Chatting: weight shifts, hands come up when they make a point.
      const shift = Math.sin(t * 0.45);
      j.hip[0] = shift * 0.05;
      j.hip[1] = -shift * 0.05;
      j.knee[0] = Math.max(0, shift) * 0.12;
      j.knee[1] = Math.max(0, -shift) * 0.12;
      j.sway = shift * 0.035;
      const talk = Math.max(0, Math.sin(t * 0.4)) ** 3;
      j.sx[1] = -0.2 - talk * (0.7 + Math.sin(t * 4.5) * 0.25);
      j.el[1] = -0.3 - talk * 1.1;
      j.sx[0] = 0.05;
      j.sz[0] = -0.05;
      j.headY = Math.sin(t * 0.3) * 0.3;
      j.headX = Math.sin(t * 1.1) * 0.04 - talk * 0.08;
      break;
    }
    case "sit": {
      j.bodyY = -0.45;
      j.hip[0] = j.hip[1] = -1.5;
      j.knee[0] = j.knee[1] = 1.5;
      j.lean = 0.18;
      j.sx[0] = j.sx[1] = -0.55;
      j.el[0] = j.el[1] = -0.65;
      const talk = Math.max(0, Math.sin(t * 0.35)) ** 3;
      j.sx[1] = -0.55 - talk * (0.6 + Math.sin(t * 5) * 0.25);
      j.el[1] = -0.65 - talk * 0.9;
      j.headY = Math.sin(t * 0.27) * 0.55;
      j.headX = Math.sin(t * 1.3) * 0.04 - talk * 0.1;
      j.sway = Math.sin(t * 0.5) * 0.03;
      break;
    }
    case "ground": {
      j.bodyY = -0.66;
      j.hip[0] = j.hip[1] = -1.9;
      j.knee[0] = j.knee[1] = 2.5;
      j.lean = -0.05;
      j.sx[0] = j.sx[1] = -1.0;
      j.sz[0] = -0.12;
      j.sz[1] = 0.12;
      j.el[0] = j.el[1] = -0.9;
      j.headX = -0.12 + Math.sin(t * 0.6) * 0.03;
      j.headY = Math.sin(t * 0.2) * 0.25;
      break;
    }
    case "dance": {
      const w = t * 7.6;
      const b = Math.abs(Math.sin(w));
      j.bodyY = -b * 0.07;
      j.hip[0] = j.hip[1] = -b * 0.25;
      j.knee[0] = j.knee[1] = b * 0.5;
      const handsUp = Math.max(0, Math.sin(t * 0.6)) > 0.35;
      j.sx[0] = handsUp ? -2.7 + Math.sin(w) * 0.2 : -0.6 + Math.sin(w) * 0.35;
      j.sx[1] = handsUp ? -2.7 - Math.sin(w) * 0.2 : -0.6 - Math.sin(w) * 0.35;
      j.sz[0] = handsUp ? -0.25 : -0.15;
      j.sz[1] = handsUp ? 0.25 : 0.15;
      j.el[0] = j.el[1] = handsUp ? -0.2 : -1.2;
      j.sway = Math.sin(w / 2) * 0.12;
      j.headX = b * 0.15;
      break;
    }
    case "sing": {
      const w = t * 3.2;
      j.bodyY = -Math.abs(Math.sin(w)) * 0.03;
      j.knee[0] = j.knee[1] = Math.abs(Math.sin(w)) * 0.12;
      j.sx[1] = -1.2; // mic hand up to the mouth
      j.sz[1] = -0.28;
      j.el[1] = -1.95;
      j.sx[0] = -1.1 + Math.sin(t * 1.1) * 0.5; // other arm out to the crowd
      j.sz[0] = -0.7 - Math.sin(t * 0.8) * 0.3;
      j.el[0] = -0.3;
      j.sway = Math.sin(w / 2) * 0.08;
      j.lean = -0.08 + Math.sin(t * 0.7) * 0.06;
      j.headX = -0.12;
      break;
    }
    case "dj": {
      const nod = Math.sin(t * 2 * Math.PI * 1.05);
      j.headX = 0.1 + nod * 0.14;
      j.bodyY = -Math.abs(nod) * 0.03;
      j.knee[0] = j.knee[1] = Math.abs(nod) * 0.1;
      j.lean = 0.12;
      j.sx[0] = -0.75;
      j.el[0] = -0.75 + Math.sin(t * 3) * 0.1; // riding the fader
      const pump = Math.max(0, Math.sin(t * 0.9)) > 0.55;
      j.sx[1] = pump ? -2.8 + nod * 0.15 : -0.8;
      j.el[1] = pump ? -0.25 : -0.7;
      j.sz[1] = pump ? 0.15 : 0;
      break;
    }
  }
}

// ── Geometry ────────────────────────────────────────────────────────────────
const GEO = {
  thigh: new THREE.CylinderGeometry(0.08, 0.062, 0.45, 10),
  shin: new THREE.CylinderGeometry(0.06, 0.046, 0.42, 10),
  shoe: new THREE.BoxGeometry(0.105, 0.075, 0.25),
  sole: new THREE.BoxGeometry(0.115, 0.03, 0.26),
  hips: new THREE.CylinderGeometry(0.165, 0.155, 0.18, 12),
  chest: new THREE.CylinderGeometry(0.19, 0.155, 0.5, 12),
  shoulderCap: new THREE.SphereGeometry(0.075, 10, 8),
  neck: new THREE.CylinderGeometry(0.048, 0.056, 0.12, 10),
  head: new THREE.SphereGeometry(0.12, 16, 12),
  eye: new THREE.SphereGeometry(0.013, 6, 4),
  nose: new THREE.ConeGeometry(0.022, 0.05, 6),
  ear: new THREE.SphereGeometry(0.026, 6, 5),
  upperArm: new THREE.CylinderGeometry(0.054, 0.046, 0.28, 10),
  forearm: new THREE.CylinderGeometry(0.044, 0.036, 0.26, 10),
  hand: new THREE.SphereGeometry(0.045, 8, 6),
  hairShort: new THREE.SphereGeometry(0.127, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
  afro: new THREE.IcosahedronGeometry(0.17, 2),
  brim: new THREE.BoxGeometry(0.2, 0.022, 0.13),
  bun: new THREE.SphereGeometry(0.06, 10, 8),
  braid: new THREE.CylinderGeometry(0.022, 0.014, 0.34, 6),
  mic: new THREE.CylinderGeometry(0.02, 0.014, 0.16, 8),
  micHead: new THREE.SphereGeometry(0.032, 8, 6),
  log: new THREE.CylinderGeometry(0.17, 0.19, 1.5, 7),
  ball: new THREE.IcosahedronGeometry(0.11, 1),
};

// ── Skeleton: one invisible rig, re-posed for every camper ─────────────────
function node(parent: THREE.Object3D, pos: [number, number, number] = [0, 0, 0], rot?: [number, number, number], scale?: [number, number, number]) {
  const o = new THREE.Object3D();
  o.position.set(...pos);
  if (rot) o.rotation.set(...rot);
  if (scale) o.scale.set(...scale);
  parent.add(o);
  return o;
}

function buildRig() {
  const root = new THREE.Object3D();
  const body = node(root);
  const hip = SIDES.map((side) => node(body, [side * 0.1, 0.9, 0]));
  const knee = hip.map((h) => node(h, [0, -0.45, 0]));
  const torso = node(body, [0, 0.9, 0]);
  const head = node(torso, [0, 0.66, 0]);
  const shoulder = SIDES.map((side) => node(torso, [side * 0.235, 0.52, 0]));
  const elbow = shoulder.map((s) => node(s, [0, -0.28, 0]));

  const parts = {
    thigh: hip.map((h) => node(h, [0, -0.225, 0])),
    shin: knee.map((k) => node(k, [0, -0.21, 0])),
    shoe: knee.map((k) => node(k, [0, -0.415, 0.05])),
    sole: knee.map((k) => node(k, [0, -0.455, 0.05])),
    hips: [node(torso, [0, 0.05, 0], undefined, [1, 1, 0.66])],
    chest: [node(torso, [0, 0.33, 0], undefined, [1, 1, 0.62])],
    shoulderCap: SIDES.map((side) => node(torso, [side * 0.2, 0.53, 0], undefined, [1, 0.8, 0.9])),
    neck: [node(torso, [0, 0.62, 0])],
    head: [node(head, [0, 0.11, 0.01], undefined, [0.92, 1.12, 1])],
    eye: SIDES.map((side) => node(head, [side * 0.042, 0.13, 0.115])),
    ear: SIDES.map((side) => node(head, [side * 0.11, 0.11, 0], undefined, [0.5, 1, 0.8])),
    nose: [node(head, [0, 0.095, 0.128], [Math.PI / 2, 0, 0])],
    hairShort: [node(head, [0, 0.13, -0.01], [-0.25, 0, 0])],
    afro: [node(head, [0, 0.19, -0.03], undefined, [1, 0.85, 1])],
    brim: [node(head, [0, 0.17, 0.13], [-0.15, 0, 0])],
    bun: [node(head, [0, 0.26, -0.08])],
    braid: [-0.07, -0.025, 0.025, 0.07].map((x) => node(head, [x, 0.02, -0.09], [0.25, 0, x * 1.5])),
    upperArm: shoulder.map((s) => node(s, [0, -0.14, 0])),
    forearm: elbow.map((e) => node(e, [0, -0.13, 0])),
    hand: elbow.map((e) => node(e, [0, -0.29, 0])),
    mic: [node(node(elbow[1], [0, -0.3, 0.02], [0.5, 0, 0]), [0, 0.05, 0])],
    micHead: [node(elbow[1], [0, -0.3, 0.02], [0.5, 0, 0])],
  };
  parts.micHead[0].position.set(0, -0.3 + 0.14 * Math.cos(0.5), 0.02 + 0.14 * Math.sin(0.5));
  return { root, body, hip, knee, torso, head, shoulder, elbow, parts };
}

type PartKey = keyof ReturnType<typeof buildRig>["parts"];

type PartDef = {
  key: PartKey;
  geo: THREE.BufferGeometry;
  color: (l: Look) => string;
  has?: (p: PersonSpec) => boolean;
  roughness?: number;
  pickable?: boolean;
};

const hairColor = (l: Look) => l.hairColor ?? "#120c08";
const hasHair = (...kinds: Look["hair"][]) => (p: PersonSpec) => kinds.includes(p.look.hair);

const PARTS: PartDef[] = [
  { key: "thigh", geo: GEO.thigh, color: (l) => l.pants, pickable: true },
  { key: "shin", geo: GEO.shin, color: (l) => l.pants },
  { key: "shoe", geo: GEO.shoe, color: () => "#111015" },
  { key: "sole", geo: GEO.sole, color: () => "#ECE8E0", roughness: 0.6 },
  { key: "hips", geo: GEO.hips, color: (l) => l.pants },
  { key: "chest", geo: GEO.chest, color: (l) => l.shirt, roughness: 0.7, pickable: true },
  { key: "shoulderCap", geo: GEO.shoulderCap, color: (l) => l.shirt, roughness: 0.7 },
  { key: "neck", geo: GEO.neck, color: (l) => l.skin, roughness: 0.6 },
  { key: "head", geo: GEO.head, color: (l) => l.skin, roughness: 0.6, pickable: true },
  { key: "eye", geo: GEO.eye, color: () => "#0b0705", roughness: 0.3 },
  { key: "ear", geo: GEO.ear, color: (l) => l.skin, roughness: 0.6 },
  { key: "nose", geo: GEO.nose, color: (l) => l.skin, roughness: 0.6 },
  { key: "hairShort", geo: GEO.hairShort, color: hairColor, has: hasHair("short", "cap", "bun", "braids"), roughness: 0.95 },
  { key: "afro", geo: GEO.afro, color: hairColor, has: hasHair("afro"), roughness: 0.95 },
  { key: "brim", geo: GEO.brim, color: hairColor, has: hasHair("cap"), roughness: 0.95 },
  { key: "bun", geo: GEO.bun, color: hairColor, has: hasHair("bun"), roughness: 0.95 },
  { key: "braid", geo: GEO.braid, color: hairColor, has: hasHair("braids"), roughness: 0.95 },
  { key: "upperArm", geo: GEO.upperArm, color: (l) => l.shirt, roughness: 0.7 },
  { key: "forearm", geo: GEO.forearm, color: (l) => l.skin, roughness: 0.6 },
  { key: "hand", geo: GEO.hand, color: (l) => l.skin, roughness: 0.6 },
  { key: "mic", geo: GEO.mic, color: () => "#0A0A0A", has: (p) => !!p.mic, roughness: 0.4 },
  { key: "micHead", geo: GEO.micHead, color: () => "#c9c9d1", has: (p) => !!p.mic, roughness: 0.3 },
];

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const frustum = new THREE.Frustum();
const viewProj = new THREE.Matrix4();
const probe = new THREE.Sphere(new THREE.Vector3(), 1.3);
const tmpColor = new THREE.Color();

function Crowd({ people: PEOPLE }: { people: PersonSpec[] }) {
  const rig = useMemo(buildRig, []);
  const meshes = useRef<(THREE.InstancedMesh | null)[]>([]);

  // Which camper owns which instance, per part.
  const layout = useMemo(
    () =>
      PARTS.map((def) => {
        const nodes = rig.parts[def.key];
        const owners = PEOPLE.map((p, i) => (def.has && !def.has(p) ? -1 : i)).filter((i) => i >= 0);
        const slot = new Int32Array(PEOPLE.length).fill(-1);
        owners.forEach((owner, k) => (slot[owner] = k));
        return { def, nodes, owners, slot, count: owners.length * nodes.length };
      }),
    [rig, PEOPLE],
  );

  const materials = useMemo(
    () => PARTS.map((def) => new THREE.MeshStandardMaterial({ roughness: def.roughness ?? 0.78 })),
    [],
  );

  // Head anchors for the speech bubbles.
  const heads = useMemo(() => PEOPLE.map(() => new THREE.Object3D()), [PEOPLE]);

  useLayoutEffect(() => {
    layout.forEach(({ def, nodes, owners }, m) => {
      const mesh = meshes.current[m];
      if (!mesh) return;
      owners.forEach((owner, k) => {
        tmpColor.set(def.color(PEOPLE[owner].look));
        for (let n = 0; n < nodes.length; n += 1) {
          mesh.setColorAt(k * nodes.length + n, tmpColor);
          mesh.setMatrixAt(k * nodes.length + n, ZERO);
        }
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [layout, PEOPLE]);

  useEffect(() => {
    const offs = heads.map((head, i) => {
      const label = PEOPLE[i].label;
      // Real campers say what they wrote on My camp
      const line = label?.shout ? () => ({ tag: "tip" as const, text: label.shout, by: label.name }) : undefined;
      return registerTalker(`camper-${i}`, { head, line });
    });
    const pickable = layout
      .map((l, m) => ({ l, mesh: meshes.current[m] }))
      .filter((x): x is { l: (typeof layout)[number]; mesh: THREE.InstancedMesh } => !!x.mesh && !!x.l.def.pickable);
    setTalkPicker((raycaster) => {
      pickable.forEach((p) => p.mesh.computeBoundingSphere());
      const hits = raycaster.intersectObjects(
        pickable.map((p) => p.mesh),
        false,
      );
      const hit = hits[0];
      if (!hit || hit.instanceId === undefined) return undefined;
      const entry = pickable.find((p) => p.mesh === hit.object);
      if (!entry) return undefined;
      return `camper-${entry.l.owners[Math.floor(hit.instanceId / entry.l.nodes.length)]}`;
    });
    return () => {
      offs.forEach((off) => off());
      setTalkPicker(null);
    };
  }, [heads, layout, PEOPLE]);

  const frame = useRef(0);

  useFrame(({ clock, camera }) => {
    const time = clock.elapsedTime;
    const { root, body, hip, knee, torso, head, shoulder, elbow, parts } = rig;
    frame.current += 1;
    viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(viewProj);

    for (let i = 0; i < PEOPLE.length; i += 1) {
      const p = PEOPLE[i];
      const build = p.look.build ?? 1;
      let px = p.x;
      let pz = p.z;
      let ry = p.ry;
      if (p.path) {
        const at = p.path(time);
        px = at.x;
        pz = at.z;
        ry = at.ry;
      }
      // Only pose campers the camera can see; far ones move at a lower rate.
      probe.center.set(px, p.y + 0.7, pz);
      if (!frustum.intersectsSphere(probe)) {
        heads[i].position.set(px, p.y + 1.35, pz); // rough head spot for the bubbles
        continue;
      }
      const dist = camera.position.distanceTo(probe.center);
      const every = dist > 26 ? 3 : dist > 15 ? 2 : 1;
      if (every > 1 && (frame.current + i) % every !== 0) continue;
      root.position.set(px, p.y, pz);
      root.rotation.set(0, ry, 0);
      root.scale.setScalar(PERSON_SCALE);

      // Body shape for this camper.
      hip[0].position.x = -0.1 * build;
      hip[1].position.x = 0.1 * build;
      shoulder[0].position.x = -0.235 * build;
      shoulder[1].position.x = 0.235 * build;
      parts.chest[0].scale.x = build;
      parts.hips[0].scale.x = build;
      parts.shoulderCap[0].position.x = -0.2 * build;
      parts.shoulderCap[1].position.x = 0.2 * build;
      parts.thigh[0].scale.set(build, 1, build);
      parts.thigh[1].scale.set(build, 1, build);

      const t = time + p.phase;
      poseAt(p.pose, t, J);
      body.position.y = J.bodyY;
      torso.rotation.set(J.lean, 0, J.sway);
      torso.scale.set(1, 1 + Math.sin(t * 1.7) * 0.012, 1 + Math.sin(t * 1.7) * 0.02); // breathing
      head.rotation.set(J.headX, J.headY, 0);
      for (let s = 0; s < 2; s += 1) {
        hip[s].rotation.set(J.hip[s], 0, 0);
        knee[s].rotation.set(J.knee[s], 0, 0);
        shoulder[s].rotation.set(J.sx[s], 0, J.sz[s] + SIDES[s] * -0.08);
        elbow[s].rotation.set(J.el[s], 0, 0);
      }
      root.updateMatrixWorld(true);

      heads[i].position.setFromMatrixPosition(head.matrixWorld);

      for (let m = 0; m < layout.length; m += 1) {
        const { slot, nodes } = layout[m];
        const k = slot[i];
        const mesh = meshes.current[m];
        if (k < 0 || !mesh) continue;
        for (let n = 0; n < nodes.length; n += 1) mesh.setMatrixAt(k * nodes.length + n, nodes[n].matrixWorld);
      }
    }

    for (const mesh of meshes.current) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {layout.map(({ def, count }, m) => (
        <instancedMesh
          key={def.key}
          ref={(mesh) => {
            meshes.current[m] = mesh;
          }}
          args={[def.geo, materials[m], count]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}

/** Logs round the fire for the circle of friends. */
function FireLogs() {
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4a2c16", roughness: 1, flatShading: true }), []);
  return (
    <group>
      {FIRE_LOG_ANGLES.map((deg) => {
        const a = (deg * Math.PI) / 180;
        return (
          <mesh
            key={deg}
            geometry={GEO.log}
            material={material}
            position={[Math.cos(a) * FIRE_LOG_RADIUS, 0.17, Math.sin(a) * FIRE_LOG_RADIUS]}
            rotation={[0, -a, Math.PI / 2]}
          />
        );
      })}
    </group>
  );
}

function MatchBall() {
  const ball = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: "#FDFBF7", roughness: 0.5, flatShading: true }), []);
  useFrame(({ clock }) => {
    const b = ballAt(clock.elapsedTime);
    if (!ball.current) return;
    ball.current.position.set(PITCH.x + b.x, 0.09, PITCH.z + b.z);
    ball.current.rotation.x = clock.elapsedTime * 4;
  });
  return <mesh ref={ball} geometry={GEO.ball} material={material} />;
}

export default function CampPeople() {
  const people = useSyncExternalStore(campPeople.subscribe, campPeople.get, campPeople.server);
  // Rebuild the instanced meshes when the mix of hair styles (and so part counts) changes
  const key = useMemo(() => people.map((p) => p.look.hair).join(""), [people]);
  return (
    <group>
      <FireLogs />
      <MatchBall />
      <Crowd key={key} people={people} />
    </group>
  );
}
