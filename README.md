# TLS Organización

Herramienta interna colaborativa para organizar las reuniones semanales de la
company **TLS**. Cualquier persona con el enlace puede entrar, poner su
nombre y empezar a añadir temas, tareas, ideas y actas — todo en tiempo real
y compartido con el resto del equipo.

## 1. Qué incluye el proyecto

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**
- **Supabase** (Postgres + Realtime) como backend compartido — no hay
  localStorage como fuente de verdad, todos los usuarios ven los mismos datos.
- **Lucide Icons** para los iconos y **@hello-pangea/dnd** para el
  drag & drop.

### Estructura de archivos principal

```
supabase/schema.sql            Esquema SQL completo para Supabase (tablas, RLS, realtime)
.env.local.example             Plantilla de variables de entorno

src/lib/supabase/client.ts     Cliente de Supabase (browser)
src/lib/types.ts               Tipos TypeScript de todas las entidades
src/lib/user.ts                Nombre de usuario en localStorage + avatares
src/lib/activity.ts            Helper para registrar actividad
src/lib/date.ts                Formateo de fechas en español

src/hooks/useWorkspace.ts      Carga el workspace compartido "TLS"
src/hooks/useRealtimeList.ts   Hook genérico: fetch + suscripción realtime
src/hooks/usePresence.ts       Miembros conectados (Supabase Presence)
src/hooks/useCountdown.ts      Cuenta atrás hasta la próxima reunión

src/components/providers/UserProvider.tsx   Contexto del usuario + pantalla "¿Cómo te llamas?"
src/components/NameGate.tsx                 Modal de bienvenida
src/components/Header.tsx                   Cabecera con buscador y miembros conectados
src/components/NextMeetingHero.tsx          Bloque principal "Próxima reunión"
src/components/EditMeetingModal.tsx         Editar fecha/hora/lugar de la reunión

src/components/agenda/*        Agenda de la reunión (temas, prioridad, estado,
                                comentarios, votaciones, drag & drop, filtros)
src/components/tasks/*         Tablero Kanban de tareas (pendiente/en proceso/completada)
src/components/ideas/*         Ideas y temas para futuras reuniones
src/components/minutes/*       Actas de reuniones (crear + historial)
src/components/activity/*      Feed de actividad reciente del equipo
src/components/ui/*            Piezas reutilizables (Modal, Badges, Avatar, ConfirmDialog)

src/app/layout.tsx              Layout raíz (envuelve la app en UserProvider)
src/app/page.tsx                Dashboard principal, une todas las secciones
```

## 2. Cómo ejecutar el proyecto en local

```bash
npm install
cp .env.local.example .env.local   # y rellena con tus datos de Supabase (paso 3)
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La primera vez te pedirá
tu nombre (se guarda solo en tu navegador) y a partir de ahí verás el
dashboard compartido del workspace **TLS**.

Otros comandos útiles:

```bash
npm run build   # build de producción
npm run start   # servir el build de producción
npm run lint    # eslint
```

## 3. Cómo configurar Supabase

1. Crea una cuenta y un proyecto nuevo en [supabase.com](https://supabase.com)
   (el plan gratuito es más que suficiente para este uso).
2. En el panel del proyecto, ve a **SQL Editor** → **New query**.
3. Copia y pega el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql)
   y ejecútalo (**Run**). Esto crea:
   - Todas las tablas (`workspaces`, `next_meeting`, `agenda_items`,
     `agenda_comments`, `polls`, `poll_options`, `poll_votes`, `tasks`,
     `ideas`, `minutes`, `activity_log`).
   - El workspace compartido `TLS` (slug `tls`) con una reunión de ejemplo.
   - Políticas de **Row Level Security** que permiten leer y escribir a
     cualquiera que use el enlace de la app (no hay login, ver nota de
     seguridad más abajo).
   - La publicación de **Realtime** para que los cambios se vean al instante
     en todos los navegadores conectados.
4. Ve a **Settings → API** y copia:
   - **Project URL**
   - **anon public key**

> **Nota de seguridad:** al no haber autenticación, las políticas RLS son
> deliberadamente abiertas (cualquiera con el enlace de la app puede leer y
> escribir). Es un modelo razonable para una herramienta interna compartida
> por enlace dentro de un equipo de confianza. El esquema está preparado
> para añadir Supabase Auth más adelante: bastaría con sustituir las
> políticas `using (true)` por comprobaciones sobre `auth.uid()` /
> pertenencia al workspace, sin tocar el resto del modelo de datos.

## 4. Variables de entorno necesarias

Copia `.env.local.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_WORKSPACE_SLUG=tls
```

Si `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` faltan, la
app muestra un aviso de "Falta configurar Supabase" en lugar de fallar.

## 5. Cómo desplegar en Vercel

1. Sube este repositorio a GitHub (o el proveedor que uses).
2. Entra en [vercel.com/new](https://vercel.com/new) e importa el
   repositorio.
3. En **Environment Variables**, añade las mismas tres variables del punto 4
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_WORKSPACE_SLUG`).
4. Deploy. Vercel detecta Next.js automáticamente (no requiere configuración
   adicional).
