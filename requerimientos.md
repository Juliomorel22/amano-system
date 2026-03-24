# 📋 Documento de Requerimientos — MVP "A mano"
### Plataforma de Servicios para el Hogar · Formosa, Argentina

---

## 1. Visión General del Producto

**A mano** es una webapp móvil (mobile-first) que conecta a vecinos de Formosa Capital con profesionales de servicios para el hogar mediante un sistema de **subasta inversa**: el solicitante publica su necesidad y son los prestadores quienes proponen el precio.

La plataforma opera como intermediaria de confianza a través de un mecanismo de pago en custodia (escrow manual), garantizando seguridad tanto para el cliente como para el profesional.

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Estilos | Tailwind CSS (config extendida — ver Sección 3) |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Almacenamiento de archivos | Supabase Storage |
| Iconografía | Material Symbols Outlined (Google Fonts) |
| Notificaciones operativas | WhatsApp (gestión manual por Admin) |

---

## 3. Design System — "The Fluid Minimalist"

El diseño sigue el concepto de **"Digital Sanctuary"**: una estética editorial premium inspirada en los horizontes abiertos de Formosa. El sistema evita el aspecto genérico de SaaS apostando por layouts respiros, asimetría intencional y capas de profundidad táctil.

### 3.1 Paleta de Colores (Tailwind config)

La paleta completa se extiende en `tailwind.config.js` con los siguientes tokens:

```js
colors: {
  "primary":                   "#003f87",
  "primary-container":         "#0056b3",
  "on-primary":                "#ffffff",
  "on-primary-fixed":          "#001a40",
  "primary-fixed":             "#d7e2ff",
  "primary-fixed-dim":         "#acc7ff",
  "on-primary-fixed-variant":  "#004491",
  "surface-tint":              "#115cb9",
  "inverse-primary":           "#acc7ff",

  "secondary":                 "#4c5e84",
  "secondary-container":       "#bfd2fd",
  "on-secondary":              "#ffffff",
  "on-secondary-container":    "#475a7f",
  "secondary-fixed":           "#d7e2ff",
  "secondary-fixed-dim":       "#b3c7f1",
  "on-secondary-fixed":        "#041b3c",
  "on-secondary-fixed-variant":"#34476a",

  "tertiary":                  "#722b00",
  "tertiary-container":        "#983c00",
  "on-tertiary":               "#ffffff",
  "on-tertiary-container":     "#ffc2a7",
  "tertiary-fixed":            "#ffdbcc",
  "tertiary-fixed-dim":        "#ffb694",
  "on-tertiary-fixed":         "#351000",
  "on-tertiary-fixed-variant": "#7b2f00",

  "error":                     "#ba1a1a",
  "error-container":           "#ffdad6",
  "on-error":                  "#ffffff",
  "on-error-container":        "#93000a",

  "background":                "#f8f9ff",
  "on-background":             "#121c2a",
  "surface":                   "#f8f9ff",
  "surface-dim":               "#d0dbed",
  "surface-bright":            "#f8f9ff",
  "surface-container-lowest":  "#ffffff",
  "surface-container-low":     "#eff4ff",
  "surface-container":         "#e6eeff",
  "surface-container-high":    "#dee9fc",
  "surface-container-highest": "#d9e3f6",
  "surface-variant":           "#d9e3f6",
  "on-surface":                "#121c2a",
  "on-surface-variant":        "#424752",
  "inverse-surface":           "#27313f",
  "inverse-on-surface":        "#eaf1ff",

  "outline":                   "#727784",
  "outline-variant":           "#c2c6d4",
}
```

### 3.2 Tipografía

```js
fontFamily: {
  "headline": ["Manrope"],   // Títulos y display — geométrico, editorial
  "body":     ["Inter"],     // Cuerpo y UI — legibilidad máxima
  "label":    ["Inter"],     // Labels y metadata
}
```

- **`font-headline` (Manrope):** Títulos con `tracking-tight` (`-0.02em`), peso `extrabold`. Transmite autoridad editorial.
- **`font-body` / `font-label` (Inter):** Prosa, inputs, metadatos. Alta legibilidad en pantallas pequeñas.
- **Regla:** Usar `text-on-surface` (`#121c2a`) para texto principal. **Nunca** usar negro puro (`#000000`).

### 3.3 Bordes y Radios

```js
borderRadius: {
  DEFAULT: "1rem",   // Inputs, chips inactivos
  lg:      "2rem",   // Cards de contenido principal
  xl:      "3rem",   // Botones primarios / CTAs
  full:    "9999px", // Chips, avatares, tags
}
```

