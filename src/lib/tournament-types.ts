/**
 * @file This file centralizes shared type definitions across the tournament pages
 * to avoid circular dependencies.
 */

// These types represent the data structures for forms and active tournaments.

export type PlayerFormValues = {
  id?: string;
  name: string;
  rut: string;
  position: "drive" | "reves" | "ambos";
  categoryId: string;
};

export type CategoryFormValues = {
  id: string;
  type: "varones" | "damas" | "mixto";
  level: string;
};

export interface Dupla {
  id: string;
  jugadores: [PlayerFormValues, PlayerFormValues];
  nombre: string;
}

export interface CategoriaConDuplas extends CategoryFormValues {
  duplas: Dupla[];
  jugadoresSobrantes: PlayerFormValues[];
  numTotalJugadores: number;
}

export interface TorneoActivoData {
  tournamentName: string;
  date: string;
  time: string;
  place: string;
  categoriesWithDuplas: CategoriaConDuplas[];
  numCourts?: number;
  matchDuration?: number;
  playThirdPlace?: boolean;
  isAmericanoMode?: boolean;
}

export interface Standing {
  duplaId: string;
  duplaName: string;
  pj: number;
  pg: number;
  pp: number;
  pf: number;
  pc: number;
  pts: number;
}

export interface Match {
  id: string;
  round?: number;
  description?: string;
  dependsOn?: string[];
  dupla1: Dupla;
  dupla2: Dupla;
  score1?: number;
  score2?: number;
  court?: number | string;
  time?: string;
  status: 'pending' | 'completed' | 'live';
  winnerId?: string;
  loserId?: string;
  groupOriginId?: string;
}

export interface Group {
  id: string;
  name: string;
  duplas: Dupla[];
  standings: Standing[];
  matches: Match[];
  groupAssignedCourt?: string | number;
  groupStartTime?: string;
  groupMatchDuration?: number;
}

export interface PlayoffMatch extends Match {
  stage: 'cuartos' | 'semifinal' | 'final' | 'tercer_puesto';
  description: string;
}

export interface CategoryFixture {
  categoryId: string;
  categoryName: string;
  groups: Group[];
  playoffMatches?: PlayoffMatch[];
}

export interface FixtureData {
  [categoryId: string]: CategoryFixture;
}
