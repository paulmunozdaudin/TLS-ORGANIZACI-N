# Gecko — Arquitectura

## 1. Stack

| Capa | Tecnología | Notas |
| --- | --- | --- |
| App | Expo SDK 58, React Native 0.88, TypeScript estricto | Un solo código para iOS, Android y web |
| Navegación | Expo Router (rutas por archivos, rutas tipadas) | |
| Estado | Zustand + persistencia en AsyncStorage | Se sustituirá por Supabase como fuente de verdad |
| GPS / sensores | `expo-location`, `expo-sensors` (podómetro) | |
| Mapas | `react-native-maps` (Apple Maps / Google Maps) | En web, trazado SVG |
| Gráficos | `react-native-svg` | Mascota, iconos, anillos, rutas |
| Backend (Fase 4) | Supabase: Auth, PostgreSQL + RLS, Storage, Edge Functions | |
| Salud (Fase 5) | HealthKit (iOS), Health Connect (Android) | Requiere development build |
| Distribución | EAS Build / Submit → App Store y Google Play | |

## 2. Principio central: dominio puro y compartido

Todas las reglas de negocio viven en `src/domain`, en TypeScript puro sin dependencias de
React Native. Es deliberado: **el mismo código se ejecutará en las Edge Functions de
Supabase**. El cliente verifica para dar feedback inmediato; el servidor vuelve a
verificar sobre la ruta cruda antes de liberar o penalizar. El cliente nunca es la fuente de verdad.

```
UI (src/app, src/components)
        │  lee / dispara acciones
        ▼
Estado (src/store)  ──►  Servicios (src/services: GPS, pagos)
        │
        ▼
Dominio (src/domain: verificación, compromisos, ledger, gamificación)   ◄── reutilizado por el backend
```

## 3. Estructura de carpetas

```
gecko/
├── app.json                    Configuración Expo (permisos, iconos, bundle ids)
├── assets/                     Icono, splash
├── docs/
└── src/
    ├── app/                    RUTAS (cada archivo es una pantalla)
    │   ├── _layout.tsx         Stack raíz + liquidación periódica de compromisos
    │   ├── welcome.tsx         Onboarding
    │   ├── (tabs)/             Navegación inferior
    │   │   ├── index.tsx       Home
    │   │   ├── community.tsx   Explore / Community
    │   │   ├── start.tsx       Start Activity
    │   │   ├── commitments.tsx Commitments
    │   │   └── profile.tsx     Profile
    │   ├── activity/live.tsx   Grabación en vivo (pantalla completa)
    │   ├── activity/[id].tsx   Resumen y verificación de una actividad
    │   ├── commitment/new.tsx  Asistente de creación (modal)
    │   └── commitment/[id].tsx Detalle de un compromiso
    ├── components/
    │   ├── ui/                 Sistema de diseño: T, Button, Card, Icon, Progress, Screen
    │   ├── mascot/Gecko.tsx    Mascota vectorial con estados de ánimo
    │   ├── map/                RouteMap (.tsx nativo / .web.tsx) y RouteSketch
    │   └── cards/              Piezas compuestas: CommitmentCard, ActivityRow, WeekChart…
    ├── domain/                 Reglas de negocio puras (+ __tests__)
    │   ├── types.ts            Modelo de datos
    │   ├── geo.ts              Haversine, tramos, proyección
    │   ├── verification.ts     Anti-trampas
    │   ├── commitments.ts      Progreso y resolución de estado
    │   ├── ledger.ts           Libro mayor (céntimos enteros, asientos inmutables)
    │   ├── gamification.ts     XP, niveles, rangos, rachas, logros, ánimo de la mascota
    │   └── format.ts           Formato de distancias, ritmos, dinero, fechas
    ├── services/
    │   ├── tracking/           Motor de grabación GPS + podómetro
    │   └── payments/           Interfaz PaymentProvider + proveedor simulado
    ├── store/useAppStore.ts    Estado persistente y casos de uso
    ├── hooks/                  useNow, useTodaySteps
    ├── data/                   Datos de ejemplo de comunidad y plantillas de retos
    └── theme/tokens.ts         Colores, espaciado, radios
```

## 4. Navegación

```
Stack raíz
├── welcome                      (solo sin perfil)
├── (tabs)  ── Inicio · Comunidad · [EMPEZAR] · Retos · Perfil
├── commitment/new               modal, asistente de 5 pasos
├── commitment/[id]
├── activity/live                pantalla completa, sin gesto de retroceso
└── activity/[id]
```

La barra inferior es propia: cápsula flotante con el botón central de inicio destacado en
lima (cambia a ámbar mientras hay una grabación en curso).

## 5. Identidad visual