### 3.4 Reglas de Profundidad y Elevación

| Regla | Implementación |
|---|---|
| **Sin bordes para seccionar** | Cambios de tono de fondo (ej: `surface-container-low` sobre `surface`) |
| **Sombra ambiente** | `box-shadow: 0 12px 40px rgba(18,28,42,0.06)` — solo para bottom sheets flotantes |
| **"Ghost Border" fallback** | `1px` de `outline-variant` al **15% de opacidad** si se requiere por accesibilidad |
| **Glassmorphism (headers)** | `bg-white/80 backdrop-blur-xl` — headers y nav bars flotantes |
| **CTA gradient** | `linear-gradient(135deg, #003f87, #0056b3)` — botones primarios. Nunca color plano |

**Jerarquía de capas (de abajo hacia arriba):**
1. Base: `surface` (`#f8f9ff`)
2. Secciones secundarias: `surface-container-low` (`#eff4ff`)
3. Cards de contenido: `surface-container-lowest` (`#ffffff`)
4. Overlays interactivos: `surface-bright` (`#f8f9ff`) + `backdrop-blur`

### 3.5 Componentes

#### Botón Primario (CTA)
- Fondo: gradiente `primary` → `primary-container` a 135°
- Radio: `xl` (`3rem`) o `full`
- Texto: uppercase, blanco (`on-primary`), `tracking-wider` (0.05em)
- Sombra: `shadow-primary/20`

#### Botón Secundario
- Sin relleno. Ghost border al 20% de opacidad
- Texto: `primary` (`#003f87`)

#### Cards
- Radio: `lg` (`2rem`)
- Fondo: `surface-container-lowest`
- **Regla "No Divider":** prohibido usar líneas horizontales entre ítems. Separar con `gap-3` (1rem) o alternancia de tonos

#### Chips — "The Formosa Filter"
- Radio: `full`
- Inactivo: `surface-container-highest` + texto `on-surface-variant`
- Activo: `primary` + texto `on-primary` + `shadow-lg shadow-primary/20 scale-105`

#### Inputs
- Fondo: `surface-container-lowest`, radio `sm`
- Sin borde visible en reposo
- Focus: fondo → `surface-container-high` + glow `ring-2 ring-primary/20`
- Placeholder: `text-outline-variant`

### 3.6 Layout y Espaciado

- Padding horizontal mínimo en pantalla: `1.4rem` (token `4`)
- CTAs primarios siempre en el tercio inferior de la pantalla (floating container con glassmorphism)
- `pb-32` en `<main>` para espacio bajo el floating CTA
- Asimetría editorial: títulos `headline` alineados a la izquierda con espacio derecho intencional

---

## 4. Roles de Usuario

Un mismo usuario puede operar en ambos roles simultáneamente.

### 4.1 Solicitante
- Publica pedidos de servicio.
- Recibe y evalúa ofertas de prestadores.
- Realiza el pago y confirma la finalización del trabajo.
- Califica al prestador al cierre.

### 4.2 Prestador
- Visualiza pedidos publicados dentro de su/s categoría/s.
- Envía ofertas con monto y mensaje.
- Accede a los datos de contacto y domicilio del cliente **únicamente tras confirmación del pago por el admin**.
- Califica al solicitante al cierre.

---

## 5. Datos Obligatorios de Perfil

Antes de poder operar (publicar o cotizar), todo usuario debe completar:

- **Foto de perfil:** Selfie obligatoria
- **Identidad:** Nombre, apellido y DNI (dato privado, solo admin)
- **Teléfono:** Número de contacto
- **Ubicación:** Barrio (dropdown de barrios de Formosa Capital)
- **Categorías (solo Prestador):** Selección múltiple:
  - Cerrajero · Electricista · Plomero · Community Manager · Piletero
  - Jardinero · Limpieza doméstica · Albañil · Manos Útiles · Pinturería a domicilio

---

## 6. Flujo de Trabajo Principal (Subasta Inversa)

```
[Solicitante] Publica pedido (categoría + descripción + fotos)
       ↓
[Prestadores del rubro] Visualizan el pedido abierto
       ↓
[Prestadores] Envían oferta: monto + mensaje
       ↓
[Solicitante ↔ Prestador] Chat interno (datos de contacto bloqueados)
       ↓
[Solicitante] Acepta la oferta que prefiere
       ↓
[Solicitante] Transfiere 100% al alias AMANO.FORMOSA
       ↓
[Solicitante] Sube comprobante en la app
       ↓
[Admin] Valida el pago en el dashboard
       ↓
[App] Desbloquea teléfono y dirección exacta para el Prestador
       ↓
[Prestador] Realiza el trabajo en el domicilio
       ↓
[Solicitante] Confirma trabajo finalizado
       ↓
[App] Acredita 90% del monto al saldo del Prestador (10% comisión)
       ↓
[Ambos] Calificación mutua: estrellas (1–5) + reseña opcional
```