5. Comparte la URL de Vercel con tu equipo — es el "enlace" que pide el
   punto 6 del encargo.

## 6. Funcionalidades

- **Identificación simple**: al entrar se pide el nombre (sin registro), se
  guarda en el navegador y se usa para firmar cada tema, tarea, idea,
  comentario, voto y entrada de actividad que esa persona cree o modifique.
- **Próxima reunión**: título, fecha, hora, lugar y cuenta atrás en vivo,
  editable por cualquiera.
- **Agenda**: crear/editar/eliminar temas con descripción, prioridad
  (alta/media/baja), estado (pendiente/en discusión/resuelto), reordenar por
  drag & drop, filtrar por prioridad o estado, comentarios y votaciones por
  tema.
- **Tareas**: tablero Kanban (pendiente → en proceso → completada) con
  drag & drop entre columnas, responsable y fecha límite.
- **Ideas**: banco de ideas para futuras reuniones, sin la urgencia de la
  agenda.
- **Actas**: crear un acta (fecha, asistentes, decisiones, tareas asignadas,
  próximos pasos) y consultar el historial de actas anteriores.
- **Actividad reciente**: quién ha hecho qué y cuándo, en un feed lateral.
- **Buscador**: filtra temas, tareas, ideas y actas por texto.
- **Colaboración en tiempo real**: todos los cambios se guardan en Supabase
  y se propagan a través de Realtime; además se ve cuántas personas están
  conectadas en ese momento.

## 7. Verificación realizada

Este entorno de desarrollo no tiene forma de crear un proyecto de Supabase
real (no hay credenciales ni acceso a la API de gestión de Supabase), así
que la verificación se ha hecho en dos niveles:

- [x] `npm run build` y `npm run lint` pasan sin errores.
- [x] Revisión visual del dashboard completo (agenda, tareas en Kanban,
      ideas, actas, actividad, cabecera con buscador y miembros conectados)
      con datos de prueba, en escritorio y en móvil.
- [x] Revisión visual de los modales clave (crear/editar tema, editar
      reunión) y de la pantalla de "¿Cómo te llamas?".
- [x] El aviso de "Falta configurar Supabase" se muestra correctamente
      cuando no hay variables de entorno.

Lo que **falta verificar con tu propio proyecto de Supabase** (siguiendo los
pasos del punto 3), porque requiere una base de datos real:

- [ ] Crear, editar y eliminar temas de agenda, tareas, ideas y actas desde
      la interfaz y comprobar que el registro aparece en las tablas de
      Supabase.
- [ ] Abrir la app en dos pestañas/navegadores con el mismo enlace y
      comprobar que los cambios de una se reflejan en la otra en tiempo real
      (agenda, tareas, ideas, actas, actividad y miembros conectados).
- [ ] Comentarios y votaciones dentro de un tema de agenda.

Todo el código de estas funciones sigue el mismo patrón ya usado en el resto
de la app (Supabase client + `useRealtimeList`/suscripciones dedicadas), así
que debería funcionar igual, pero no se ha podido confirmar end-to-end sin
una base de datos real. Si al probarlo encuentras algo que no funciona como
se describe, dímelo y lo reviso.
