# Salentino Subscription Engine — Design Document

**Fecha:** 2026-11-06
**Autor:** Equipo Salentino
**Estado:** Aprobado

---

## 1. Intent & Why

Salentino Coffee Lab necesita un sistema de suscripciones recurrentes que:

- Genere ingresos recurrentes predecibles para la operación de tostión
- Aumente el ticket promedio de venta de ~$45,000 (compra suelta) a ~$105,000-$110,000 (suscripción)
- Capture datos de fulfillment (molienda, dirección, teléfono) antes del pago
- Se integre con Mercado Pago para cobros automáticos recurrentes
- Notifique al equipo de operaciones (vía WhatsApp) cuando un pago se procesa para despachar

El sistema debe ser **operativamente simple** — el equipo es pequeño, trabaja por WhatsApp, y espera 20-30 suscriptores iniciales.

---

## 2. Goals, Non-Goals, Anti-Goals

### Goals
- Configurador interactivo en Shopify (Liquid custom) con cálculo de costos en tiempo real
- Persistencia de datos de suscriptor en Airtable (base de datos visual para el equipo)
- Redirección a links estáticos de Mercado Pago según plan seleccionado
- Notificación automática al equipo cuando MP cobra un pago
- Vista kanban en Airtable para gestionar despachos (Por despachar → En camino → Entregado)

### Non-Goals
- No se construirá un backend propio robusto (no Node.js server, no Redis, no PostgreSQL)
- No se integra con Shopify Admin API para crear órdenes automáticas (gestión manual vía Airtable)
- No se construirá un portal de autogestión para el suscriptor (cambios vía WhatsApp con soporte)
- No se implementa dashboard de administración custom
- No se implementan Kits de Inicio

### Anti-Goals (lo que haría fallar el proyecto aunque técnicamente funcione)
- Sobre-ingeniería: construir infraestructura para 1,000 suscriptores cuando se esperan 30
- Dependencia de un desarrollador para operar el día a día — el equipo de tostión debe poder gestionar todo desde Airtable y WhatsApp
- Perder la intención de compra por un formulario largo o un flujo confuso

---

## 3. Constraints

- **Plataforma e-commerce:** Shopify (ya existente en salentino.co)
- **Procesador de pagos recurrentes:** Mercado Pago (planes estáticos precreados con `preapproval_plan`)
- **Almacenamiento de datos:** Airtable (free tier: 1,000 registros, suficiente para ~80 suscriptores × 12 meses)
- **Notificaciones:** Google Apps Script (~50 líneas) como webhook receptor de MP → notificación a WhatsApp/email
- **Equipo técnico:** El fundador construye el frontend y configura las herramientas. No hay equipo de desarrollo dedicado.
- **Presupuesto de infraestructura:** $0/mes (todo en free tiers)

---

## 4. Approaches Considered

### Approach A: Backend completo (Node.js + PostgreSQL + Redis + Shopify Admin API)
El spec técnico original v1.2. Webhook handler con validación HMAC, idempotencia por Redis, reconciliación automática, inyección de órdenes en Shopify via GraphQL.

**Descartado porque:** Sobre-dimensionado para 30 suscriptores. Requiere desarrollador para mantener, costos de infraestructura innecesarios, y complejidad operativa que el equipo no puede absorber.

### Approach B: Google Sheets + Apps Script
Form de Shopify → Google Sheets como base de datos → Apps Script para webhook de MP → email de notificación.

**Descartado porque:** Google Sheets no tiene vistas tipo kanban, el equipo necesitaría editar celdas manualmente, y la experiencia de usuario para operaciones es inferior a Airtable.

### Approach C: Airtable como centro de operaciones (ELEGIDO)
Form de Shopify → Airtable via API → Google Apps Script como webhook de MP → notificación a WhatsApp. El equipo gestiona todo desde vistas kanban en Airtable.

**Elegido porque:**
- Airtable es visual e intuitivo (arrastrar tarjetas, no editar celdas)
- Escala a otros usos de Salentino (inventario, CRM, calendario de tostión)
- Free tier suficiente para el volumen esperado
- No requiere código para la operación diaria
- App móvil nativa para el equipo

