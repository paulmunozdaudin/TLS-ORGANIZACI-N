import { BRAND } from "@/config/site";
import type { Sector, Skill } from "./options";

/**
 * Todos los textos de la landing. Los perfiles e ideas son ejemplos que
 * ilustran la app dentro de los mockups: no son usuarios reales.
 */

export const hero = {
  // Cada elemento es una línea del titular (el corte de línea es intencionado).
  title: ["Haz match con", "quien emprende."],
  lead: "Desliza perfiles de gente que emprende en tu barrio o en la otra punta del mundo. Si os interesáis los dos, hacéis match.",
  formNote: "Abrimos por fases. Apúntate y entras de los primeros.",
  phoneCaption: "Pruébalo: arrastra la tarjeta o usa los botones.",
  topLink: { label: "Cómo funciona", href: "#personas" },
};

export const statement = {
  // Las miniaturas ({ thumb }) se colocan dentro de la frase, entre palabras.
  parts: [
    { text: "En Lagos" },
    { thumb: "A", label: "Amara, desarrollo" },
    { text: "alguien programa sin saber qué construir. En São Paulo" },
    { thumb: "L", label: "Lucas, ventas" },
    { text: "alguien tiene clientes y nadie que le haga la web. Un swipe y se conocen." },
  ] as ({ text: string } | { thumb: string; label: string })[],
};

export const people = {
  id: "personas",
  title: "Desliza y haz match.",
  text: "Filtra por intereses y por zona: tu barrio, tu ciudad o cualquier país. Ves qué sabe hacer cada persona y qué busca; a la derecha si te interesa, y si es mutuo, hacéis match.",
  columns: { city: "Desde", skill: "Sabe de", seeking: "Busca" },
  openIndex: 3,
  rows: [
    { name: "Mei", age: 22, city: "Taipéi", skill: "Diseño", seeking: "Cofundador", detail: "Diseña mochilas con lonas de toldos viejos. Tiene el prototipo y le falta quien lleve los números." },
    { name: "Arjun", age: 26, city: "Bangalore", skill: "Desarrollo", seeking: "Una idea", detail: "Programa apps desde los 16. Busca un problema que merezca la pena y alguien que sepa venderlo." },
    { name: "Diego", age: 25, city: "Ciudad de México", skill: "Marketing", seeking: "Colaboradores", detail: "Lleva las redes de tres restaurantes. Quiere montar su propia agencia con dos personas más." },
    { name: "Lucas", age: 27, city: "São Paulo", skill: "Ventas", seeking: "Cofundador", detail: "Vende muebles restaurados por redes y quiere su propia tienda online. Le falta alguien que programe." },
    { name: "Lena", age: 28, city: "Berlín", skill: "Finanzas", seeking: "Networking", detail: "Trabaja en un banco y quiere conocer a gente que esté montando algo de pagos o ahorro." },
    { name: "Sofía", age: 23, city: "Madrid", skill: "Contenido", seeking: "Aprender", detail: "Graba vídeos de rutas en bici. Quiere aprender a convertirlo en algo que dé dinero." },
    { name: "Amara", age: 24, city: "Lagos", skill: "Desarrollo", seeking: "Cofundador", detail: "Ingeniera en una fintech. Busca a alguien con clientes para dedicarle las tardes a algo propio." },
    { name: "Youssef", age: 29, city: "Casablanca", skill: "Ventas", seeking: "Colaboradores", detail: "Exporta cerámica artesanal a tiendas de Europa. Busca quien le monte la tienda online." },
  ],
};

