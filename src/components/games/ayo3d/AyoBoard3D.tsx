'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameCanvas } from '../../three/GameCanvas';
import { useReducedMotion } from '../../three/useReducedMotion';

interface AyoBoard3DProps {
  pits: number[];
  store: [number, number];
  turn: 0 | 1;
  seat: number | null;
  legalMoves: number[];
  onPitSelect: (pit: number) => void;
}

const WIDTH = 8.15;
const HEIGHT = 4.95;
const TILT = -Math.PI / 4;
const ACID = '#BEF264';
const seedColors = ['#f6d8a5', '#bb7446', '#ffe7b9', '#77462e'];

// Seat one's view is rotated a half-turn on the table, never on the screen.
function pitPosition(index: number, seat: number): [number, number] {
  const mine = seat === 0 ? index < 6 : index >= 6;
  const column = mine ? index % 6 : 5 - index % 6;
  return [-2.75 + column * 1.1, mine ? -1.02 : 1.02];
}

function screenPosition(x: number, y: number, z = 0.3) {
  return { left: `${50 + x / WIDTH * 100}%`, top: `${50 - (y * Math.cos(TILT) - z * Math.sin(TILT)) / HEIGHT * 100}%` };
}

function outline() {
  const s = new THREE.Shape();
  const x = -4, y = -2.12, w = 8, h = 4.24, r = 0.4;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function bowlGeometry() {
  const vertices: number[] = [], indices: number[] = [];
  for (let ring = 0; ring <= 8; ring++) {
    const radius = ring / 8 * 0.47;
    for (let segment = 0; segment <= 32; segment++) {
      const angle = segment / 32 * Math.PI * 2;
      vertices.push(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.3 - 0.29 * (1 - (radius / 0.47) ** 2));
      if (ring < 8 && segment < 32) {
        const a = ring * 33 + segment, b = a + 33;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals();
  return g;
}

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#bf824a'; ctx.fillRect(0, 0, 256, 128);
  for (let line = 0; line < 100; line++) {
    ctx.strokeStyle = line % 3 ? '#75421c22' : '#f6d39b40';
    ctx.lineWidth = line % 4 === 0 ? 1.5 : 0.6;
    ctx.beginPath();
    for (let x = 0; x <= 256; x += 4) {
      const y = line * 1.3 + Math.sin(x * 0.025 + line * 0.8) * 1.8;
      if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1);
  return texture;
}

/* eslint-disable react-hooks/immutability -- This Three camera is intentionally controlled by R3F. */
function Framing() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    camera.left = -WIDTH / 2; camera.right = WIDTH / 2;
    camera.top = WIDTH / (size.width / size.height) / 2;
    camera.bottom = -camera.top; camera.zoom = 1;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
/* eslint-enable react-hooks/immutability */

function Seeds({ count, store = false }: { count: number; store?: boolean }) {
  return <group>
    {Array.from({ length: count }, (_, i) => {
      const layer = Math.floor(i / 9), n = i % 9;
      const angle = n * 2.4 + layer * 0.6;
      const radius = n === 0 ? 0 : 0.13 + (n % 3) * 0.065;
      return <mesh key={i} position={[Math.cos(angle) * radius * (store ? 0.72 : 1), Math.sin(angle) * radius * (store ? 2.3 : 1), 0.13 + layer * 0.12 + radius * 0.3]} rotation={[0.15, i * 0.7, i * 1.1]} scale={[1, 0.72, 0.65]}>
        <sphereGeometry args={[0.095, 8, 6]} />
        <meshStandardMaterial color={seedColors[i % seedColors.length]} roughness={0.55} />
      </mesh>;
    })}
  </group>;
}

// Infer only a visual sowing path from successive snapshots. The rules remain elsewhere.
function Sowing({ pits, store, turn, seat }: Pick<AyoBoard3DProps, 'pits' | 'store' | 'turn'> & { seat: number }) {
  const reduced = useReducedMotion();
  const previous = useRef({ pits: [...pits], store: [...store], turn });
  const path = useRef<[number, number][]>([]);
  const elapsed = useRef(1);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => {
    const prev = previous.current;
    const source = prev.pits.findIndex((n, i) => (i < 6 ? 0 : 1) === prev.turn && n > 0 && pits[i] === 0 && n !== pits[i]);
    path.current = [];
    if (!reduced && source >= 0 && prev.pits.some((n, i) => n !== pits[i])) {
      path.current.push(pitPosition(source, seat));
      let pit = source;
      for (let n = 0; n < prev.pits[source]; n++) {
        pit = (pit + 1) % 12;
        if (pit === source) pit = (pit + 1) % 12;
        path.current.push(pitPosition(pit, seat));
      }
      const capture = store.findIndex((n, i) => n > prev.store[i]);
      if (capture >= 0) path.current.push([capture === seat ? 3.57 : -3.57, 0]);
      elapsed.current = 0;
    }
    previous.current = { pits: [...pits], store: [...store], turn };
  }, [pits, store, turn, seat, reduced]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    elapsed.current += dt;
    const route = path.current;
    const progress = Math.min(elapsed.current / 0.65, 1);
    ref.current.visible = !reduced && progress < 1 && route.length > 1;
    if (!ref.current.visible) return;
    const segment = progress * (route.length - 1);
    const index = Math.min(Math.floor(segment), route.length - 2), p = segment - index;
    const a = route[index], b = route[index + 1];
    ref.current.position.set(THREE.MathUtils.lerp(a[0], b[0], p), THREE.MathUtils.lerp(a[1], b[1], p), 0.45 + Math.sin(p * Math.PI) * 0.65);
  });
  return <mesh ref={ref} visible={false} scale={[1, 0.75, 0.7]}>
    <sphereGeometry args={[0.14, 10, 8]} />
    <meshStandardMaterial color="#ffe3af" emissive="#c88535" emissiveIntensity={0.35} roughness={0.45} />
  </mesh>;
}

function AyoScene({ pits, store, turn, seat, legalMoves }: Omit<AyoBoard3DProps, 'onPitSelect'>) {
  const mine = seat ?? 0;
  const resources = useMemo(() => {
    const shape = outline();
    for (let i = 0; i < 12; i++) {
      const [x, y] = pitPosition(i, mine), hole = new THREE.Path();
      hole.absarc(x, y, 0.47, 0, Math.PI * 2, true); shape.holes.push(hole);
    }
    for (const x of [-3.57, 3.57]) {
      const hole = new THREE.Path();
      hole.absellipse(x, 0, 0.28, 1.35, 0, Math.PI * 2, true, 0); shape.holes.push(hole);
    }
    return {
      top: new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 24 }),
      base: new THREE.ExtrudeGeometry(outline(), { depth: 0.17, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2, curveSegments: 20 }),
      bowl: bowlGeometry(), texture: woodTexture(),
    };
  }, [mine]);
  useEffect(() => () => Object.values(resources).forEach(resource => resource.dispose()), [resources]);
  return <>
    <Framing />
    <group rotation={[TILT, 0, 0]}>
      <mesh geometry={resources.base} position={[0, 0, -0.2]}>
        <meshStandardMaterial color="#85502c" map={resources.texture} roughness={0.62} />
      </mesh>
      <mesh geometry={resources.top} position={[0, 0, 0.18]}>
        <meshStandardMaterial color="#deb17a" map={resources.texture} roughness={0.58} />
      </mesh>
      {pits.map((count, i) => {
        const [x, y] = pitPosition(i, mine);
        const legal = seat !== null && turn === seat && legalMoves.includes(i);
        return <group key={i} position={[x, y, 0]}>
          <mesh geometry={resources.bowl}>
            <meshStandardMaterial color="#a26a3c" roughness={0.75} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.31]}>
            <torusGeometry args={[0.48, 0.018, 6, 32]} />
            <meshStandardMaterial color={legal ? ACID : '#e6bb7d'} emissive={legal ? ACID : '#000000'} emissiveIntensity={legal ? 0.4 : 0} roughness={0.5} />
          </mesh>
          <Seeds count={count} />
        </group>;
      })}
      {[-3.57, 3.57].map((x, side) => <group key={x} position={[x, 0, 0]}>
        <mesh geometry={resources.bowl} scale={[0.28 / 0.47, 1.35 / 0.47, 1]}>
          <meshStandardMaterial color="#8b542e" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
        <Seeds count={store[side === 1 ? mine : 1 - mine]} store />
      </group>)}
      <Sowing pits={pits} store={store} turn={turn} seat={mine} />
    </group>
  </>;
}

