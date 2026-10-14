import { BRAND } from "@/config/site";
import type { Skill } from "./options";

/**
 * Todos los textos de la landing. Los perfiles e ideas son ejemplos que
 * ilustran la app dentro de los mockups: no son usuarios reales.
 */

export const hero = {
  // Cada elemento es una línea del titular (el corte de línea es intencionado).
  title: ["Encuentra con", "quién emprender."],
  lead: "La app para conocer a gente de 18 a 30 años que también quiere montar algo, en tu ciudad y en tu sector.",
  formNote: "Llega pronto a España. Apúntate y entras de los primeros.",
  phoneCaption: "Así sería tu primer match, según lo que marques.",
  topLink: { label: "Cómo funciona", href: "#personas" },
};

export const statement = {
  // Las miniaturas ({ thumb }) se colocan dentro de la frase, entre palabras.
  parts: [
    { text: "En Sevilla" },
    { thumb: "S", label: "Samuel, ventas" },
    { text: "alguien tiene una idea y nadie que la programe. En Bilbao" },
    { thumb: "I", label: "Iker, desarrollo" },
    { text: "alguien programa sin saber qué construir. Los juntamos." },
  ] as ({ text: string } | { thumb: string; label: string })[],
};

export const people = {
  id: "personas",
  title: "Gente con ganas, cerca de ti.",
  text: "Dices qué sabes hacer y qué te falta. Te enseñamos a quien encaja contigo: su ciudad, lo que busca y en qué anda metido.",
  columns: { city: "Ciudad", skill: "Sabe de", seeking: "Busca" },
  openIndex: 3,
  rows: [
    { name: "Marta", age: 23, city: "Valencia", skill: "Diseño", seeking: "Cofundador", detail: "Diseña mochilas con lonas de toldos viejos. Tiene el prototipo y le falta quien lleve los números." },
    { name: "Iker", age: 27, city: "Bilbao", skill: "Desarrollo", seeking: "Una idea", detail: "Programa apps desde los 16. Busca un problema que merezca la pena y alguien que sepa venderlo." },
    { name: "Nerea", age: 21, city: "Madrid", skill: "Marketing", seeking: "Colaboradores", detail: "Lleva las redes de tres bares de Lavapiés. Quiere montar su propia agencia con dos personas más." },
    { name: "Samuel", age: 25, city: "Sevilla", skill: "Ventas", seeking: "Cofundador", detail: "Vende muebles restaurados por Instagram y quiere su propia tienda online. Le falta alguien que programe." },
    { name: "Lucía", age: 29, city: "Barcelona", skill: "Finanzas", seeking: "Networking", detail: "Trabaja en un banco y quiere conocer a gente que esté montando algo de pagos o ahorro." },
    { name: "Pablo", age: 19, city: "Zaragoza", skill: "Contenido", seeking: "Aprender", detail: "Graba vídeos de rutas en bici. Quiere aprender a convertirlo en algo que dé dinero." },
    { name: "Aitana", age: 24, city: "Málaga", skill: "Desarrollo", seeking: "Cofundador", detail: "Ingeniera en una consultora. Busca a alguien con una idea clara para dedicarle las tardes." },
    { name: "Hugo", age: 26, city: "Granada", skill: "Diseño", seeking: "Colaboradores", detail: "Hace identidades para marcas pequeñas. Busca proyectos donde entrar desde el principio." },
  ],
};

