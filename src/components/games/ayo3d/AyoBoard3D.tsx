'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../../three/useReducedMotion';
import { useFrame } from '@react-three/fiber';
import { GameCanvas } from '../../three/GameCanvas';

interface AyoBoard3DProps {
  pits: number[];
  store: [number, number];
  turn: 0 | 1;
  seat: number | null;
  legalMoves: number[];
  onPitSelect: (pit: number) => void;
}

function SeedCluster({ count, pitIndex, hop }: { count: number; pitIndex: number; hop?: boolean }) {
  const seeds = useMemo(() => {
    return Array.from({ length: Math.min(count, 18) }).map((_, i) => {
      const angle = (i / Math.max(count, 1)) * Math.PI * 2;
      const radius = 0.06 + (i % 4) * 0.03;
      return [Math.cos(angle) * radius, 0.09 + (i % 3) * 0.02, Math.sin(angle) * radius] as [number, number, number];
    });
  }, [count]);

  const groupRef = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    if (hop) {
      t.current += dt * 6;
      const s = 0.9 + Math.sin(t.current) * 0.1;
      groupRef.current.scale.set(s, s, s);
    } else {
      groupRef.current.scale.lerp(new THREE.Vector3(1,1,1), 0.15);
      t.current *= 0.9;
    }
  });

  useEffect(() => {
    if (!groupRef.current) return;
    if (hop) {
      groupRef.current.scale.set(1,1,1);
      t.current = 0;
    }
  }, [hop, count]);

  return (
    <group ref={groupRef}>
      {seeds.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#d4a373" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Pit({
  index,
  count,
  isLegal,
  isPlayer,
  onClick,
  glow,
  hop,
}: {
  index: number;
  count: number;
  isLegal: boolean;
  isPlayer: boolean;
  onClick: () => void;
  glow: boolean;
  hop?: boolean;
}) {
  const x = -2.5 + (index % 6) * 1.0;
  const z = index < 6 ? -0.6 : 0.6;

  return (
    <group position={[x, 0, z]} onPointerDown={onClick}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.35, 0.38, 0.18, 24]} />
        <meshStandardMaterial color="#6b4f3a" />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 24]} />
        <meshStandardMaterial color="#a07a5a" roughness={0.7} />
      </mesh>
      {count > 0 && <SeedCluster count={count} pitIndex={index} hop={!!hop} />}
      {isPlayer && isLegal && (
        <mesh>
          <ringGeometry args={[0.4, 0.5, 24]} />
          <meshBasicMaterial color="#b6ff00" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {glow && <pointLight position={[0, 0.3, 0]} intensity={0.8} color="#b6ff00" distance={1.5} />}
    </group>
  );
}

function AyoBoardInner({ pits, turn, seat, legalMoves, onPitSelect }: { pits: number[]; turn: 0 | 1; seat: number | null; legalMoves: number[]; onPitSelect: (pit: number) => void }) {
  const reduced = useReducedMotion();
  const boardRef = useRef<THREE.Group>(null);
  const prevPits = useRef<number[]>(pits);
  const hopPit = useRef<number | null>(null);

  const playerRowFirst = useMemo(() => {
    if (seat === null) return true;
    return seat === 0;
  }, [seat]);

  useEffect(() => {
    const prev = prevPits.current;
    const next = pits;
    let changed = false;
    for (let i = 0; i < 12; i++) {
      if (prev[i] !== next[i]) {
        changed = true;
        if (next[i] > prev[i]) hopPit.current = i;
      }
    }
    prevPits.current = [...next];
    if (!reduced && changed) {
      if (boardRef.current) {
        boardRef.current.rotation.y += 0.02;
      }
    }
  }, [pits, reduced]);

  useFrame((_, dt) => {
    if (!reduced && boardRef.current && hopPit.current !== null) {
      boardRef.current.rotation.y += Math.sin(Date.now() * 0.001) * dt * 0.01;
    }
  });

  return (
    <group ref={boardRef} rotation={[Math.PI / 8, playerRowFirst ? 0 : Math.PI, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[9, 0.3, 2]} />
        <meshStandardMaterial color="#5a3e2b" roughness={0.9} />
      </mesh>
      {[-4, 4].map((x, i) => (
        <group key={i} position={[x, 0.25, 0]}>
          <mesh>
            <cylinderGeometry args={[0.5, 0.5, 0.5, 24]} />
            <meshStandardMaterial color="#3a2318" />
          </mesh>
        </group>
      ))}
      {pits.map((count, i) => {
        const isPlayerPit = seat === null ? i < 6 : (seat === 0 ? i < 6 : i >= 6);
        const isLegal = legalMoves.includes(i);
        const canGlow = isPlayerPit && isLegal && turn === (seat ?? 0);
        const hopping = hopPit.current === i && !reduced;
        return (
          <Pit
            key={i}
            index={i}
            count={count}
            isLegal={isLegal}
            isPlayer={isPlayerPit}
            onClick={() => onPitSelect(i)}
            glow={!!canGlow}
            hop={hopping}
          />
        );
      })}
      <group position={[-4.2, 0.3, 0]}>
        <mesh>
          <boxGeometry args={[0.8,0.5,0.5]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        <mesh position={[0,0.15,0]}>
          <boxGeometry args={[0.6,0.35,0.4]} />
          <meshStandardMaterial color="#a07a5a" />
        </mesh>
      </group>
      <group position={[4.2, 0.3, 0]}>
        <mesh>
          <boxGeometry args={[0.8,0.5,0.5]} />
          <meshStandardMaterial color="#8b5a2b" />
        </mesh>
        <mesh position={[0,0.15,0]}>
          <boxGeometry args={[0.6,0.35,0.4]} />
          <meshStandardMaterial color="#a07a5a" />
        </mesh>
      </group>
    </group>
  );
}

export default function AyoBoard3D({
  pits,
  store,
  turn,
  seat,
  legalMoves,
  onPitSelect,
}: AyoBoard3DProps) {
  return (
    <div style={{ width: '100%', height: '420px' }}>
      <GameCanvas>
        <AyoBoardInner pits={pits} turn={turn} seat={seat} legalMoves={legalMoves} onPitSelect={onPitSelect} />
      </GameCanvas>
    </div>
  );
}
