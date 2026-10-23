'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion } from '../../three/useReducedMotion';
import { GameCanvas } from '../../three/GameCanvas';

interface Connect4Board3DProps {
  board: (0 | 1 | 2)[][];
  winCells: [number, number][];
  enabled: boolean;
  onDrop: (col: number) => void;
}

// Brand tokens from globals.css; keep these in sync with the player legend.
const CORAL = '#FB7185';
const PURPLE = '#6D28D9';
const VIEW_WIDTH = 7.65;
const VIEW_HEIGHT = 7.3;
const discY = (row: number) => 2.5 - row;

/* eslint-disable react-hooks/immutability -- R3F owns this imperative Three camera; update its frustum on resize. */
function Framing() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.OrthographicCamera)) return;
    const aspect = size.width / size.height;
    const width = Math.max(VIEW_WIDTH, VIEW_HEIGHT * aspect);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = width / aspect / 2;
    camera.bottom = -width / aspect / 2;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}
/* eslint-enable react-hooks/immutability */

function Disc({ row, col, player, winning, reduced }: {
  row: number; col: number; player: number; winning: boolean; reduced: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const color = player === 1 ? CORAL : PURPLE;
  const target = discY(row);
  useLayoutEffect(() => {
    elapsed.current = 0;
    if (ref.current) ref.current.position.y = reduced ? target : 3.52;
  }, [target, reduced]);
  useFrame((state, dt) => {
    elapsed.current = Math.min(elapsed.current + dt, 0.6);
    if (ref.current) {
      const p = Math.min(elapsed.current / 0.44, 1);
      // Accelerate under gravity, then make one small, damped landing bounce.
      const bounce = elapsed.current > 0.44 && elapsed.current < 0.6
        ? Math.sin((elapsed.current - 0.44) / 0.16 * Math.PI) * 0.12 : 0;
      ref.current.position.y = reduced ? target : 3.52 + (target - 3.52) * p * p + bounce;
    }
    if (material.current) {
      material.current.emissiveIntensity = winning
        ? reduced ? 0.65 : 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.18
        : 0;
    }
  });
  return (
    <group ref={ref} position={[col - 3, target, 0]}>
      {/* Cylinders point along Y by default: turn their circular faces toward +Z. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.432, 0.432, 0.2, 40]} />
        <meshStandardMaterial ref={material} color={color} roughness={0.28} metalness={0.05} emissive={color} />
      </mesh>
      <mesh position={[0, 0, 0.112]}>
        <torusGeometry args={[0.328, 0.018, 8, 40]} />
        <meshStandardMaterial color={color} roughness={0.25} emissive={color} emissiveIntensity={winning ? 0.8 : 0.12} />
      </mesh>
      {winning && <mesh position={[0, 0, 0.135]}>
        <torusGeometry args={[0.375, 0.025, 8, 40]} />
        <meshBasicMaterial color="#BEF264" toneMapped={false} />
      </mesh>}
    </group>
  );
}

function Connect4Scene({ board, winCells }: Pick<Connect4Board3DProps, 'board' | 'winCells'>) {
  const reduced = useReducedMotion();
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-3.56, -2.98);
    shape.lineTo(3.56, -2.98);
    shape.lineTo(3.56, 2.98);
    shape.lineTo(-3.56, 2.98);
    shape.closePath();
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const hole = new THREE.Path();
        hole.absarc(col - 3, discY(row), 0.445, 0, Math.PI * 2, true);
        shape.holes.push(hole);
      }
    }
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12, bevelEnabled: true, bevelSegments: 1,
      steps: 1, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 20,
    });
    result.computeVertexNormals();
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const wins = new Set(winCells.map(([r, c]) => `${r}-${c}`));
  return <>
    <Framing />
    <group rotation={[-0.025, 0.025, 0]}>
      {/* Two truly perforated skins leave a channel for discs between them. */}
      {[-0.3, 0.16].map(z => <mesh key={z} geometry={geometry} position={[0, 0, z]}>
        <meshStandardMaterial color="#1464ed" roughness={0.25} metalness={0.06} />
      </mesh>)}
      {[-3.53, 3.53].map(x => <group key={x}>
        <mesh position={[x, -0.07, 0]}>
          <boxGeometry args={[0.14, 6.15, 0.65]} />
          <meshStandardMaterial color="#1256cf" roughness={0.3} />
        </mesh>
        <mesh position={[x * 0.91, -3.17, 0.12]}>
          <boxGeometry args={[0.95, 0.27, 1.5]} />
          <meshStandardMaterial color="#1261df" roughness={0.3} />
        </mesh>
      </group>)}
      <mesh position={[0, -3.02, 0]}>
        <boxGeometry args={[7.2, 0.18, 0.67]} />
        <meshStandardMaterial color="#104fbe" roughness={0.3} />
      </mesh>
      {board.flatMap((row, r) => row.map((cell, c) => cell ?
        <Disc key={`${r}-${c}-${cell}`} row={r} col={c} player={cell} winning={wins.has(`${r}-${c}`)} reduced={reduced} /> : null))}
    </group>
  </>;
}

function FlatBoard({ board, winCells }: Pick<Connect4Board3DProps, 'board' | 'winCells'>) {
  const wins = new Set(winCells.map(([r, c]) => `${r}-${c}`));
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
    <div style={{ position: 'absolute', left: '3.5%', right: '3.5%', top: '9.2%', bottom: '9.2%', borderRadius: 10, background: 'linear-gradient(135deg,#4394ff,#1464ed 42%,#104fbe)', padding: '0.7%', boxShadow: '0 7px 0 #093c9f, 0 16px 26px #0006', display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridTemplateRows: 'repeat(6,1fr)' }}>
      {board.flatMap((row, r) => row.map((cell, c) => <div key={`${r}-${c}`} style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ width: '86%', aspectRatio: '1', borderRadius: '50%', background: cell ? cell === 1 ? CORAL : PURPLE : '#171c33', border: '2px solid #0950bf', boxShadow: cell ? `inset 0 2px 3px #ffffff70, inset 0 -3px 3px #0004${wins.has(`${r}-${c}`) ? ', 0 0 12px 3px #d4ff8a' : ''}` : 'inset 0 3px 6px #0009', display: 'grid', placeItems: 'center' }}>
          {!!cell && <div style={{ width: '76%', height: '76%', borderRadius: '50%', border: wins.has(`${r}-${c}`) ? '2px solid #BEF264' : '1px solid #ffffff40' }} />}
        </div>
      </div>))}
    </div>
    {[5, 82].map(left => <div key={left} style={{ position: 'absolute', top: '90%', left: `${left}%`, width: '13%', height: '4%', background: '#1464ed', borderRadius: 5, boxShadow: '0 4px 0 #093c9f' }} />)}
  </div>;
}