### Reglas de Negocio Críticas

- El monto del pedido es **abierto**: el solicitante no fija precio.
- Los **datos de contacto y dirección exacta están bloqueados** hasta validación del pago por admin. Esta es la regla de oro anti-salteo.
- La plataforma retiene **10% de comisión**. El prestador recibe el 90% restante.
- Alias de cobro: **AMANO.FORMOSA**
- Disputas y notificaciones: gestión **manual vía WhatsApp oficial del admin** (MVP).

---

## 7. Pantallas Clave (Mobile First)

### 7.1 Dashboard — Vista Solicitante

**Header (glassmorphism sticky):**
- `bg-white/80 backdrop-blur-xl sticky top-0 z-50`
- Logo "Amano" en `font-headline font-extrabold text-blue-700`
- Botón hamburguesa (izq.) · Icono notificaciones con dot `bg-error` (der.) · Avatar redondo del perfil

**Hero Search Section:**
- Título `text-4xl font-headline font-extrabold tracking-tight` alineado a la izquierda: _"¿Qué servicio necesitás hoy en Formosa?"_
- Searchbar full-width: `bg-surface-container-lowest`, sin borde, radio `xl`, ícono `search` a la izquierda, placeholder `text-outline-variant`

**Categorías Populares (Bento Grid):**
- `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4`
- Cada card: `bg-surface-container-lowest rounded-lg p-4`, ícono Material Symbol `text-primary`, label `text-xs font-semibold`

**Sección "Mis Pedidos Activos":**
- Cards `bg-surface-container-lowest rounded-lg shadow-sm`
- Badge de estado en `bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs`

**Floating CTA inferior:**
- `fixed bottom-0 bg-white/80 backdrop-blur-xl px-6 py-4`
- Botón "Publicar Pedido" con gradiente primario

---

### 7.2 Crear Publicación — Paso 1 de 2

**Header:**
- Botón `close` (izq.) · Logo "Amano" · Badge `"Paso 1 de 2"` en `text-on-secondary-container text-xs uppercase tracking-widest`

**Contenido:**
- Título: `text-4xl font-headline font-extrabold` — _"Contanos qué necesitás"_
- Subtítulo: `text-on-surface-variant text-lg` — _"Seleccioná una categoría para empezar."_

**Selector de Categoría (Chips "Formosa Filter"):**
- `flex flex-wrap gap-3`
- **Activo:** `bg-primary text-on-primary rounded-full px-6 py-4 shadow-lg shadow-primary/20 scale-105` + ícono con `FILL=1`
- **Inactivo:** `bg-surface-container-highest text-on-surface-variant rounded-full px-6 py-4`
- Ícono + label por categoría:

| Categoría | Ícono |
|---|---|
| Plomería | `water_drop` |
| Electricidad | `bolt` |
| Pintura | `format_paint` |
| Limpieza | `mop` |
| Fletes | `local_shipping` |
| Jardinería | `yard` |
| Albañilería | `construction` |
| Cerrajería | `key` |
| Manos Útiles | `handyman` |
| Piletero | `pool` |
| Community Manager | `smartphone` |

**Descripción:**
- Textarea `bg-surface-container-lowest`, sin borde, radio `DEFAULT`
- Placeholder: _"Describí el problema (ej: Pierde agua el termotanque)"_

**Subir Fotos/Video:**
- Botón secundario (ghost border) con ícono `photo_camera`, ancho completo

**Selector de Barrio:**
- Dropdown `bg-surface-container-lowest`, ícono `location_on` a la izquierda

**Floating CTA inferior:**
- `bg-white/80 backdrop-blur-xl fixed bottom-0 px-6 py-4`
- Botón gradiente primario `rounded-xl` full-width: _"Publicar y Recibir Ofertas"_

---

### 7.3 Detalle del Trabajo y Ofertas — Vista Solicitante

**Header:** `arrow_back` · Logo "Amano" · Ícono notificaciones

**Resumen del Pedido:**
- Badge estado: `bg-secondary-container text-on-secondary-container rounded-full text-xs uppercase tracking-wider`
- Título: `text-4xl font-headline font-extrabold`
- Barrio: ícono `location_on text-sm` + `text-on-secondary-container`

