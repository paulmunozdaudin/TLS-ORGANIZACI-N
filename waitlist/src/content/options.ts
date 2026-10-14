/** Opciones del formulario. El `value` es lo que se guarda en Supabase. */
export const SKILLS = [
  { value: "desarrollo", label: "Desarrollo" },
  { value: "diseno", label: "Diseño" },
  { value: "marketing", label: "Marketing" },
  { value: "ventas", label: "Ventas" },
  { value: "finanzas", label: "Finanzas" },
  { value: "contenido", label: "Contenido" },
  { value: "otro", label: "Otra cosa" },
] as const;

export const SEEKING = [
  { value: "cofundador", label: "Cofundador" },
  { value: "colaboradores", label: "Colaboradores" },
  { value: "aprender", label: "Aprender" },
  { value: "networking", label: "Networking" },
  { value: "idea", label: "Compartir una idea" },
] as const;

export type Skill = (typeof SKILLS)[number]["value"];
export type Seeking = (typeof SEEKING)[number]["value"];

export const SKILL_VALUES = SKILLS.map((s) => s.value) as readonly string[];
export const SEEKING_VALUES = SEEKING.map((s) => s.value) as readonly string[];

/** Sugerencias del campo ciudad (se puede escribir cualquier otra). */
export const CITIES = [
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Zaragoza", "Málaga",
  "Murcia", "Palma", "Las Palmas de Gran Canaria", "Bilbao", "Alicante",
  "Córdoba", "Valladolid", "Vigo", "Gijón", "A Coruña", "Granada",
  "Vitoria-Gasteiz", "Elche", "Santa Cruz de Tenerife", "Oviedo",
  "Pamplona", "Santander", "San Sebastián", "Salamanca", "Cádiz",
  "Girona", "Tarragona", "Castellón", "Almería", "Burgos", "León",
];