function FlatBoard({ pits, store, seat }: Pick<AyoBoard3DProps, 'pits' | 'store' | 'seat'>) {
  const mine = seat ?? 0;
  return <div aria-hidden="true" style={{ position: 'absolute', inset: '15% 1.5% 10%', borderRadius: '12% / 22%', background: 'repeating-linear-gradient(2deg,#ad713f44 0 1px,transparent 1px 7px),linear-gradient(130deg,#e6ba7e,#b27a43 60%,#d19b5e)', border: '3px solid #83502d', boxShadow: '0 7px 0 #704225,0 14px 20px #0005' }}>
    {pits.map((count, i) => {
      const [x, y] = pitPosition(i, mine);
      return <div key={i} style={{ position: 'absolute', left: `${50 + x / 8 * 100}%`, top: `${50 - y / 4.24 * 100}%`, transform: 'translate(-50%,-50%)', width: '11.5%', height: '29%', borderRadius: '50%', border: '2px solid #d9ae75', background: 'radial-gradient(ellipse at 50% 65%,#b68149,#59351e)', boxShadow: 'inset 0 4px 5px #321a16aa' }}>
        {Array.from({ length: count }, (_, n) => <span key={n} style={{ position: 'absolute', width: 5, height: 4, borderRadius: '50%', background: seedColors[n % 4], boxShadow: '0 1px 1px #0009', left: `${22 + (n % 4) * 14}%`, top: `${30 + Math.floor(n / 4) % 4 * 11}%` }} />)}
      </div>;
    })}
    {[-3.57, 3.57].map((x, side) => <div key={x} style={{ position: 'absolute', left: `${50 + x / 8 * 100}%`, top: '22%', width: '6%', height: '56%', transform: 'translateX(-50%)', borderRadius: '50%', background: '#684025', boxShadow: 'inset 0 3px 5px #0007' }}>
      {Array.from({ length: store[side === 1 ? mine : 1 - mine] }, (_, n) => <span key={n} style={{ position: 'absolute', left: `${20 + n % 2 * 30}%`, top: `${8 + n % 10 * 7}%`, width: 4, height: 4, borderRadius: '50%', background: seedColors[n % 4] }} />)}
    </div>)}
  </div>;
}