**Galería Asimétrica (Bento):**
- `grid grid-cols-4 grid-rows-2 gap-3 h-64`
- Foto principal: `col-span-3 row-span-2 rounded-lg overflow-hidden`
- Foto secundaria: `col-span-1 row-span-1 rounded-lg`
- Contador "+N fotos": overlay `bg-surface-container-highest opacity-40` + texto encima

**Sección Ofertas — "Ofertas de Profesionales (N)":**
- Sin divisores. `gap-4` entre cards.
- **Card de oferta** (`bg-surface-container-lowest rounded-lg p-6 shadow-sm`):
  - Avatar: `w-12 h-12 rounded-full border-2 border-surface-container-high`
  - Nombre: `font-headline font-bold text-on-surface`
  - Estrellas: `text-yellow-400` + cantidad trabajos en `text-on-secondary-container text-xs`
  - **Monto:** `font-headline text-3xl font-extrabold text-primary tracking-tighter`
  - Mensaje: `text-on-surface-variant text-sm`
  - Botones en row: "Chatear" (ghost border) · "Aceptar Oferta" (gradiente primario)

---

### 7.4 Confirmar Pago — Vista Solicitante

**Header:** `arrow_back` · Título "Confirmar Pago" · Ícono `lock text-primary`

**Resumen (centrado):**
- Ícono categoría en círculo `bg-surface-container-low rounded-full p-4`
- Label servicio: `text-on-secondary-container uppercase tracking-widest text-xs`
- Nombre prestador: `font-headline text-2xl font-extrabold`
- Monto: `font-headline text-5xl font-extrabold text-primary tracking-tighter`

**Sección de Instrucciones** (`bg-surface-container-low rounded-lg p-8`):
- Sin borde. La transición de tono es el divisor.
- Ícono `account_balance` + título de sección
- Card del alias (`bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/10`):
  - Label: `text-[10px] uppercase font-bold tracking-wider text-on-secondary-container`
  - Alias: `font-headline font-extrabold text-xl` — **AMANO.FORMOSA**
  - Botón copiar: `bg-surface-container-high rounded-lg p-3 text-primary` con ícono `content_copy`

**Subir Comprobante:**
- Zona drag & drop o botón con `border border-outline-variant/20 rounded-xl`
- Ícono `upload_file` + texto guía

**Mensaje de confianza:**
- `bg-surface-container-low rounded-lg p-4 flex items-start gap-3`
- Ícono `verified_user text-primary` + _"Tu dinero está seguro hasta que confirmes la finalización del trabajo."_

**Floating CTA:** _"Confirmar Envío del Comprobante"_ — gradiente primario, full-width, `rounded-xl`

---

### 7.5 Trabajo Confirmado — "Datos Desbloqueados" — Vista Prestador

**Header:** `arrow_back` · Logo "Amano" · Íconos notificaciones/menú

**Status Banner:**
- Dot pulsante: `bg-primary animate-pulse w-3 h-3 rounded-full`
- Label: `text-primary font-bold uppercase font-headline text-lg tracking-tight` — "PAGO CONFIRMADO"
- Título: `text-3xl font-extrabold font-headline` — _"Ir al Domicilio"_
- Subtítulo: `text-on-secondary-container` — _"El cliente está esperando el servicio."_

**Grid Bento:** `grid grid-cols-1 gap-4`

**Card Cliente + Dirección** (`bg-surface-container-low rounded-lg p-6`):
- Decoración: halo `bg-primary/5 rounded-full` en esquina superior derecha
- Avatar: `w-16 h-16 rounded-full border-4 border-white shadow-sm`
- Nombre: `font-headline text-xl font-bold`
- Rating: ícono `star` + promedio + badge tipo cliente
- Dirección: ícono `location_on` + texto
- Botón "Abrir en Maps": ghost border con ícono `map`

**Card Teléfono:**
- Ícono `phone` + número
- Botones en row: "Llamar" (ghost) · "WhatsApp" (gradiente primario)

**Sección Chat:** mensajes inline en el detalle del trabajo

**Floating CTA inferior:** _"Marcar como Trabajo Finalizado"_ — gradiente primario, full-width `rounded-xl`

---

## 8. Estructura de Base de Datos

