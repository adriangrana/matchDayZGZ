import type { Team } from "@/src/domain/models";

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function abbreviation(name: string): string {
  if (name === "Real Zaragoza") return "RZ";
  if (name === "Villarreal CF \"B\"") return "VIB";
  const words = name
    .replace(/\b(?:CF|FC|AD|CD|SD|UD|UE|de|la|el)\b/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  const value =
    words.length === 1
      ? words[0]!.slice(0, 3)
      : words.map((word) => word[0]).join("").slice(0, 3);
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function shortName(name: string): string {
  return name
    .replace("Real Zaragoza", "Zaragoza")
    .replace("Hércules de Alicante CF", "Hércules")
    .replace("Juventud de Torremolinos CF", "Juv. Torremolinos")
    .replace("Gimnàstic de Tarragona", "Gimnàstic")
    .replace("Villarreal CF \"B\"", "Villarreal B")
    .replace("Real Madrid Castilla", "R. Madrid Castilla")
    .replace("CF Rayo Majadahonda", "Rayo Majadahonda");
}

export const groupTwoTeamNames = [
  "Águilas FC",
  "AD Alcorcón",
  "Algeciras CF",
  "FC Cartagena",
  "Atlético Madrileño",
  "Juventud de Torremolinos CF",
  "Antequera CF",
  "UD Ibiza",
  "CE Europa",
  "Real Jaén CF",
  "Hércules de Alicante CF",
  "Real Murcia CF",
  "SD Huesca",
  "UE Sant Andreu",
  "CF Rayo Majadahonda",
  "Villarreal CF \"B\"",
  "Gimnàstic de Tarragona",
  "Real Zaragoza",
  "CD Teruel",
  "Real Madrid Castilla",
] as const;

export const groupTwoTeams: Team[] = groupTwoTeamNames.map((name) => ({
  id: name === "Real Zaragoza" ? "real-zaragoza" : slug(name),
  name,
  shortName: shortName(name),
  abbreviation: abbreviation(name),
}));

function comparable(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[“”"]/g, "")
    .replace(/\b(?:sad|s a d)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const aliases = new Map<string, Team>();
for (const team of groupTwoTeams) {
  aliases.set(comparable(team.name), team);
  aliases.set(comparable(team.shortName), team);
}

[
  ["Águilas", "Águilas FC"],
  ["Alcorcón", "AD Alcorcón"],
  ["Algeciras", "Algeciras CF"],
  ["Cartagena", "FC Cartagena"],
  ["Juventud Torremolinos", "Juventud de Torremolinos CF"],
  ["Ibiza", "UD Ibiza"],
  ["Real Jaén", "Real Jaén CF"],
  ["Hércules", "Hércules de Alicante CF"],
  ["Murcia", "Real Murcia CF"],
  ["Huesca", "SD Huesca"],
  ["Sant Andreu", "UE Sant Andreu"],
  ["Rayo Majadahonda", "CF Rayo Majadahonda"],
  ["Villarreal B", "Villarreal CF \"B\""],
  ["Gimnàstic", "Gimnàstic de Tarragona"],
  ["Nàstic", "Gimnàstic de Tarragona"],
  ["Zaragoza", "Real Zaragoza"],
  ["Teruel", "CD Teruel"],
  ["Real Madrid B", "Real Madrid Castilla"],
].forEach(([alias, canonical]) => {
  const team = groupTwoTeams.find((candidate) => candidate.name === canonical);
  if (team) aliases.set(comparable(alias), team);
});

export function resolveGroupTwoTeam(value: string): Team | undefined {
  return aliases.get(comparable(value));
}

export function requireGroupTwoTeam(value: string): Team {
  const team = resolveGroupTwoTeam(value);
  if (!team) throw new Error(`Equipo del Grupo II no reconocido: ${value}`);
  return team;
}

export function normalizeTeamName(value: string): string {
  return comparable(value);
}