export const ideas = {
  id: "ideas",
  titleSoft: "Cuenta tu idea.",
  titleStrong: "Sin tener empresa.",
  text: "Publica lo que tienes en la cabeza, aunque esté a medias. Lo leen personas de otros países, opinan y, si les encaja, se ofrecen a montarlo contigo.",
  action: "Quiero publicar la mía",
  seekingLabel: "Busca",
  tabs: [
    {
      sector: "IA",
      items: [
        { title: "Un asistente que contesta los mensajes de una peluquería", note: "Citas y cambios sin que nadie coja el móvil.", seeking: "Desarrollo", author: "Alba", city: "Valencia" },
        { title: "Un corrector de trabajos de fin de grado que explica cada fallo", note: "Para aprender en vez de copiar.", seeking: "Diseño", author: "Kenji", city: "Osaka" },
        { title: "Precios que bajan solos en la frutería del barrio", note: "Lo que caduca mañana, más barato hoy.", seeking: "Ventas", author: "Camila", city: "Bogotá" },
      ],
    },
    {
      sector: "E-commerce",
      items: [
        { title: "Tienda online de muebles restaurados", note: "Ya vendo por redes, quiero web propia.", seeking: "Desarrollo", author: "Lucas", city: "São Paulo" },
        { title: "Cajas de comida de casa para quien vive en otro país", note: "Lo que echas de menos, en tu puerta.", seeking: "Marketing", author: "Joana", city: "Lisboa" },
        { title: "Recambios de bici de segunda mano, revisados", note: "Con garantía de tres meses.", seeking: "Cofundador", author: "Marc", city: "Ámsterdam" },
      ],
    },
    {
      sector: "Moda",
      items: [
        { title: "Ropa de segunda mano para festivales", note: "Se compra en junio, se revende en septiembre.", seeking: "Contenido", author: "Chloé", city: "París" },
        { title: "Arreglos de ropa a domicilio, en bici", note: "Recogida el lunes, entrega el jueves.", seeking: "Finanzas", author: "Inés", city: "Buenos Aires" },
        { title: "Zapatillas por encargo con fábricas pequeñas", note: "Tiradas cortas, hechas cerca.", seeking: "Diseño", author: "Jorge", city: "Lima" },
      ],
    },
    {
      sector: "Fintech",
      items: [
        { title: "Cuentas compartidas para pisos de estudiantes", note: "Luz, internet y la compra, sin perseguir a nadie.", seeking: "Desarrollo", author: "Álvaro", city: "Madrid" },
        { title: "Pagos con el móvil para tiendas que aún cobran en efectivo", note: "Sin datáfono y sin comisiones fijas.", seeking: "Ventas", author: "Amara", city: "Lagos" },
        { title: "Facturas en un minuto para nuevos freelance", note: "Desde el móvil, con los impuestos ya calculados.", seeking: "Finanzas", author: "Lena", city: "Berlín" },
      ],
    },
    {
      sector: "Marketing",
      items: [
        { title: "Vídeos cortos para bares, por suscripción", note: "Cuatro vídeos al mes, grabados en el local.", seeking: "Contenido", author: "Diego", city: "Ciudad de México" },
        { title: "Una newsletter de empleo en startups con sueldo publicado", note: "Cada lunes, ofertas en remoto de todo el mundo.", seeking: "Colaboradores", author: "Rubén", city: "Montevideo" },
        { title: "Fotos de producto para tiendas pequeñas", note: "Un día de estudio al mes, a precio fijo.", seeking: "Ventas", author: "Nadia", city: "Nairobi" },
      ],
    },
  ],
};

export const communities = {
  id: "comunidades",
  title: "Entra en tu sector.",
  text: "Comunidades de todo el mundo para preguntar, contar lo que te funciona y enterarte de quién está montando qué. Puedes estar en varias.",
  searchLabel: "Busca un sector",
  empty: "Todavía no hay comunidad para eso. Si se apunta gente suficiente, la abrimos.",
  items: [
    { name: "E-commerce", text: "Tiendas online, logística y marketplaces. Lo que se vende con un clic." },
    { name: "Inteligencia artificial", text: "Producto, automatizaciones y gente probando modelos en negocios de verdad." },
    { name: "Marketing", text: "Captación, marca y anuncios. Lo que trae clientes y lo que solo gasta." },
    { name: "Moda", text: "Marcas pequeñas, segunda mano y producción cerca de casa." },
    { name: "Fintech", text: "Pagos, ahorro e inversión. Herramientas para autónomos." },
    { name: "Contenido", text: "Vídeo, podcasts y newsletters. Cómo vivir de lo que publicas." },
    { name: "Comida", text: "Hostelería, producto local y reparto." },
    { name: "Sostenibilidad", text: "Reciclaje, energía y negocios que dejan menos huella." },
  ],
};