export const ideas = {
  id: "ideas",
  titleSoft: "Cuenta tu idea.",
  titleStrong: "Sin tener empresa.",
  text: "Publica lo que tienes en la cabeza, aunque esté a medias. Otros lo leen, opinan y, si les encaja, se ofrecen a montarlo contigo.",
  action: "Quiero publicar la mía",
  seekingLabel: "Busca",
  tabs: [
    {
      sector: "IA",
      items: [
        { title: "Un asistente que contesta los WhatsApp de una peluquería", note: "Citas y cambios sin que nadie coja el móvil.", seeking: "Desarrollo", author: "Alba", city: "Murcia" },
        { title: "Un corrector de TFG que explica cada fallo", note: "Para aprender en vez de copiar.", seeking: "Diseño", author: "Dani", city: "Salamanca" },
        { title: "Precios que bajan solos en la frutería del barrio", note: "Lo que caduca mañana, más barato hoy.", seeking: "Ventas", author: "Rocío", city: "Córdoba" },
      ],
    },
    {
      sector: "E-commerce",
      items: [
        { title: "Tienda online de muebles restaurados", note: "Ya vendo por redes, quiero web propia.", seeking: "Desarrollo", author: "Samuel", city: "Sevilla" },
        { title: "Cajas de producto gallego para quien vive fuera", note: "Pulpo, queso y pan de Cea, a cualquier ciudad.", seeking: "Marketing", author: "Uxía", city: "A Coruña" },
        { title: "Recambios de bici de segunda mano, revisados", note: "Con garantía de tres meses.", seeking: "Cofundador", author: "Marc", city: "Girona" },
      ],
    },
    {
      sector: "Moda",
      items: [
        { title: "Ropa de segunda mano para festivales", note: "Se compra en junio, se revende en septiembre.", seeking: "Contenido", author: "Lucía", city: "Valencia" },
        { title: "Arreglos de ropa a domicilio, en bici", note: "Recogida el lunes, entrega el jueves.", seeking: "Finanzas", author: "Inés", city: "Madrid" },
        { title: "Zapatillas hechas en Elche, por encargo", note: "Tiradas cortas con fábricas de la zona.", seeking: "Diseño", author: "Jorge", city: "Elche" },
      ],
    },
    {
      sector: "Fintech",
      items: [
        { title: "Cuentas compartidas para pisos de estudiantes", note: "Luz, internet y la compra, sin perseguir a nadie.", seeking: "Desarrollo", author: "Álvaro", city: "Madrid" },
        { title: "Ahorro automático redondeando cada pago", note: "Los céntimos van a una hucha aparte.", seeking: "Finanzas", author: "Carla", city: "Valladolid" },
        { title: "Facturas en un minuto para nuevos autónomos", note: "Desde el móvil, con el IVA ya calculado.", seeking: "Ventas", author: "Sergio", city: "Alicante" },
      ],
    },
    {
      sector: "Marketing",
      items: [
        { title: "Vídeos cortos para bares, por suscripción", note: "Cuatro vídeos al mes, grabados en el local.", seeking: "Contenido", author: "Paula", city: "Cádiz" },
        { title: "Una newsletter de empleo en startups españolas", note: "Cada lunes, solo ofertas con sueldo publicado.", seeking: "Colaboradores", author: "Rubén", city: "Valencia" },
        { title: "Fotos de producto para tiendas pequeñas", note: "Un día de estudio al mes, a precio fijo.", seeking: "Ventas", author: "Ane", city: "San Sebastián" },
      ],
    },
  ],
};

export const communities = {
  id: "comunidades",
  title: "Entra en tu sector.",
  text: "Comunidades para preguntar, contar lo que te funciona y enterarte de quién está montando qué. Puedes estar en varias.",
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
  text: "Abrimos ciudad a ciudad, empezando por donde más gente se apunte. Te escribimos cuando llegue a la tuya, y solo para eso.",
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
  city: { label: "Tu ciudad", placeholder: "Madrid, Vigo, Cádiz…" },
  skill: "Qué sabes hacer",
  seeking: "Qué buscas",
  privacy: "He leído y acepto la",
  privacyLink: "política de privacidad",
  submit: "Apuntarme a la lista",
  loading: "Apuntándote…",
  errors: {
    email: "Escribe un email válido.",
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
    shareText: `Me he apuntado a ${BRAND}, una app para conocer a gente que quiere emprender. Apúntate con mi enlace:`,
  },
};

/**
 * Perfiles que enseña el móvil de la portada. Se elige uno que complementa
 * lo que el visitante dice que sabe hacer.
 */
export type MatchProfile = {
  name: string;
  age: number;
  skill: string;
  idea: string;
};

export const matchProfiles: Record<Exclude<Skill, "otro">, MatchProfile> = {
  desarrollo: { name: "Iker", age: 26, skill: "Desarrollo", idea: "App para reservar pistas de pádel que quedan libres a última hora." },
  diseno: { name: "Marta", age: 23, skill: "Diseño", idea: "Mochilas hechas con lonas de toldos viejos. Ya tiene el prototipo." },
  marketing: { name: "Nerea", age: 24, skill: "Marketing", idea: "Clases de cocina para gente que acaba de independizarse." },
  ventas: { name: "Samuel", age: 25, skill: "Ventas", idea: "Tienda online de muebles restaurados. Ya vende por redes." },
  finanzas: { name: "Lucía", age: 28, skill: "Finanzas", idea: "Una gestoría en el móvil para quien empieza como autónomo." },
  contenido: { name: "Pablo", age: 21, skill: "Contenido", idea: "Guías en vídeo de rutas en bici por la sierra." },
};

/** Para cada habilidad del visitante, qué perfil le complementa. */
export const complementOf: Record<Skill, Exclude<Skill, "otro">> = {
  desarrollo: "ventas",
  diseno: "desarrollo",
  marketing: "desarrollo",
  ventas: "desarrollo",
  finanzas: "diseno",
  contenido: "marketing",
  otro: "diseno",
};
