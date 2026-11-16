# Gecko — Bet on yourself

App móvil de fitness con compromisos: eliges una actividad y un objetivo, comprometes
dinero y Gecko verifica por GPS si cumples. Si cumples, lo recuperas; si no, lo pierdes.

> **Modo simulación.** El dinero es ficticio (100 € de saldo inicial). No hay
> integración de pagos ni se mueve dinero real.

Proyecto Expo independiente dentro de este repositorio (la app web de la raíz no se ve afectada).

## Ejecutar en tu móvil (Expo Go)

Requisitos: Node 20+, y la app **Expo Go** (SDK 58) en tu iPhone o Android.

```bash
cd gecko
npm install
npx expo start
```

Escanea el QR con la cámara (iOS) o desde Expo Go (Android). Móvil y ordenador deben
estar en la misma red; si no conecta, usa `npx expo start --tunnel`.

Otros comandos:

```bash
npm run web        # versión web (mapa sustituido por trazado vectorial)
npm run typecheck  # TypeScript
npm test           # tests del dominio (verificación, compromisos, ledger, gamificación)
```

## Qué funciona hoy

| Área | Estado |
| --- | --- |
| Navegación de 5 pestañas, onboarding, identidad visual y mascota (5 estados de ánimo) | Hecho |
| Grabación de actividades (running, walking, cycling): GPS en vivo, mapa, distancia, tiempo, ritmo actual/medio, calorías, pasos, pausa/reanudar/finalizar | Hecho (primer plano) |
| Compromisos: asistente de 5 pasos, retención de saldo, progreso, cuenta atrás, liquidación automática (cumplido / fallido / en verificación) | Hecho (simulación) |
| Verificación anti-trampas (10 comprobaciones) | Hecho en cliente; el backend la repetirá |
| Gamificación: XP, niveles, rangos Gecko, rachas, 12 logros | Hecho |
| Perfil, historial, estadísticas | Hecho |
| Comunidad: feed, likes, comentarios, seguir, retos públicos, ranking | Interacciones reales en local; perfiles de ejemplo hasta tener backend |
| Persistencia | Local (AsyncStorage) |

## Limitaciones conocidas

- **GPS en segundo plano**: Expo Go solo permite seguimiento en primer plano (pantalla
  encendida, se mantiene despierta sola). El segundo plano requiere development build.
- **Pasos**: se cuentan durante las actividades con el podómetro del dispositivo. En iOS,
  «pasos de hoy» lee además el histórico del sistema. HealthKit / Health Connect requieren
  development build.
- **Sin cuentas ni sincronización**: los datos viven en el dispositivo hasta la Fase 4.
- **Revisión manual**: un reto «en verificación» queda retenido; la resolución llegará con el backend.

Arquitectura, estructura de carpetas, identidad visual y hoja de ruta: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