export default function Connect4Board3D({ board, winCells, enabled, onDrop }: Connect4Board3DProps) {
  return (
    <div data-connect4-board style={{ position: 'relative', width: '100%', aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}`, background: 'radial-gradient(ellipse at 50% 45%,#34304c,#141b2d 85%)', borderRadius: 16, isolation: 'isolate' }}>
      <GameCanvas orthographic camera={{ position: [0, 0, 12], near: 0.1, far: 40 }} background="#171c30" fallback={<FlatBoard board={board} winCells={winCells} />}>
        <Connect4Scene board={board} winCells={winCells} />
      </GameCanvas>
      <div role="group" aria-label="Connect four columns" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 7 }, (_, col) => {
          const full = board[0]?.[col] !== 0;
          const occupants = board.map(row => row[col] === 1 ? 'coral' : row[col] === 2 ? 'purple' : 'empty').join(', ');
          return <button key={col} type="button" disabled={!enabled || full}
            aria-label={`Drop disc in column ${col + 1}${full ? ', full' : ''}. Top to bottom: ${occupants}`}
            onClick={() => onDrop(col)}
            className="group focus-visible:outline-2 focus-visible:outline-brand-acid focus-visible:bg-white/10 enabled:hover:bg-white/5 disabled:cursor-default"
            style={{ position: 'absolute', top: '4%', height: '87%', left: `${50 + (col - 3) / VIEW_WIDTH * 100}%`, transform: 'translateX(-50%)', width: `${100 / VIEW_WIDTH}%`, minWidth: 44, minHeight: 44, borderRadius: 10, cursor: enabled && !full ? 'pointer' : undefined, touchAction: 'manipulation' }}>
            <span aria-hidden="true" className="opacity-0 group-enabled:group-hover:opacity-100 group-focus-visible:opacity-100" style={{ position: 'absolute', top: 0, left: 0, right: 0, color: '#d4ff8a', fontSize: 18 }}>▼</span>
          </button>;
        })}
      </div>
    </div>
  );
}