### Approach D: Notion como base
Similar al C pero con Notion databases.

**Descartado porque:** La API de Notion es más lenta, las notificaciones automáticas requieren Zapier (costo adicional), y el equipo no usa Notion actualmente.

---

## 5. Product Design

### 5.1 Catálogo de Planes

#### SUMINISTRO — *Tú eliges tu café. Siempre fresco, siempre a tiempo.*

| Plan | Gramaje | Precio/envío | Beneficio suscriptor |
|---|---|---|---|
| **Medio** | 454g | $60,000 | Molienda a tu medida |
| **Familiar** ★ | 1kg | $105,000 | + Envío gratis |
| **Abastecimiento** | 2kg | $195,000 | + Envío gratis + prioridad de despacho |

- **Frecuencia:** Semanal / Quincenal / Mensual
- **Cafés disponibles:** Caturra Lavado (Quindío), Blend Regional (Pitalito, Huila)
- **Molienda:** Grano / V60 / Aeropress / Espresso / Prensa Francesa

#### LAB SERIES — *El tostador elige por ti. Lotes que no llegan a la tienda.*

| Plan | Contenido | Precio/envío | Beneficio suscriptor |
|---|---|---|---|
| **Discovery** | 1×250g curada + tarjeta editorial | $68,000 | Acceso a lotes exclusivos |
| **Ritual** ★ | 1×454g curada + tarjeta editorial | $110,000 | + Early access a nuevos lotes |
| **Contraste** | 2×250g perfiles distintos + guía comparativa | $125,000 | + Invitación a cupping semestral |

- **Frecuencia:** Quincenal / Mensual
- **Molienda:** Grano / V60 / Aeropress / Espresso / Prensa Francesa
- **Tarjeta editorial:** Nombre del lote, finca, altitud, proceso, notas de taza, receta de preparación, QR de trazabilidad

#### Beneficios transversales (todos los suscriptores)
- Skip-a-mes sin penalización
- 10% descuento en compras sueltas en salentino.co
- Newsletter privado del tostador (WhatsApp)
- QR de trazabilidad en cada bolsa

### 5.2 Planes en Mercado Pago

Se deben crear **18 planes estáticos** en Mercado Pago (`preapproval_plan`):

```
SUMINISTRO (3 gramajes × 3 frecuencias = 9 planes):
suministro_454_7    → $60,000 semanal
suministro_454_14   → $60,000 quincenal
suministro_454_30   → $60,000 mensual
suministro_1000_7   → $105,000 semanal
suministro_1000_14  → $105,000 quincenal
suministro_1000_30  → $105,000 mensual
suministro_2000_7   → $195,000 semanal
suministro_2000_14  → $195,000 quincenal
suministro_2000_30  → $195,000 mensual

LAB SERIES (3 opciones × 2 frecuencias = 6 planes):
lab_discovery_14    → $68,000 quincenal
lab_discovery_30    → $68,000 mensual
lab_ritual_14       → $110,000 quincenal
lab_ritual_30       → $110,000 mensual
lab_contraste_14    → $125,000 quincenal
lab_contraste_30    → $125,000 mensual

MIGRACIÓN (planes temporales para clientes actuales):
migration_podio_ritual → $90,000 mensual (3 meses, luego migra a lab_ritual_30)
```

**Total: 16 planes permanentes + 1 temporal de migración = 17 planes en MP**

Nota: El plan semanal de Suministro 2kg probablemente no tenga demanda real. Considerar si los 3 planes semanales de Suministro son necesarios. Si se eliminan los semanales de 2kg, quedan **15 planes permanentes**.

### 5.3 Diccionario de Ruteo (Client-Side Lookup)

El frontend mapea cada combinación `(suscripción, plan, frecuencia)` a la URL estática del plan de MP:

```javascript
const MP_PLANS = {
  // SUMINISTRO
  "suministro_454_7":    { price: 60000,  label: "454g Semanal",    url: "https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=..." },
  "suministro_454_14":   { price: 60000,  label: "454g Quincenal",  url: "..." },
  "suministro_454_30":   { price: 60000,  label: "454g Mensual",    url: "..." },
  "suministro_1000_7":   { price: 105000, label: "1kg Semanal",     url: "..." },
  "suministro_1000_14":  { price: 105000, label: "1kg Quincenal",   url: "..." },
  "suministro_1000_30":  { price: 105000, label: "1kg Mensual",     url: "..." },
  "suministro_2000_7":   { price: 195000, label: "2kg Semanal",     url: "..." },
  "suministro_2000_14":  { price: 195000, label: "2kg Quincenal",   url: "..." },
  "suministro_2000_30":  { price: 195000, label: "2kg Mensual",     url: "..." },
  // LAB SERIES
  "lab_discovery_14":    { price: 68000,  label: "Discovery Quincenal",  url: "..." },
  "lab_discovery_30":    { price: 68000,  label: "Discovery Mensual",    url: "..." },
  "lab_ritual_14":       { price: 110000, label: "Ritual Quincenal",     url: "..." },
  "lab_ritual_30":       { price: 110000, label: "Ritual Mensual",       url: "..." },
  "lab_contraste_14":    { price: 125000, label: "Contraste Quincenal",  url: "..." },
  "lab_contraste_30":    { price: 125000, label: "Contraste Mensual",    url: "..." },
};
```

Las URLs se completan una vez creados los planes en el dashboard de Mercado Pago.

---

## 6. Architecture

### 6.1 Flujo completo

```
CLIENTE                    SHOPIFY              AIRTABLE           MERCADO PAGO         EQUIPO
───────                    ───────              ────────           ────────────         ──────
Configura plan        →    Liquid form
Llena datos despacho  →    Valida campos
Submit                →    POST a Airtable  →   Registra suscriptor
                           (via Apps Script)     status: "Pendiente de pago"
                      →    Redirect a MP    →                     →  Checkout estático
                                                                     Cliente paga
                                                                     MP cobra recurrente
                                                                  →  Webhook payment.created
                                                                  →  Apps Script recibe
                                                Google Apps     ←─┘
                                                Script busca
                                                email en Airtable
                                                Actualiza status →   "Por despachar"
                                                Notifica         →                      →  WhatsApp
                                                                                           "Nuevo pago de Juan,
                                                                                            Lab Ritual 454g V60
                                                                                            Calle 10 #40-20"
                                                                                        →  Prepara pedido
                                                                                        →  Arrastra tarjeta
                                                                                           a "En camino"
```

### 6.2 Componentes

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| **Configurador** | React (SushiConveyorMenu adaptado) embebido en Shopify via Theme App Extension | Banda transportadora interactiva con los 6 planes, dialog de configuración con form de suscripción, redirección a MP |
| **Base de datos** | Airtable (free tier) | Registro de suscriptores, estado de suscripción, historial de despachos |
| **Receptor de form** | Google Apps Script (web app) | Recibe POST del form de Shopify, escribe en Airtable via API |
| **Webhook handler** | Google Apps Script (web app) | Recibe webhook de MP, busca suscriptor por email, actualiza estado, notifica |
| **Notificaciones** | WhatsApp Business API o email | Avisa al equipo que hay un pedido por despachar |
| **Gestión operativa** | Airtable kanban + app móvil | El equipo ve, filtra y arrastra tarjetas de despacho |

### 6.3 Estructura de Airtable

#### Tabla: Suscriptores

