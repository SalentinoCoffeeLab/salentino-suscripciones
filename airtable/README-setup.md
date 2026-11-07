# Airtable Base Setup — Salentino Suscripciones

## Paso 1: Crear Base

1. Ir a [airtable.com](https://airtable.com) → **Add a base** → "Start from scratch"
2. Nombrar la base: **Salentino Suscripciones**

## Paso 2: Tabla "Suscriptores"

Renombrar la tabla por defecto. Crear los siguientes campos (eliminar los campos ejemplo que Airtable crea):

| Campo | Tipo | Opciones |
|---|---|---|
| Nombre | Single line text | — |
| Email | Email | — |
| Teléfono | Phone number | — |
| Dirección | Long text | — |
| Ciudad | Single line text | Default: "Medellín" |
| Notas de entrega | Long text | — |
| Tipo de suscripción | Single select | Suministro, Lab Series |
| Plan | Single select | Medio, Familiar, Abastecimiento, Discovery, Ritual, Contraste |
| Café elegido | Single select | Caturra Lavado, Blend Regional, Selección del tostador |
| Molienda | Single select | Grano, V60, Aeropress, Espresso, Prensa Francesa |
| Frecuencia | Single select | Semanal, Quincenal, Mensual |
| Precio/envío | Currency | COP, 0 decimals |
| Estado | Single select | Pendiente de pago, Activo, Pausado, Cancelado |
| Fecha de registro | Date | Include time: No |
| MP Plan ID | Single line text | — |
| Lote enviado | Single line text | — (para trazabilidad Lab Series) |

## Paso 3: Tabla "Despachos"

Crear segunda tabla con:

| Campo | Tipo | Opciones |
|---|---|---|
| Suscriptor | Link to another record | → Suscriptores |
| Fecha de pago MP | Date | Include time: No |
| Monto pagado | Currency | COP, 0 decimals |
| MP Payment ID | Single line text | — |
| Estado despacho | Single select | Por despachar, En preparación, En camino, Entregado |
| Fecha de despacho | Date | Include time: No |
| Lote enviado | Single line text | — |
| Notas | Long text | — |

## Paso 4: Vistas

### En tabla Despachos:
- **Kanban "Despachos"**: Vista → Kanban → agrupar por `Estado despacho`
- **Calendar "Próximos despachos"**: Vista → Calendar → campo `Fecha de despacho`

### En tabla Suscriptores:
- **Grid "Suscriptores activos"**: Vista → Grid → filtro: `Estado` is "Activo"
- **Grid "Excepciones"**: Vista → Grid → filtro: `Estado` is "Pendiente de pago" AND `Fecha de registro` is before 1 day ago

## Paso 5: Personal Access Token

1. Ir a [airtable.com/create/tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Nombre: "Salentino Subscriptions"
4. Scopes: `data.records:read`, `data.records:write`
5. Access: seleccionar la base "Salentino Suscripciones"
6. Copiar el token → guardar como `AIRTABLE_PAT`
7. Copiar el Base ID de la URL del base (empieza con `app...`) → guardar como `AIRTABLE_BASE_ID`

## Paso 6: Verificar Schema

```bash
AIRTABLE_PAT=patXXX AIRTABLE_BASE_ID=appXXX node airtable/seed-test-record.js
```

Esperado: "Schema verified. Test record created and deleted."