export const closing = {
  title: ["Te guardamos", "sitio."],
  text: "Abrimos por fases, empezando por los países donde más gente se apunte. Te escribimos cuando llegue al tuyo, y solo para eso.",
  dialogTitle: "Apúntate a la lista",
};

export const footer = {
  tagline: `${BRAND}. Para gente que quiere montar algo.`,
  links: [
    { label: "Apuntarme", href: "#lista" },
    { label: "Privacidad", href: "/privacidad" },
  ],
};

export const form = {
  email: { label: "Tu email", placeholder: "nombre@email.com" },
  country: { label: "Tu país", placeholder: "Elige país" },
  city: { label: "Tu ciudad", placeholder: "Lisboa, Bogotá…" },
  skill: "Qué sabes hacer",
  seeking: "Qué buscas",
  interests: "Qué te interesa (opcional)",
  privacy: "He leído y acepto la",
  privacyLink: "política de privacidad",
  submit: "Apuntarme a la lista",
  loading: "Apuntándote…",
  errors: {
    email: "Escribe un email válido.",
    country: "Elige tu país.",
    city: "Dinos en qué ciudad estás.",
    skill: "Elige qué sabes hacer.",
    seeking: "Elige qué buscas.",
    privacy: "Necesitamos que aceptes la política de privacidad.",
    rate: "Has hecho demasiados intentos. Prueba de nuevo en un rato.",
    generic: "No hemos podido apuntarte. Prueba otra vez en unos segundos.",
    summary: "Revisa los campos marcados.",
  },
  success: {
    title: "Ya estás dentro.",
    already: "Ya estabas en la lista.",
    position: (n: number) => `Vas en el puesto ${n.toLocaleString("es-ES")}.`,
    share: (boost: number) =>
      `Cada persona que se apunte con tu enlace te sube ${boost} puestos.`,
    linkLabel: "Tu enlace personal",
    copy: "Copiar",
    copied: "Copiado",
    whatsapp: "Enviar por WhatsApp",
    shareText: `Me he apuntado a ${BRAND}, una app para hacer match con gente que emprende en todo el mundo. Apúntate con mi enlace:`,
  },
};

/**
 * Mazo de perfiles del móvil de la portada. El orden se adapta a lo que el
 * visitante marca en el formulario (primero quien busca lo que sabe hacer).
 */
export type SwipeProfile = {
  name: string;
  age: number;
  city: string;
  country: string; // código ISO
  skill: Exclude<Skill, "otro">;
  seeks: Exclude<Skill, "otro">;
  sector: Sector;
  idea: string;
  languages: string;
  /** Solo en perfiles cercanos: distancia en km a la ciudad del visitante. */
  km?: number;
};