| Campo | Tipo | Ejemplo |
|---|---|---|
| Nombre | Text | Juan Pérez |
| Email | Email | juan@gmail.com |
| Teléfono | Phone | +573043291215 |
| Dirección | Long text | Calle 10 #40-20, Apto 601 |
| Ciudad | Text | Medellín |
| Notas de entrega | Long text | Portería, dejar con vigilante |
| Tipo de suscripción | Single select | Suministro / Lab Series |
| Plan | Single select | Medio / Familiar / Abastecimiento / Discovery / Ritual / Contraste |
| Café elegido | Single select | Caturra Lavado / Blend Regional / (Selección del tostador) |
| Molienda | Single select | Grano / V60 / Aeropress / Espresso / Prensa Francesa |
| Frecuencia | Single select | Semanal / Quincenal / Mensual |
| Precio/envío | Currency | $105,000 |
| Estado | Single select | Pendiente de pago / Activo / Pausado / Cancelado |
| Fecha de registro | Date | 2026-11-06 |
| MP Plan ID | Text | lab_ritual_30 |

#### Tabla: Despachos

| Campo | Tipo | Ejemplo |
|---|---|---|
| Suscriptor | Link to Suscriptores | Juan Pérez |
| Fecha de pago MP | Date | 2026-11-15 |
| Monto pagado | Currency | $110,000 |
| MP Payment ID | Text | 1298492049 |
| Estado despacho | Single select | Por despachar / En preparación / En camino / Entregado |
| Fecha de despacho | Date | 2026-11-16 |
| Notas | Long text | Molido extra fino por pedido del cliente |

#### Vistas sugeridas

- **Kanban "Despachos"**: Agrupado por Estado despacho (la vista principal del equipo)
- **Calendario "Próximos despachos"**: Vista calendario por fecha estimada de siguiente envío
- **Lista "Suscriptores activos"**: Filtrada por Estado = Activo, ordenada por próximo despacho
- **Lista "Excepciones"**: Filtrada por pagos no matcheados (email no encontrado)

---

## 7. Frontend: Configurador Interactivo — Conveyor Belt

### 7.1 Concepto Visual

El configurador usa un componente de **banda transportadora giratoria** (inspirado en el patrón SushiConveyorMenu de 21st.dev) donde los 6 planes de suscripción circulan como platos en un kaiten. La metáfora es directa: **el café viene a ti, en rotación, como tu suscripción.**

Referencia técnica: `SushiConveyorMenu` — componente React con simulación física de banda oval, platos con tiers por color, autoplay, drag/flick, y dialog de detalle con animación de elevación.

```
                    ╭──────────────────────────╮
                   ╱   ●Lab      ●Lab     ●Lab  ╲         ← Lane trasera (más pequeño)
                  │  Discov.   Ritual   Contraste │
                  │   $68K     $110K     $125K     │
                   ╲                              ╱
                    ╰──────────────────────────╯
                   ╱                              ╲
                  │   ●Sum     ●Sum      ●Sum      │      ← Lane frontal (más grande)
                  │  Medio    Familiar  Abastec.   │
                   ╲  $60K     $105K ★   $195K    ╱
                    ╰──────────────────────────╯

                    La banda gira automáticamente.
                    El usuario pasa el cursor o desliza.
                    Al seleccionar un plan, se eleva y
                    muestra un chip con nombre + precio.
```

### 7.2 Tiers por Color (anillos de los platos)

Los anillos de color identifican visualmente el rango de precio, como en un kaiten real:

| Tier | Color | Planes |
|---|---|---|
| 1 (chart-1) | — | Suministro Medio ($60K) |
| 2 (chart-2) | — | Suministro Familiar ($105K) |
| 3 (chart-3) | — | Lab Series Discovery ($68K) |
| 4 (chart-4) | — | Lab Series Ritual ($110K), Suministro Abastecimiento ($195K) |
| 5 (chart-5) | — | Lab Series Contraste ($125K) |

Leyenda de precios visible debajo de la banda, como en el componente original.

### 7.3 Data Model del Conveyor

Cada plan se mapea a un `ConveyorDish` adaptado para café:

```typescript
interface CoffeePlan {
  id: string;
  name: string;            // "Suministro Familiar"
  description: string;     // "1 kilo de tu café favorito. Envío gratis."
  price: string;           // "$105,000/envío"
  tier: 1 | 2 | 3 | 4 | 5;
  image: string;           // Foto cenital de la bolsa sobre fondo transparente
  details: string[];       // ["1kg", "Tú eliges el café", "Envío gratis"]
}

const SALENTINO_PLANS: CoffeePlan[] = [
  {
    id: "suministro-medio",
    name: "Suministro Medio",
    description: "454g de tu café favorito. Molienda a tu medida.",
    price: "$60,000/envío",
    tier: 1,
    image: "/assets/plan-454g.webp",
    details: ["454g", "Tú eliges", "Semanal · Quincenal · Mensual"],
  },
  {
    id: "suministro-familiar",
    name: "Suministro Familiar",
    description: "1 kilo completo de café fresco. Envío gratis.",
    price: "$105,000/envío",
    tier: 2,
    image: "/assets/plan-1kg.webp",
    details: ["1kg", "Tú eliges", "Envío gratis", "Más popular"],
  },
  {
    id: "suministro-abastecimiento",
    name: "Suministro Abastecimiento",
    description: "2 kilos para que nunca te falte. Envío gratis + prioridad.",
    price: "$195,000/envío",
    tier: 4,
    image: "/assets/plan-2kg.webp",
    details: ["2kg", "Tú eliges", "Envío gratis", "Prioridad de despacho"],
  },
  {
    id: "lab-discovery",
    name: "Lab Series Discovery",
    description: "250g de un lote exclusivo curado por el tostador. Incluye tarjeta editorial.",
    price: "$68,000/envío",
    tier: 3,
    image: "/assets/plan-lab-250g.webp",
    details: ["250g", "El tostador elige", "Lotes exclusivos"],
  },
  {
    id: "lab-ritual",
    name: "Lab Series Ritual",
    description: "454g curados por el tostador. Early access a nuevos lotes.",
    price: "$110,000/envío",
    tier: 4,
    image: "/assets/plan-lab-454g.webp",
    details: ["454g", "El tostador elige", "Early access", "Más popular"],
  },
  {
    id: "lab-contraste",
    name: "Lab Series Contraste",
    description: "2 bolsas de 250g con perfiles distintos + guía comparativa. Cupping semestral.",
    price: "$125,000/envío",
    tier: 5,
    image: "/assets/plan-lab-2x250g.webp",
    details: ["2×250g", "El tostador elige", "Guía comparativa", "Cupping semestral"],
  },
];
```

### 7.4 Flujo de Interacción

```
ESTADO INICIAL
La banda gira automáticamente con los 6 platos.
Eyebrow: "Suscripciones · Café en rotación"
Heading: "Tu café favorito, siempre fresco, siempre a tiempo."
Caption: "Desliza la banda, elige tu plan, activa tu suscripción."

HOVER / TAP EN UN PLATO
El plato se eleva. Aparece chip flotante con nombre + precio.
Caption cambia a: "Suministro Familiar · $105,000/envío"
                  "1 kilo de tu café favorito. Envío gratis."

CLICK / TAP EN PLATO ELEVADO → DIALOG DE CONFIGURACIÓN
Se abre el dialog (modal) con animación de elevación del plato.

┌─────────────────────────────────────────────────────────────┐
│                                          [Cerrar ×]         │
│                                                             │
│    ┌─────────────┐     SUMINISTRO FAMILIAR                  │
│    │             │     01 / 06                               │
│    │  [foto      │                                          │
│    │   cenital   │     1 kilo de tu café favorito.           │
│    │   bolsa]    │     Envío gratis.                         │
│    │             │                                          │
│    │    ● ring   │     [1kg] [Tú eliges] [Envío gratis]     │
│    └─────────────┘                                          │
│                        $105,000 / envío                      │
│                                                             │
│                        ─── Configura tu plan ───             │
│                                                             │
│                        Café:      [Caturra Lavado     ▼]    │
│                        Molienda:  [V60                ▼]    │
│                        Frecuencia:[Quincenal          ▼]    │
│                                                             │
│                        ─── Datos de envío ───                │
│                                                             │
│                        Nombre:    [____________________]    │
│                        Email:     [____________________]    │
│                        Teléfono:  [____________________]    │
│                        Dirección: [____________________]    │
│                        Ciudad:    [Medellín____________]    │
│                        Notas:     [____________________]    │
│                                                             │
│                        [+ ACTIVAR SUSCRIPCIÓN]               │
│                                                             │
└─────────────────────────────────────────────────────────────┘

El botón "Activar suscripción":
1. Valida todos los campos
2. POST datos a Airtable (via Apps Script)
3. Redirige al link estático de MP correspondiente
```

