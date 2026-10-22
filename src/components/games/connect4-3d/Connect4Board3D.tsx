'use client';

import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../../three/useReducedMotion';
import { useFrame } from '@react-three/fiber';
import { GameCanvas } from '../../three/GameCanvas';

interface Connect4Board3DProps {
  board: (0 | 1 | 2)[][];
  winCells: [number, number][];
  enabled: boolean;
  onDrop: (col: number) => void;
}

function Connect4BoardInner({ board, winCells, enabled, onDrop }: Connect4Board3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const reduced = useReducedMotion();
  const prevBoard = useRef<(0|1|2)[][]>([]);
  const dropAnim = useRef<Map<string, { fromY:number; toY:number; t:number }>>(new Map());

  const discs = useMemo(() => {
    const arr: { pos: [number, number, number]; color: string; col: number; row: number; key: string }[] = [];
    board.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (!cell) return;
        const y = (5 - r) * 0.4 + 0.2;
        const x = c - 3;
        const color = cell === 1 ? '#ff6b6b' : '#d946ef';
        const key = `${c}-${r}`;
        arr.push({ pos: [x, y, 0] as [number, number, number], color, col: c, row: r, key });
      });
    });
    return arr;
  }, [board]);

  useEffect(() => {
    const prev = prevBoard.current;
    const next = board;
    const anim = dropAnim.current;
    anim.clear();
    if (!reduced) {
      for (let c = 0; c < 7; c++) {
        let prevRow = -1, nextRow = -1;
        for (let r = 0; r < 6; r++) {
          if (prev[r]?.[c]) prevRow = r;
          if (next[r]?.[c]) nextRow = r;
        }
        if (nextRow !== -1 && (prevRow === -1 || nextRow < prevRow)) {
          const key = `${c}-${nextRow}`;
          const fromY = 3.5;
          const toY = (5 - nextRow) * 0.4 + 0.2;
          anim.set(key, { fromY, toY, t: 0 });
        }
      }
    } else {
      dropAnim.current = new Map();
    }
    prevBoard.current = next.map(r => [...r]);
  }, [board, reduced]);

  useFrame((_, dt) => {
    const anim = dropAnim.current;
    if (!reduced && anim.size > 0 && groupRef.current) {
      let running = false;
      anim.forEach((v, key) => {
        v.t += dt;
        const p = Math.min(v.t / 0.35, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const y = v.fromY + (v.toY - v.fromY) * eased;
        const mesh = groupRef.current?.getObjectByName(key);
        if (mesh) {
          mesh.position.y = y;
          if (p > 0.85 && v.fromY > y) {
            mesh.position.y = v.toY - 0.02 * Math.sin(p * Math.PI);
          }
        } else {
          running = true;
        }
      });
      if (!running) {
        anim.forEach((_, key) => {
          const mesh = groupRef.current?.getObjectByName(key);
          if (mesh) mesh.position.y = anim.get(key)!.toY;
        });
        anim.clear();
      }
    }
  });

  useEffect(() => {
    if (!reduced && groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  }, [board, reduced]);

  const winSet = useMemo(() => new Set(winCells.map(([r,c]) => `${c}-${r}`)), [winCells]);

  return (
    <group ref={groupRef}>
      <mesh receiveShadow>
        <boxGeometry args={[7.5, 3.0, 0.3]} />
        <meshStandardMaterial color="#1e3a8a" roughness={0.4} />
      </mesh>
      {Array.from({ length: 7 }).map((_, c) => (
        Array.from({ length: 6 }).map((__, r) => {
          const x = c - 3;
          const y = 5 - r;
          const isWin = winSet.has(`${c}-${r}`);
          const isEnabled = enabled;
          return (
            <group key={`${c}-${r}`} position={[x, y * 0.4, 0]} onPointerDown={() => isEnabled && onDrop(c)}>
              <mesh>
                <cylinderGeometry args={[0.35, 0.35, 0.15, 24]} />
                <meshStandardMaterial color={isWin ? '#b6ff00' : '#fde68a'} roughness={0.6} emissive={isWin ? '#b6ff00' : '#000000'} emissiveIntensity={isWin ? 0.6 : 0} />
              </mesh>
            </group>
          );
        })
      ))}
      {discs.map((d) => {
        const isWin = winSet.has(d.key);
        return (
          <mesh key={d.key} name={d.key} position={[d.pos[0], reduced ? d.pos[1] : d.pos[1], 0]}>
            <cylinderGeometry args={[0.32, 0.32, 0.35, 24]} />
            <meshStandardMaterial color={d.color} emissive={isWin ? d.color : '#000'} emissiveIntensity={isWin ? 0.5 : 0} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Connect4Board3D({ board, winCells, enabled, onDrop }: Connect4Board3DProps) {
  return (
    <div style={{ width: '100%', height: '420px' }}>
      <GameCanvas>
        <Connect4BoardInner board={board} winCells={winCells} enabled={enabled} onDrop={onDrop} />
      </GameCanvas>
    </div>
  );
}