export const deck: SwipeProfile[] = [
  { name: "Amara", age: 24, city: "Lagos", country: "NG", skill: "desarrollo", seeks: "ventas", sector: "fintech", idea: "Pagos con el móvil para tiendas de barrio que aún cobran en efectivo.", languages: "inglés y yoruba" },
  { name: "Lucas", age: 27, city: "São Paulo", country: "BR", skill: "ventas", seeks: "desarrollo", sector: "ecommerce", idea: "Tienda online de muebles restaurados. Ya vende por redes.", languages: "portugués y español" },
  { name: "Mei", age: 22, city: "Taipéi", country: "TW", skill: "diseno", seeks: "finanzas", sector: "moda", idea: "Mochilas hechas con lonas de toldos viejos. Ya tiene el prototipo.", languages: "chino e inglés" },
  { name: "Diego", age: 25, city: "Ciudad de México", country: "MX", skill: "marketing", seeks: "desarrollo", sector: "comida", idea: "Clases de cocina para gente que acaba de independizarse.", languages: "español e inglés" },
  { name: "Lena", age: 28, city: "Berlín", country: "DE", skill: "finanzas", seeks: "diseno", sector: "fintech", idea: "Una gestoría en el móvil para quien empieza como freelance.", languages: "alemán, inglés y español" },
  { name: "Arjun", age: 26, city: "Bangalore", country: "IN", skill: "desarrollo", seeks: "marketing", sector: "ia", idea: "Reservas de última hora en gimnasios con plazas libres.", languages: "inglés e hindi" },
  { name: "Sofía", age: 23, city: "Madrid", country: "ES", skill: "contenido", seeks: "ventas", sector: "contenido", idea: "Guías en vídeo de rutas en bici por media Europa.", languages: "español e inglés" },
  { name: "Youssef", age: 29, city: "Casablanca", country: "MA", skill: "ventas", seeks: "contenido", sector: "ecommerce", idea: "Cerámica artesanal vendida directamente a tiendas de Europa.", languages: "árabe, francés y español" },
];

/** Perfiles cercanos: aparecen en la ciudad que escriba el visitante. */
export const nearby: SwipeProfile[] = [
  { name: "Nuria", age: 24, city: "", country: "", km: 0.4, skill: "diseno", seeks: "desarrollo", sector: "moda", idea: "Arreglos de ropa a domicilio, en bici.", languages: "español e inglés" },
  { name: "Javi", age: 27, city: "", country: "", km: 1.1, skill: "desarrollo", seeks: "marketing", sector: "ia", idea: "Un asistente que contesta los mensajes de las peluquerías del barrio.", languages: "español" },
  { name: "Carla", age: 21, city: "", country: "", km: 2.8, skill: "marketing", seeks: "ventas", sector: "comida", idea: "Menús de táper semanales para estudiantes.", languages: "español y catalán" },
  { name: "Óscar", age: 29, city: "", country: "", km: 6.5, skill: "finanzas", seeks: "desarrollo", sector: "fintech", idea: "Cuentas compartidas para pisos de estudiantes.", languages: "español e inglés" },
  { name: "Irene", age: 25, city: "", country: "", km: 9, skill: "contenido", seeks: "diseno", sector: "sostenibilidad", idea: "Un mapa de las tiendas a granel de la ciudad.", languages: "español" },
];

export const zones = [
  { value: "barrio", label: "Mi barrio", maxKm: 2 },
  { value: "ciudad", label: "Mi ciudad", maxKm: 15 },
  { value: "mundo", label: "Mundo", maxKm: Infinity },
] as const;

export type Zone = (typeof zones)[number]["value"];

export const swipe = {
  header: "Descubrir",
  ideaLabel: "Su idea",
  pass: "Pasar",
  connect: "Conectar",
  seeks: (skill: string) => `Busca a alguien de ${skill}.`,
  seeksYou: (skill: string) => `Busca a alguien de ${skill}, como tú.`,
  sent: (name: string) => `Le diremos a ${name} que te interesa.`,
  zoneLabel: "Zona",
  interestsLabel: "Intereses",
  away: (km: number) =>
    km < 1 ? `A ${Math.round(km * 1000)} m` : `A ${km.toLocaleString("es-ES", { maximumFractionDigits: 1 })} km`,
  yourCity: "tu ciudad",
  empty: {
    title: "Nadie con esos filtros todavía.",
    text: "Prueba a ampliar la zona o a quitar algún interés.",
  },
  match: {
    title: "Hacéis match",
    text: (name: string) => `A ${name} también le interesa lo que haces. Ya podéis hablar.`,
    write: "Apúntate para escribirle",
    keep: "Seguir deslizando",
  },
  end: {
    title: "Por hoy, eso es todo.",
    text: "Cada día aparecerían perfiles nuevos.",
    restart: "Volver a empezar",
  },
};