### 7.5 Adaptaciones del Componente Original

| Aspecto original (SushiConveyorMenu) | Adaptación para Salentino |
|---|---|
| `onAdd` → "Add to order" | → "Activar suscripción" (con form dentro del dialog) |
| Dialog muestra solo specs + botón | Dialog incluye selectores (café, molienda, frecuencia) + form de envío |
| Platos con foto cenital de sushi | Fotos cenitales de bolsas de café Salentino |
| `labels.add` = "Add to order" | `labels.add` = "Activar suscripción" |
| `legend` muestra precios por tier | Legend muestra rango: "$60K – $195K" |
| `eyebrow` = "Kaiten · Lunch belt" | `eyebrow` = "Suscripciones · Café en rotación" |

### 7.6 Requisitos Técnicos

- **Stack:** React embebido en Shopify via Theme App Extension (custom element) o página standalone
- **Componente base:** SushiConveyorMenu adaptado (React, ~800 líneas)
- **Tipografía:** Space Mono, monospace (consistente con brand)
- **Cálculo de precios:** 100% client-side via lookup table (0 llamadas al servidor)
- **Validación:** HTML5 nativa + validación inline en el dialog antes de submit
- **Resiliencia:** Si el POST a Airtable falla (timeout >2.5s), guardar en localStorage y proceder con redirección a MP
- **Responsive:** El componente ya maneja mobile (modo carousel con dots) y desktop (banda completa)
- **Accesibilidad:** El componente original incluye roles ARIA, roving tabindex, keyboard navigation, y prefers-reduced-motion

### 7.7 Assets de Producción Requeridos

| Asset | Formato | Especificación |
|---|---|---|
| 6 fotos cenitales de producto | WebP, fondo transparente | Vista top-down de cada bolsa/presentación, centrada en canvas cuadrado (ej: 800×800px) |
| Paleta de colores para tiers | CSS custom properties | Extraer de brand assets (pendiente PDF) |
| Tipografía Space Mono | Google Fonts | Ya definida en brand |

### 7.8 Línea Gráfica

Pendiente: Extraer paleta de colores, tipografía y estilo de copies del archivo de brand assets (PRESENTACIÓN FINAL SALENTINO LAB ASSETS 2026.pdf — requiere exportar páginas clave como imágenes PNG para referencia).

---

## 8. Webhook: MP → Apps Script → Airtable → WhatsApp

### 8.1 Flujo del webhook

```
MP envía POST → Apps Script (web app URL)
                    │
                    ├─ 1. Verificar que es payment.created o payment.updated
                    ├─ 2. Extraer payer.email y payment.status del payload
                    ├─ 3. Si status ≠ "approved" → ignorar, retornar 200
                    ├─ 4. Buscar email en Airtable tabla Suscriptores
                    │     ├─ MATCH → Crear registro en tabla Despachos
                    │     │          Actualizar estado suscriptor a "Activo"
                    │     │          Enviar notificación a WhatsApp
                    │     └─ NO MATCH → Crear registro en vista "Excepciones"
                    │                   Notificar a soporte
                    └─ 5. Retornar HTTP 200 OK
```

### 8.2 Idempotencia

El campo `MP Payment ID` en la tabla Despachos es único. Antes de crear un registro, el script verifica si ya existe un despacho con ese Payment ID. Si existe, ignora y retorna 200.

### 8.3 Notificación a WhatsApp

Formato del mensaje:

```
NUEVO DESPACHO SALENTINO

Cliente: Juan Pérez
Plan: Lab Series Ritual (454g)
Molienda: V60
Dirección: Calle 10 #40-20, Apto 601, Medellín
Teléfono: +573043291215
Monto: $110,000

→ Ver en Airtable: [link]
```

Opciones de implementación (builder decide):
- WhatsApp Business API (requiere cuenta business verificada)
- Email a grupo del equipo (más simple, funciona desde Apps Script sin APIs externas)
- Notificación de Airtable Automations (si se prefiere evitar el Apps Script para notificaciones)

---

## 9. Edge Cases

| Escenario | Qué pasa | Resolución |
|---|---|---|
| **Email mismatch** | Cliente llena form con email A, paga en MP con email B | Cae en vista "Excepciones" de Airtable. Soporte vincula manualmente. |
| **Webhook duplicado** | MP reintenta el webhook | Chequeo de MP Payment ID único antes de crear despacho. |
| **Form falla, redirección funciona** | Cliente paga pero no hay registro en Airtable | El webhook crea el registro en Excepciones. Soporte contacta al cliente para completar datos. Backup: localStorage del cliente con los datos. |
| **Pago rechazado** | Tarjeta sin fondos | MP envía status "rejected". Script ignora (no crea despacho). MP reintenta según configuración del plan. |
| **Cliente quiere cambiar plan** | Cambio de molienda, gramaje o frecuencia | Soporte actualiza en Airtable + cancela plan viejo en MP + suscribe a plan nuevo. Proceso manual aceptable para 30 clientes. |
| **Cliente quiere pausar** | Skip-a-mes | Soporte marca "Pausado" en Airtable. En MP se pausa el preapproval. |
| **Cliente quiere cancelar** | Fin de suscripción | Soporte marca "Cancelado" en Airtable. En MP se cancela el preapproval. |

---

## 10. Migración de Clientes Actuales

| Cliente | Plan actual | Acción |
|---|---|---|
| Cliente GRID | $72,000/mes por 454g | Migrar a Suministro Medio ($60,000). Notificar mejora de precio como beneficio de loyalty. |
| Cliente Podio | $90,000/mes por 340g especialidad | Migrar a Lab Series Ritual (454g). Mantener precio de $90,000 por 3 meses como transición. Luego $110,000. Recibe 114g más de café al mismo precio — upgrade percibido. |

---

## 11. Definition of Done

- [ ] 16 planes creados y activos en Mercado Pago (+ 1 temporal de migración)
- [ ] Configurador Conveyor Belt (React) funcional en salentino.co con banda animada y dialog de suscripción
- [ ] 6 fotos cenitales de producto en WebP transparente (1 por plan)
- [ ] Airtable configurado con tablas Suscriptores y Despachos, vistas kanban y calendario
- [ ] Google Apps Script receptor de form funcionando (Shopify → Airtable)
- [ ] Google Apps Script webhook de MP funcionando (MP → Airtable → notificación)
- [ ] Idempotencia verificada: webhook duplicado no crea despacho duplicado
- [ ] Tarjeta editorial diseñada (plantilla) para Lab Series
- [ ] 2 clientes actuales migrados exitosamente
- [ ] Equipo de tostión capacitado en uso de Airtable kanban (15 min de demo)
- [ ] Test end-to-end: form → Airtable → MP pago → webhook → notificación → tarjeta en kanban

---

## 12. What's Left to the Builder

- Elección entre WhatsApp Business API vs. email para notificaciones
- Adaptación exacta del SushiConveyorMenu: extensión del dialog para incluir form de configuración + datos de envío
- Método de embebido de React en Shopify (Theme App Extension con custom element, o página standalone con iframe)
- Estructura interna del Google Apps Script (una o dos funciones web app)
- Si usar Airtable Automations como complemento o alternativa al Apps Script para notificaciones
- Decisión sobre eliminar planes semanales para Suministro 2kg (probablemente innecesarios)
- Formato exacto y diseño de la tarjeta editorial de Lab Series
