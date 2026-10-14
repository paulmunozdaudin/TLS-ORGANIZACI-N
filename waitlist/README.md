# Landing de lista de espera

Landing para captar la lista de espera de la app (match entre emprendedores de todo el mundo, al estilo Tinder) y medir la demanda por país, ciudad, perfil e intereses.
Next.js 16 (App Router) + Tailwind CSS 4 + Supabase.

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| Nombre de la marca, email de contacto, puestos por invitación, límite anti-spam | `src/config/site.ts` |
| Todos los textos, perfiles e ideas de ejemplo | `src/content/landing.ts` |
| Opciones del formulario, sectores, países y ciudades sugeridas | `src/content/options.ts` |
| Perfiles del mazo deslizable, zonas y textos del móvil | `src/content/landing.ts` (`deck`, `nearby`, `zones`, `swipe`) |
| Colores, tipografía y tallas | `src/app/globals.css` (bloque `:root` y `@theme`) |
| Orden de las secciones | `src/app/page.tsx` |
| Política de privacidad | `src/app/privacidad/page.tsx` (rellena los datos entre corchetes) |
| Tabla y funciones de Supabase | `supabase/schema.sql` |

## 1. Ejecutar en local

Requiere Node 20.9 o superior.

```bash
cd waitlist
npm install
cp .env.local.example .env.local   # y rellénalo (paso 3)
npm run dev                        # http://localhost:3000
```

Sin las variables de Supabase la página se ve igual, pero el formulario devuelve un error al enviarlo.

## 2. Crear la tabla en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.

Esto crea:

- **`waitlist`**: email (único, sin distinguir mayúsculas), país (código ISO), ciudad, `skill`, `seeking`,
  `interests` (sectores, opcional), código de invitación,
  quién le invitó, fecha de aceptación de la privacidad, IP cifrada y fecha de alta.
  Tiene RLS activado y ninguna política, así que desde el navegador no se puede leer ni escribir:
  solo el servidor de la web, con la clave `service_role`.
- **`waitlist_position(code, boost)`**: calcula el puesto de cada persona (orden de llegada; cada
  invitado sube `boost` puestos a quien le invitó).
- Vistas para ver la demanda:

```sql
select * from waitlist_by_country;
select * from waitlist_by_city;
select * from waitlist_by_profile;
select * from waitlist_by_interest;
```

Si ya habías ejecutado una versión anterior del archivo, vuelve a ejecutarlo entero: añade las
columnas nuevas sin borrar los registros.

## 3. Variables de entorno

| Variable | Dónde se saca | Obligatoria |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase > Project Settings > API > Project URL | Sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` (secreta) | Sí |
| `IP_HASH_SALT` | Cualquier texto aleatorio (`openssl rand -hex 16`) | Recomendada |
| `NEXT_PUBLIC_SITE_URL` | La URL pública, p. ej. `https://tudominio.com` | Solo con dominio propio |

La clave `service_role` salta las políticas de seguridad: no la pongas nunca en una variable
`NEXT_PUBLIC_` ni la subas al repositorio.

## 4. Publicar en Vercel

1. En [vercel.com/new](https://vercel.com/new) importa este repositorio.
2. En **Root Directory** elige `waitlist` (el resto del repo es otra app).
3. Añade las variables del paso 3 en **Environment Variables**.
4. Pulsa **Deploy**. Si luego conectas un dominio, pon su URL en `NEXT_PUBLIC_SITE_URL` y vuelve a desplegar.

## Cómo funciona el formulario

- Validación en el navegador y otra vez en el servidor (Server Action en `src/app/actions.ts`).
- Anti-spam: campo trampa oculto, tiempo mínimo de relleno y un máximo de registros por IP y hora
  (la IP se guarda cifrada, nunca en claro).
- Si el email ya estaba, no se duplica: se le muestra su puesto y su enlace.
- Tras apuntarse, cada persona recibe un enlace `/?ref=código`. Quien entra por ese enlace queda
  registrado como invitado suyo, aunque se apunte más tarde desde la misma pestaña o navegador.

## La demo del móvil

En la portada, el móvil es un mazo de perfiles que se desliza de verdad: arrastrando la tarjeta
(ratón o dedo), con los botones o con las flechas del teclado. Tiene filtro de zona (Mi barrio,
Mi ciudad, Mundo) y de intereses por sector. Lo que la persona marca en el formulario reordena el
mazo (primero quien busca lo que ella sabe hacer) y sus intereses se aplican como filtro.

## Contenido de ejemplo

Los perfiles e ideas de los mockups (Amara, Lucas, la tienda de muebles…) son ejemplos para que se
entienda la app; no son usuarios reales. Están todos en `src/content/landing.ts`.
