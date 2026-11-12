// PROTOTYPE ONLY — mock data for /prototype/grupo. Worst-case content on purpose:
// long names, a 70-char email, a group name that never fits a top bar.

export type Role = "owner" | "leader" | "member";

export type Member = {
  membershipId: string;
  name: string;
  email: string;
  role: Role;
  linkedPlayer: string | null;
};

export type GroupSummary = { id: string; name: string; role: Role; members: number };

export type QuorumKey = "all_voted" | "half_plus_one" | "first_vote";

export const quorumOptions: { value: QuorumKey; label: string; hint: string }[] = [
  {
    value: "all_voted",
    label: "Cuando voten todos",
    hint: "El promedio aparece recién con el último voto.",
  },
  {
    value: "half_plus_one",
    label: "Con mitad más uno",
    hint: "Alcanza con que vote la mayoría de los que jugaron.",
  },
  {
    value: "first_vote",
    label: "Con el primer voto completo",
    hint: "Se revela apenas alguien vota a todos.",
  },
];

export const me = { name: "Valentín Lunaklick", email: "organizador@example.com" };

export const groups: GroupSummary[] = [
  { id: "g-jueves", name: "Fulbo de los jueves · Parque Chacabuco", role: "owner", members: 15 },
  { id: "g-oficina", name: "Los de la oficina", role: "member", members: 9 },
  {
    id: "g-domingo",
    name: "Domingo 8 a.m. en Costa Salguero (los que sobreviven al sábado)",
    role: "leader",
    members: 22,
  },
];

export const initialMembers: Member[] = [
  { membershipId: "m0", name: me.name, email: me.email, role: "owner", linkedPlayer: "Valentín" },
  {
    membershipId: "m1",
    name: "Juan Ignacio Fernández Etcheverry",
    email: "juanignacio.fernandez.etcheverry@estudiocontable-asociados.com.ar",
    role: "leader",
    linkedPlayer: "Juani",
  },
  {
    membershipId: "m2",
    name: "Mati Rossi",
    email: "mati.rossi@gmail.com",
    role: "leader",
    linkedPlayer: "Mati",
  },
  {
    membershipId: "m3",
    name: 'Facundo "el Tano" Bianchi',
    email: "tano@hotmail.com",
    role: "member",
    linkedPlayer: "Tano",
  },
  {
    membershipId: "m4",
    name: "Lucas Gómez",
    email: "lucasgomez91@gmail.com",
    role: "member",
    linkedPlayer: "Lucas",
  },
  {
    membershipId: "m5",
    name: "Santiago Pérez Aguirre",
    email: "santi.perez.aguirre@outlook.com",
    role: "member",
    linkedPlayer: "Santi",
  },
  {
    membershipId: "m6",
    name: "Nico",
    email: "nico@icloud.com",
    role: "member",
    linkedPlayer: "Nico",
  },
  {
    membershipId: "m7",
    name: "Franco Martínez",
    email: "fmartinez@empresa.com",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m8",
    name: "Tomás Álvarez",
    email: "tomi.alvarez@gmail.com",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m9",
    name: "Agustín López",
    email: "agus.lopez@yahoo.com.ar",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m10",
    name: "Ezequiel Ramírez",
    email: "eze.ramirez@gmail.com",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m11",
    name: "Bruno Sosa",
    email: "brunososa@gmail.com",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m12",
    name: "Gonzalo Díaz",
    email: "gonza.diaz@proton.me",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m13",
    name: "Martín Herrera",
    email: "martinherrera@gmail.com",
    role: "member",
    linkedPlayer: null,
  },
  {
    membershipId: "m14",
    name: "Pablo Castro",
    email: "pablocastro@gmail.com",
    role: "member",
    linkedPlayer: null,
  },
];

export const roleLabel: Record<Role, string> = {
  owner: "Responsable",
  leader: "Líder",
  member: "Miembro",
};

export const roleHint: Record<Role, string> = {
  owner: "Controla personas, invitaciones y ajustes del grupo.",
  leader: "Puede editar partidos, jugadores y canchas.",
  member: "Consulta partidos, deudas y estadísticas.",
};

const roleOrder: Record<Role, number> = { owner: 0, leader: 1, member: 2 };

export function sortMembers(members: Member[]) {
  return [...members].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name, "es"),
  );
}

export function joinUrl(generation: number) {
  return `https://hayfulbo.app/sumarse/eyJnZW5lcmF0aW9uIjo${generation}LCJncm91cElkIjoiZy1qdWV2ZXMifQ.G3QRwUp6GCUub`;
}

export const publicUrl = "https://hayfulbo.app/g/fulbo-jueves";
