// The paid campers shown walking round the homepage camp. Filled from outside the 3D
// canvas (where the database lives) and read inside it.
import { PEOPLE, withCampers, type CamperOnSite, type PersonSpec } from '@/data/campLayout';

let people: PersonSpec[] = PEOPLE;
let lastKey = '';
const listeners = new Set<() => void>();

export function setCampersOnSite(campers: CamperOnSite[]) {
  const key = JSON.stringify(campers);
  if (key === lastKey) return;
  lastKey = key;
  people = withCampers(campers);
  listeners.forEach(l => l());
}

export const campPeople = {
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  get: () => people,
  server: () => PEOPLE,
};
