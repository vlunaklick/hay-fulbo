// Mock content for the landing prototype. Deliberately the worst realistic
// case: long group name, long player names, a debt that isn't settled.

export const group = "Los del Jueves · Parque Chacabuco";

export const match = {
  date: "Jueves 14/11 · 21:00",
  venue: "Cancha 3, Club Atlético Parque Chacabuco",
  costMinor: 5_400_000,
  players: 12,
  shareMinor: 450_000,
  blue: { name: "Azul", score: 7 },
  amber: { name: "Naranja", score: 5 },
};

export const scorers = [
  { name: "Juan Ignacio Fernández Etcheverry", team: "blue", goals: 3 },
  { name: "Tomi Bustos", team: "blue", goals: 2 },
  { name: "Facu Rinaldi", team: "amber", goals: 2 },
  { name: "Nico “el Ruso” Kowalczyk", team: "amber", goals: 2 },
] as const;

export const lineup = {
  blue: [
    "Juan Ignacio Fernández Etcheverry",
    "Tomi Bustos",
    "Mati López",
    "Gonza Pereyra",
    "Lucas Ferro",
    "Seba Duarte",
  ],
  amber: [
    "Facu Rinaldi",
    "Nico “el Ruso” Kowalczyk",
    "Pablo Iturbe",
    "Leo Saravia",
    "Martín Gómez",
    "Fran Ocampo",
  ],
};

export type ContributionState = "pagado" | "parcial" | "pendiente";

export const contributions: { name: string; paidMinor: number; state: ContributionState }[] = [
  { name: "Juan Ignacio Fernández Etcheverry", paidMinor: 450_000, state: "pagado" },
  { name: "Tomi Bustos", paidMinor: 450_000, state: "pagado" },
  { name: "Nico “el Ruso” Kowalczyk", paidMinor: 200_000, state: "parcial" },
  { name: "Leo Saravia", paidMinor: 0, state: "pendiente" },
  { name: "Fran Ocampo", paidMinor: 0, state: "pendiente" },
];

export const paidCount = 9;
