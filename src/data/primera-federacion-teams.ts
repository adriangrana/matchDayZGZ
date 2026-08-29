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

export const groupOneTeamNames = [
  "Arenas Club",
  "Racing Club Ferrol",
  "Barakaldo CF",
  "CyD Leonesa",
  "CP Cacereño",
  "CD Mirandés",
  "AD Mérida",
  "RC Deportivo Fabril",
  "UD Ourense",
  "SD Ponferradina",
  "Real Avilés Industrial",
  "Pontevedra CF",
  "Real Unión Club",
  "CD Coria",
  "UD Logroñés",
  "CD Extremadura",
  "Unionistas de Salamanca CF",
  "CD Lugo",
  "Zamora CF",
  'Athletic Club "B"',
] as const;

export const groupOneTeams: Team[] = groupOneTeamNames.map((name) => ({
  id: slug(name),
  name,
  shortName: name
    .replace("Racing Club Ferrol", "Racing Ferrol")
    .replace("RC Deportivo Fabril", "Depor Fabril")
    .replace("Real Avilés Industrial", "Real Avilés")
    .replace("Unionistas de Salamanca CF", "Unionistas")
    .replace('Athletic Club "B"', "Athletic B"),
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

const groupOneAliases = new Map<string, Team>();
for (const team of groupOneTeams) {
  groupOneAliases.set(comparable(team.name), team);
  groupOneAliases.set(comparable(team.shortName), team);
}

export const groupOneTeamAliases: Record<string, string[]> = {
  "barakaldo-cf": ["Barakaldo"],
  "racing-club-ferrol": ["Racing Ferrol", "Racing Club de Ferrol"],
  "cyd-leonesa": ["Cultural y Deportiva Leonesa", "Cultural Leonesa"],
  "cp-cacereno": ["CP Cacereño", "Cacereño"],
  "cd-mirandes": ["CD Mirandés", "Mirandés"],
  "ad-merida": ["AD Mérida", "Mérida"],
  "rc-deportivo-fabril": ["Deportivo Fabril", "RC Deportivo"],
  "ud-ourense": ["Ourense CF", "Ourense"],
  "sd-ponferradina": ["Ponferradina"],
  "real-aviles-industrial": ["Real Avilés", "Real Avilés Industrial"],
  "pontevedra-cf": ["Pontevedra"],
  "real-union-club": ["Real Unión", "Real Union Club"],
  "cd-coria": ["Coria CF", "Coria"],
  "ud-logrones": ["Logroñés", "UD Logroñés"],
  "cd-extremadura": ["Extremadura UD", "Extremadura"],
  "unionistas-de-salamanca-cf": ["Unionistas", "Unionistas de Salamanca"],
  "cd-lugo": ["Lugo"],
  "zamora-cf": ["Zamora"],
  "athletic-club-b": ["Athletic B", "Athletic Club B", "Bilbao Athletic", "Athletic Bilbao"],
};

for (const [teamId, teamAliases] of Object.entries(groupOneTeamAliases)) {
  const team = groupOneTeams.find((candidate) => candidate.id === teamId);
  if (!team) continue;
  teamAliases.forEach((alias) => groupOneAliases.set(comparable(alias), team));
}

export const groupTwoTeamAliases: Record<string, string[]> = {
  "aguilas-fc": ["Águilas", "Aguilas FC", "Águilas Fútbol Club"],
  "ad-alcorcon": ["Alcorcón", "AD Alcorcon"],
  "algeciras-cf": ["Algeciras", "Algeciras Club de Fútbol"],
  "fc-cartagena": ["Cartagena", "Fútbol Club Cartagena"],
  "atletico-madrileno": [
    "Atletico Madrileno",
    "Atlético Madrid B",
    "Club Atlético de Madrid B",
  ],
  "juventud-de-torremolinos-cf": [
    "Juventud Torremolinos",
    "Juventud de Torremolinos CF",
  ],
  "antequera-cf": ["Antequera"],
  "ud-ibiza": ["Ibiza", "Unión Deportiva Ibiza"],
  "ce-europa": ["Europa"],
  "real-jaen-cf": ["Real Jaén", "Real Jaen CF"],
  "hercules-de-alicante-cf": ["Hércules", "Hercules CF"],
  "real-murcia-cf": ["Murcia", "Real Murcia"],
  "sd-huesca": ["Huesca", "Sociedad Deportiva Huesca"],
  "ue-sant-andreu": ["Sant Andreu", "Unió Esportiva Sant Andreu"],
  "cf-rayo-majadahonda": ["Rayo Majadahonda"],
  "villarreal-cf-b": ["Villarreal B"],
  "gimnastic-de-tarragona": [
    "Gimnàstic",
    "Gimnastic de Tarragona",
    "Nàstic",
  ],
  "real-zaragoza": ["Zaragoza"],
  "cd-teruel": ["Teruel", "Club Deportivo Teruel"],
  "real-madrid-castilla": ["Real Madrid B"],
};

for (const [teamId, teamAliases] of Object.entries(groupTwoTeamAliases)) {
  const team = groupTwoTeams.find((candidate) => candidate.id === teamId);
  if (!team) continue;
  teamAliases.forEach((alias) => aliases.set(comparable(alias), team));
}

export function resolveGroupTwoTeam(value: string): Team | undefined {
  return aliases.get(comparable(value));
}

export function requireGroupTwoTeam(value: string): Team {
  const team = resolveGroupTwoTeam(value);
  if (!team) throw new Error(`Equipo del Grupo II no reconocido: ${value}`);
  return team;
}

export function resolveGroupOneTeam(value: string): Team | undefined {
  return groupOneAliases.get(comparable(value));
}

export function requireGroupOneTeam(value: string): Team {
  const team = resolveGroupOneTeam(value);
  if (!team) throw new Error(`Equipo del Grupo I no reconocido: ${value}`);
  return team;
}

export function normalizeTeamName(value: string): string {
  return comparable(value);
}
