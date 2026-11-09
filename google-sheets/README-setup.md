# Google Sheets Setup — Salentino Suscripciones

## Paso 1: Crear el Sheet

1. Ir a [sheets.google.com](https://sheets.google.com) → hoja nueva
2. Renombrar a: **Salentino Suscripciones**
3. Copiar el Sheet ID de la URL: `docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

## Paso 2: Tab "Suscriptores"

Renombrar la primera pestaña a **Suscriptores**. Escribir estos headers en la fila 1 (una celda por columna, A1:Q1):

```
Nombre | Email | Teléfono | Dirección | Ciudad | Notas de entrega | Tipo de suscripción | Plan | Café elegido | Molienda | Frecuencia | Precio/envío | Estado | Fecha de registro | MP Plan ID | Lote enviado | Código descuento
```

Formato recomendado:
- Fila 1: negrita, fondo gris claro, congelar fila
- Columna L (Precio/envío): formato moneda sin decimales
- Columna N (Fecha de registro): formato fecha

## Paso 3: Tab "Despachos"

Crear segunda pestaña: **Despachos**. Headers en fila 1 (A1:H1):

```
Suscriptor Email | Fecha de pago MP | Monto pagado | MP Payment ID | Estado despacho | Fecha de despacho | Lote enviado | Notas
```

Formato:
- Fila 1: negrita, fondo gris claro, congelar fila
- Columna C (Monto pagado): formato moneda sin decimales
- Columnas B y F: formato fecha

## Paso 4: Validación de datos (opcional pero recomendado)

En tab **Suscriptores**, agregar Data Validation (Data → Data validation):

| Columna | Regla | Opciones |
|---|---|---|
| G (Tipo de suscripción) | Dropdown | Café de Diario, Ediciones Especiales |
| H (Plan) | Dropdown | 454G, 1 KG, 250G · UN ORIGEN, 500G · DOS ORÍGENES |
| I (Café elegido) | Dropdown | Caturra Lavado Tradicional, Selección del tostador |
| J (Molienda) | Dropdown | Grano, V60, Aeropress, Espresso, Prensa Francesa |
| K (Frecuencia) | Dropdown | Quincenal, Mensual |
| M (Estado) | Dropdown | Pendiente de pago, Activo, Pausado, Cancelado |

En tab **Despachos**:

| Columna | Regla | Opciones |
|---|---|---|
| E (Estado despacho) | Dropdown | Por despachar, En preparación, En camino, Entregado |

## Paso 5: Vistas con filtros

En tab **Suscriptores** (Data → Create a filter):
- Filtro guardado "Activos": columna M = "Activo"
- Filtro guardado "Excepciones": columna M = "Pendiente de pago"

En tab **Despachos**:
- Filtro guardado "Por despachar": columna E = "Por despachar"

## Paso 6: Configurar Apps Scripts

Ambos Apps Scripts necesitan esta Script Property:

| Propiedad | Valor |
|---|---|
| `SPREADSHEET_ID` | El Sheet ID del paso 1 |
| `TEAM_EMAIL` | Email del equipo (ej: team@salentino.co) |

El webhook necesita además:

| Propiedad | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | Token de Mercado Pago |

Para configurar: Apps Script editor → Project Settings → Script Properties → Add.

## Paso 7: Permisos

El Sheet debe ser accesible por las cuentas que ejecutan los Apps Scripts. Si ambos scripts se ejecutan desde la misma cuenta de Google, no se necesita nada extra — SpreadsheetApp accede automáticamente a los Sheets del usuario.

Si los scripts corren desde otra cuenta: Share → agregar el email del script con permiso de Editor.