- **Color**: negro `#0A0B0A` de base, superficies `#141614` / `#1D201D`, lima `#C5F82A`
  como único color de acción. Rojo y ámbar solo para estados (fallido / en revisión).
  El lima se reserva para lo importante: CTA, progreso y dinero a salvo.
- **Tipografía**: fuente del sistema. Titulares en peso 800–900 con tracking negativo;
  cifras deportivas en black cursiva con dígitos tabulares; etiquetas en mayúsculas espaciadas.
- **Forma**: tarjetas de radio 22, botones en cápsula, bordes de 1 px en lugar de sombras.
- **Mascota**: gecko vectorial con volumen (gradientes radiales, brillos, sombra) y cinco
  estados: neutral, motivado, feliz, orgulloso y decepcionado, derivados del comportamiento real del usuario.
- **Tono**: directo y adulto. «¿Cuánto te juegas?», no «¡Vamos, campeón!».

## 6. Compromisos y dinero

Estados: `active → completed | failed | pending_verification`.

- Al crear: se **retiene** el importe (`hold`).
- Objetivo alcanzado con actividades verificadas: `completed`, se **libera** (`release`).
- Vence sin alcanzarlo: `failed`, se **penaliza** (`forfeit`).
- Solo se alcanzaría contando actividades sospechosas: `pending_verification`; el dinero
  sigue retenido, nunca se libera ni penaliza a ciegas.

El dinero se modela en céntimos enteros con un libro mayor de asientos inmutables. La app
solo conoce la interfaz `PaymentProvider`; hoy existe `SimulatedPaymentProvider`. Integrar
un PSP real será añadir otra implementación, y mover `release`/`forfeit` al servidor.

**Antes de dinero real** hace falta validación legal: retener depósitos y aplicar
penalizaciones puede entrar en regulación de servicios de pago, consumo o juego según el
país, y las tiendas de apps tienen normas propias. Decisiones abiertas: destino del dinero
penalizado, KYC, límites, derecho de desistimiento.

## 7. Verificación anti-trampas (`domain/verification.ts`)

| Comprobación | Efecto |
| --- | --- |
| Marcas de tiempo incoherentes o en el futuro | Rechazo |
| Solape con otra actividad (duplicados) | Rechazo |
| Menos de 1 min o 100 m | Rechazo |
| Ubicación simulada (mock location, Android) | Rechazo |
| Velocidad media imposible para el tipo de actividad | Rechazo / aviso |
| Saltos de posición («teletransporte») | Rechazo / aviso |
| Pocos puntos GPS para la distancia | Aviso |
| Señal GPS mala en gran parte de la ruta | Aviso |
| Distancia declarada ≠ distancia de la ruta | Aviso (cuenta la recalculada) |
| Pasos incoherentes con la distancia (vehículo) | Aviso |
| Velocidad artificialmente constante (simulador) | Aviso |

Un aviso deja la actividad «en revisión» y no cuenta para retos. Para compromisos solo
cuenta `verifiedDistanceM`, recalculada desde la ruta.

Refuerzos previstos en backend: recálculo sobre la ruta cruda subida, idempotencia por
hash de ruta, cruce con HealthKit / Health Connect, attestation del dispositivo
(App Attest / Play Integrity), límites por usuario y cola de revisión manual.

## 8. Backend previsto (Fase 4)

Tablas: `profiles`, `activities`, `activity_routes` (ruta cruda), `commitments`,
`ledger_entries`, `follows`, `likes`, `comments`, `achievements_unlocked`.

- **RLS** en todas las tablas: cada usuario solo lee y escribe lo suyo; el feed se expone por vistas.
- El cliente **no puede** escribir `commitments.status`, `ledger_entries` ni
  `activities.verification`: solo las Edge Functions con rol de servicio.
- Edge Functions: `submit-activity` (verifica y liquida), `create-commitment` (retiene),
  y un cron `settle-expired` para compromisos vencidos.
- Privacidad: rutas privadas por defecto, zonas de privacidad en inicio/fin, borrado de cuenta y exportación (RGPD).

## 9. Hoja de ruta

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Arquitectura y planificación | Hecho |
| 2 | Branding e interfaces | Primera versión |
| 3 | Frontend | Primera versión funcional |
| 4 | Supabase: auth, esquema, RLS, Edge Functions | Pendiente (requiere proyecto Supabase) |
| 5 | GPS en segundo plano, HealthKit / Health Connect, development build | Pendiente (requiere cuentas Apple / Google) |
| 6 | Compromisos en servidor, revisión manual, proveedor de pagos | Pendiente (requiere validación legal) |
| 7 | Comunidad real, rankings, notificaciones | Pendiente |
| 8 | Pruebas en dispositivo, rendimiento, publicación | Pendiente |