### `profiles`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK — vinculado a `auth.users` |
| `full_name` | TEXT | |
| `dni` | TEXT | Privado — solo admin |
| `avatar_url` | TEXT | Supabase Storage |
| `barrio` | TEXT | |
| `phone` | TEXT | Se desbloquea post-pago |
| `is_provider` | BOOLEAN | |
| `categories` | TEXT[] | Solo si `is_provider = true` |
| `rating` | NUMERIC | Promedio de calificaciones |
| `jobs_count` | INTEGER | Trabajos completados |
| `bio` | TEXT | Biografía/Descripción |

### `jobs`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `client_id` | UUID | FK → profiles |
| `category` | TEXT | |
| `description` | TEXT | |
| `photos_urls` | TEXT[] | Supabase Storage |
| `barrio` | TEXT | |
| `address` | TEXT | Privado — se revela post-pago |
| `status` | TEXT | `open` / `accepted` / `paid` / `in_progress` / `completed` / `cancelled` |
| `final_amount` | NUMERIC | Monto de la oferta aceptada |
| `created_at` | TIMESTAMPTZ | |

### `offers`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `job_id` | UUID | FK → jobs |
| `provider_id` | UUID | FK → profiles |
| `amount` | NUMERIC | |
| `message` | TEXT | |
| `status` | TEXT | `pending` / `accepted` / `rejected` |
| `created_at` | TIMESTAMPTZ | |

### `payments`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `job_id` | UUID | FK → jobs |
| `proof_url` | TEXT | Supabase Storage |
| `verified_at` | TIMESTAMPTZ | NULL = pendiente de validación |
| `verified_by` | UUID | FK → profiles (admin) |

### `messages`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `job_id` | UUID | FK → jobs |
| `sender_id` | UUID | FK → profiles |
| `content` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

### `reviews`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `job_id` | UUID | FK → jobs |
| `reviewer_id` | UUID | FK → profiles |
| `reviewed_id` | UUID | FK → profiles |
| `rating` | INTEGER | 1 a 5 |
| `comment` | TEXT | Opcional |
| `created_at` | TIMESTAMPTZ | |

---

## 9. Seguridad y RLS (Row Level Security)

- **DNI y teléfono del solicitante:** solo visibles para el admin.
- **Dirección exacta y teléfono:** solo accesibles para el prestador cuando `payments.verified_at IS NOT NULL` en el trabajo correspondiente.
- **RLS en Supabase — políticas clave:**
  - `profiles`: cada usuario lee/edita su propio perfil; admin lee todos.
  - `jobs`: el solicitante gestiona los propios; los prestadores ven los `status = open` de su categoría.
  - `offers`: el prestador gestiona las propias; el solicitante ve todas las de su job.
  - `messages`: solo los dos participantes del job acceden al chat.
  - `payments`: solo el solicitante del job y el admin.

---

## 10. Panel de Administración (MVP)

- Listado de pagos pendientes con preview del comprobante subido.
- Acción "Aprobar pago" → actualiza `payments.verified_at` y `jobs.status = paid` → desbloquea datos para el prestador.
- Listado de usuarios: foto, nombre, DNI, categorías.
- Listado de trabajos activos filtrado por estado.
- Acceso al historial de chats para gestión de disputas.
- Enlace directo a WhatsApp de cada parte involucrada.

---

## 11. Modelo de Negocio (MVP)

| Concepto | Valor |
|---|---|
| Comisión de la plataforma | 10% del monto del trabajo |
| Acreditación al prestador | 90% al confirmar finalización |
| Alias de cobro | AMANO.FORMOSA |
| Gestión de disputas | Manual vía WhatsApp oficial (Admin) |
| Notificaciones | Manual vía WhatsApp (MVP) |

---

## 12. Requerimientos No Funcionales

- **Rendimiento:** Carga inicial < 3 segundos en conexión móvil estándar.
- **Responsividad:** Mobile-first (375px–430px). Adaptable a tablet/desktop.
- **Accesibilidad:** Contraste WCAG AA. Tap targets mínimos 44×44px. Nunca negro puro en texto.
- **Escalabilidad:** Arquitectura preparada para reemplazar notificaciones manuales por push/email sin refactoring mayor.

---

## 13. Fuera de Alcance (MVP)

- Pasarela de pago automática (Mercado Pago, etc.)
- Notificaciones push automáticas
- Mapa de prestadores en tiempo real
- Sistema de retiros automáticos para prestadores
- Verificación de identidad automatizada (OCR de DNI)
- App nativa iOS / Android

---

*Documento generado para el proyecto A mano · Versión MVP · Formosa, Argentina*
*Design System: "The Fluid Minimalist" — The Digital Sanctuary*