export default function AyoBoard3D(props: AyoBoard3DProps) {
  const { pits, store, turn, seat, legalMoves, onPitSelect } = props;
  const mine = seat ?? 0;
  return <div data-ayo-board style={{ position: 'relative', width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}`, borderRadius: 12, background: '#29232b', isolation: 'isolate' }}>
    <GameCanvas orthographic camera={{ position: [0, 0, 12], near: 0.1, far: 40 }} background="#29232b" fallback={<FlatBoard pits={pits} store={store} seat={seat} />}>
      <AyoScene {...props} />
    </GameCanvas>
    <span style={{ position: 'absolute', top: '3%', left: 0, right: 0, textAlign: 'center', color: '#f5d9b0', fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>OPPONENT</span>
    <span style={{ position: 'absolute', bottom: '2%', left: 0, right: 0, textAlign: 'center', color: ACID, fontSize: 10, fontWeight: 800, letterSpacing: 2 }}>YOUR ROW · TAP A LIT PIT</span>
    <div role="group" aria-label="Ayo pits">
      {pits.map((count, i) => {
        const [x, y] = pitPosition(i, mine);
        const myPit = (i < 6 ? 0 : 1) === mine;
        const legal = seat !== null && turn === seat && myPit && legalMoves.includes(i);
        return <button key={i} type="button" disabled={!legal} onClick={() => onPitSelect(i)}
          aria-label={`Pit ${i + 1}, ${count} seeds${myPit ? ', your pit' : ', opponent'}`}
          className="focus-visible:outline-2 focus-visible:outline-brand-acid enabled:hover:bg-white/10 enabled:active:bg-white/20"
          style={{ position: 'absolute', ...screenPosition(x, y), transform: 'translate(-50%,-50%)', width: `${1.1 / WIDTH * 100}%`, height: '34%', minWidth: 44, minHeight: 44, borderRadius: '45%', touchAction: 'manipulation', cursor: legal ? 'pointer' : 'default' }}>
          <span aria-hidden="true" style={{ position: 'absolute', bottom: '0%', left: '50%', transform: 'translateX(-50%)', background: legal ? ACID : '#f7dfb7', color: '#2b1a10', borderRadius: 5, fontSize: 12, lineHeight: '18px', minWidth: 19, padding: '0 3px', fontWeight: 900, boxShadow: '0 1px 2px #0008' }}>{count}</span>
        </button>;
      })}
    </div>
    {[-3.57, 3.57].map((x, side) => <span key={x} aria-label={`${side === 1 ? 'Your' : 'Opponent'} store, ${store[side === 1 ? mine : 1 - mine]} seeds`} style={{ position: 'absolute', ...screenPosition(x, -1.52), transform: 'translate(-50%,-50%)', borderRadius: 4, background: '#f7dfb7', color: '#2b1a10', fontWeight: 900, fontSize: 11, padding: '1px 3px' }}>{store[side === 1 ? mine : 1 - mine]}</span>)}
  </div>;
}