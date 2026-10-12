# Focus

Sesiones de concentración con avisos suaves. Todo funciona en el navegador:
sin cuentas, sin servidor, y ninguna imagen sale nunca del dispositivo.

Proyecto independiente (Vite + React + TypeScript + PWA) dentro de la carpeta
`focus/` de este repositorio.

## Publicarla en Vercel (una sola vez)

1. Entra en [vercel.com/new](https://vercel.com/new) e importa el repositorio
   `TLS-ORGANIZACI-N`. Vercel deja crear **otro proyecto** a partir del mismo
   repo, así que no afecta a la app de TLS Organización.
2. En **Root Directory** pulsa *Edit* y elige `focus`.
3. Framework Preset: **Vite** (lo detecta solo). No hace falta ninguna variable de entorno.
4. Pulsa **Deploy**. Obtendrás una URL `https://…vercel.app` con HTTPS real,
   que es lo que necesitan la cámara y los sensores del móvil.

Cada `git push` vuelve a desplegar: la rama principal va a producción y
cualquier otra rama genera una URL de *preview*, que aparece en el panel de Vercel.

### Instalarla en el móvil

- **iPhone (Safari):** abre la URL → Compartir → *Añadir a pantalla de inicio*.
- **Android (Chrome):** abre la URL → menú ⋮ → *Instalar aplicación*.

## Desarrollo local

```bash
cd focus
npm install
npm run dev          # http://localhost:5173 (portátil)
npm run dev:https    # HTTPS en la red local para probar desde el móvil
```

Con `dev:https`, abre en el móvil la dirección `https://192.168.x.x:5173` que
muestra la terminal (mismo wifi) y acepta el aviso de certificado. Si Safari da
problemas, usa la URL de Vercel.

## Estructura

```
src/
  signals/     fuentes de señal intercambiables (pestañas; luego webcam, movimiento…)
  engine/      DistractionEngine: umbral, sensibilidad y cooldown
  alerts/      sonidos sintetizados (Web Audio), sonido propio y gestor de avisos
  session/     SessionController: orquesta una sesión
  storage/     IndexedDB (sesiones, sonido propio)
  store/       estado (zustand); los ajustes se guardan en localStorage
  screens/     Inicio, Sesión, Resumen, Ajustes
```

Para añadir una fuente nueva (p. ej. una pulsera Bluetooth) basta con
implementar `SignalSource` (`src/signals/types.ts`) y añadirla en
`buildSources()` de `src/session/SessionController.ts`.

## Estado

- [x] Fase 1: inicio, sesión, temporizador, alertas, ajustes, pestañas, PWA
- [ ] Fase 2: modo ordenador con webcam (MediaPipe)
- [ ] Fase 3: modo móvil boca abajo (sensores)
- [ ] Fase 4: resumen completo e historial
