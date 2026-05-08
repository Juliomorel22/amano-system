# Contexto de Memoria - A Mano (GEMINI.md)

Este archivo sirve como referencia de contexto y memoria principal del proyecto "A mano" para desarrollos técnicos y sistémicos.

## 1. Flujo del Proyecto
**A mano** es una webapp mobile-first para Formosa, Argentina. Actúa como intermediario conectando a vecinos con profesionales bajo un modelo de **subasta inversa** (escrow manual):
1. **Solicitante** publica un pedido de servicio (sin definir precio).
2. **Prestadores** del rubro correspondiente reciben notificaciones y envían ofertas.
3. El solicitante elige una oferta y la acepta. Al hacerlo, se liberan y muestran automáticamente la dirección exacta y teléfono entre el solicitante y el prestador para que comiencen el trabajo.
4. El prestador realiza el trabajo; al finalizar, el solicitante confirma en la app.
5. La plataforma retiene una comisión (10%) y libera el saldo restante (90%) a favor del prestador. Se habilita calificación mutua.

## 2. Stack Tecnológico
- **Framework:** Next.js 16.1.7 (App Router).
- **Lenguaje:** TypeScript v5 (Strict mode activo).
- **Estilos:** Tailwind CSS v4 con complementos como `clsx`, `tailwind-merge` y animaciones (`tw-animate-css`).
- **Librería UI:** Shadcn UI base, `@base-ui/react`, e iconos de `lucide-react`.
- **Base de Datos & Auth:** Supabase (PostgreSQL, Authenticatión, Storage) mediante las librerías oficiales `@supabase/ssr` y `@supabase/supabase-js`.
- **Otros:** `date-fns` (manejo de fechas), `sonner` (toasts).

## 3. Estructura de Datos (Supabase)
El diseño del backend consta principalmente de:
- **`profiles`**: Datos de todos los usuarios. Tiene roles definidos (Solicitante vs Prestador `is_provider`, Admin). Incluye info como rating y teléfono.
- **`jobs`**: Entidad principal. Los pedidos de servicios, su estado (`open`, `accepted`, `in_progress`, `completed`), cliente creador y categoría.
- **`offers`**: Las propuestas económicas y mensajes de los prestadores en relación a los trabajos abiertos (`job_id`).
- **`payments`**: Registro opcional o posterior de transacciones si fuera necesario (aunque la liberación de datos ya no depende de esto).
- **`messages`**: Log del chat interno y directo entre las dos partes (asociado siempre al `job_id`).
- **`reviews`**: Evaluaciones mutuas de 1-5 estrellas tras la finalización del servicio.

## 4. Arquitectura de Carpetas
- `/app`: Rutas principales de Next.js empleando SSR/App Router.
  - `/(app)`: Rutas de uso general autenticadas o la web pública.
  - `/(auth)` / `/auth`: Flujos de login, registro y callback de acceso.
  - `/admin`: Dashboard privado para el administrador.
- `/components`: Elementos modulares de UI y Shadcn.
- `/lib`: Utilidades generales.
  - `/lib/supabase`: Clientes de acceso preconfigurados para DB en el cliente (`client.ts`) y servidor (`server.ts`).
- `/hooks`: Custom hooks de React para envolver lógica y estados complejos.

## 5. Reglas de Estilo y Convenciones Generales
- **TypeScript First:** Fuertemente tipado. Usa las definiciones generadas de Supabase donde aplique para un "end-to-end type safety".
- **React Server Components (RSC):** Emplear los componentes de servidor por defecto. Solo usar `"use client"` al límite bajo del árbol de componentes cuando se requiere interactividad local, custom hooks o eventos de usuario.
- **Data Mutating:** Gestionar creaciones/actualizaciones a Supabase desde **Server Actions**, para evitar exponer lógicas sensibles en el cliente.
- **Diseño Inclusivo y Premium ("Digital Sanctuary"):** Minimalista pero elegante, sin divisiones tajantes (sin dividers abusivos). Evitar negro puro; text colors basados en superficie de Tailwind (`on-surface`).
- **UI Responsiva:** Acotado rigurosamente al sistema `Mobile First`. Prioridad a pantallas y comportamientos móviles para fluidez nativa.
