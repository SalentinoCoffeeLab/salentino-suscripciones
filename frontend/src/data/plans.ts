export interface CoffeePlan {
  id: string
  line: 'diario' | 'especial'
  code: string
  name: string
  description: string
  weight: string
  priceFrom: number
  /** Precio de la misma bolsa comprada suelta en la tienda + envío estándar Medellín ($15.000) */
  retailWithShipping: number
  frequencies: number[]
  meta: string[]
  image: string
  cupsPerShipment: number
}

export const SALENTINO_PLANS: CoffeePlan[] = [
  {
    id: 'diario-454',
    line: 'diario',
    code: 'SUM-01',
    name: '454 g',
    description: 'Perfil fijo · Alto rendimiento',
    weight: '454g',
    priceFrom: 72000,
    retailWithShipping: 79000,  // $64.000 bolsa + $15.000 envío
    frequencies: [15, 30],
    meta: ['RENDIMIENTO: ~30 tazas', 'PERFIL: Caturra Lavado Tradicional'],
    image: '/assets/plan-454g.webp',
    cupsPerShipment: 30,
  },
  {
    id: 'diario-1kg',
    line: 'diario',
    code: 'SUM-02',
    name: '1 kg',
    description: 'Perfil fijo · Alto rendimiento',
    weight: '1kg',
    priceFrom: 115000,
    retailWithShipping: 135000,  // $120.000 bolsa + $15.000 envío
    frequencies: [15, 30],
    meta: ['RENDIMIENTO: ~66 tazas', 'PERFIL: Caturra Lavado Tradicional'],
    image: '/assets/plan-1kg.webp',
    cupsPerShipment: 66,
  },
  {
    id: 'especial-250',
    line: 'especial',
    code: 'LAB-01',
    name: '1 bolsa',
    description: 'Micro-lotes y varietales rotativos',
    weight: '250g',
    priceFrom: 80000,
    retailWithShipping: 95000,  // $80.000 bolsa + $15.000 envío
    frequencies: [30],
    meta: ['RENDIMIENTO: ~16 tazas', 'ROTACIÓN: 1 perfil exclusivo por entrega'],
    image: '/assets/plan-lab-250g.webp',
    cupsPerShipment: 16,
  },
  {
    id: 'especial-500',
    line: 'especial',
    code: 'LAB-02',
    name: '2 bolsas',
    description: 'Micro-lotes y varietales rotativos',
    weight: '500g',
    priceFrom: 160000,
    retailWithShipping: 175000,  // $160.000 (2×$80.000) + $15.000 envío
    frequencies: [30],
    meta: ['RENDIMIENTO: ~33 tazas', 'ROTACIÓN: 2 perfiles distintos por entrega'],
    image: '/assets/plan-lab-2x250g.webp',
    cupsPerShipment: 33,
  },
]

const PLAN_KEY_MAP: Record<string, { prefix: string; frequencies: number[] }> = {
  'diario-454': { prefix: 'diario_454', frequencies: [15, 30] },
  'diario-1kg': { prefix: 'diario_1kg', frequencies: [15, 30] },
  'especial-250': { prefix: 'especial_250', frequencies: [30] },
  'especial-500': { prefix: 'especial_500', frequencies: [30] },
}

const MP_LOOKUP: Record<string, { checkoutUrl: string; monthlyPrice: number }> = {
  diario_454_15: { checkoutUrl: 'https://mpago.la/2NxCn4C', monthlyPrice: 140000 },
  diario_454_30: { checkoutUrl: 'https://mpago.la/146kVHk', monthlyPrice: 72000 },
  diario_1kg_15: { checkoutUrl: 'https://mpago.la/2qFkE4a', monthlyPrice: 230000 },
  diario_1kg_30: { checkoutUrl: 'https://mpago.la/1gzdvvs', monthlyPrice: 115000 },
  especial_250_15: { checkoutUrl: 'https://mpago.la/1fUumqj', monthlyPrice: 180000 },
  especial_250_30: { checkoutUrl: 'https://mpago.la/31Qm3xA', monthlyPrice: 80000 },
  especial_500_30: { checkoutUrl: 'https://mpago.la/1LmZd4D', monthlyPrice: 160000 },
}

export function getPlanById(id: string): CoffeePlan | undefined {
  return SALENTINO_PLANS.find(p => p.id === id)
}

export function getPlansForLine(line: 'diario' | 'especial'): CoffeePlan[] {
  return SALENTINO_PLANS.filter(p => p.line === line)
}

export function getMonthlyPrice(planId: string, frequency: number): number | undefined {
  const mapping = PLAN_KEY_MAP[planId]
  if (!mapping || !mapping.frequencies.includes(frequency)) return undefined
  const key = `${mapping.prefix}_${frequency}`
  return MP_LOOKUP[key]?.monthlyPrice
}

export function getPerShipmentPrice(planId: string, frequency: number): number | undefined {
  const monthly = getMonthlyPrice(planId, frequency)
  if (monthly === undefined) return undefined
  const deliveries = frequency === 15 ? 2 : 1
  return Math.round(monthly / deliveries)
}

export function getCheckoutUrl(planId: string, frequency: number): string | undefined {
  const mapping = PLAN_KEY_MAP[planId]
  if (!mapping) return undefined
  if (!mapping.frequencies.includes(frequency)) return undefined
  const key = `${mapping.prefix}_${frequency}`
  return MP_LOOKUP[key]?.checkoutUrl
}

export function getFrequencies(planId: string): number[] {
  return PLAN_KEY_MAP[planId]?.frequencies ?? []
}

export function getMpPlanKey(planId: string, frequency: number): string | undefined {
  const mapping = PLAN_KEY_MAP[planId]
  if (!mapping || !mapping.frequencies.includes(frequency)) return undefined
  return `${mapping.prefix}_${frequency}`
}

export function formatPrice(amount: number): string {
  const str = String(Math.round(amount))
  let out = ''
  let rem = str
  while (rem.length > 3) {
    out = '.' + rem.slice(-3) + out
    rem = rem.slice(0, -3)
  }
  return '$' + rem + out
}

/* ── Frequency data ── */

export interface FrequencyOption {
  id: string
  label: string
  days: number
  deliveriesPerMonth: number
}

export function getFrequencyOptions(line: 'diario' | 'especial'): FrequencyOption[] {
  if (line === 'diario') {
    return [
      { id: 'quincenal', label: 'Cada 15 días', days: 15, deliveriesPerMonth: 2 },
      { id: 'mensual', label: 'Cada mes', days: 30, deliveriesPerMonth: 1 },
    ]
  }
  return [
    { id: 'quincenal', label: 'Cada 15 días', days: 15, deliveriesPerMonth: 2 },
    { id: 'mensual', label: 'Cada mes', days: 30, deliveriesPerMonth: 1 },
  ]
}

/* ── Cups recommendation engine ── */

export interface CupsOption {
  id: string
  label: string
  cupsPerMonth: number
}

export const CUPS_OPTIONS: CupsOption[] = [
  { id: 'bolsa', label: '1 bolsa al mes', cupsPerMonth: 10 },
  { id: 'menos', label: 'Menos de 1', cupsPerMonth: 15 },
  { id: '1', label: '1 taza', cupsPerMonth: 30 },
  { id: '2', label: '2 tazas', cupsPerMonth: 60 },
  { id: '3', label: '3 o más', cupsPerMonth: 105 },
]

export interface Recommendation {
  plan: CoffeePlan
  frequency: FrequencyOption
  cupsPerMonth: number
  monthlyPrice: number
  isShort: boolean
}

export function recommendPlan(line: 'diario' | 'especial', cupsNeeded: number): Recommendation {
  const plans = getPlansForLine(line)
  const freqs = getFrequencyOptions(line)

  const combos: Array<{
    plan: CoffeePlan
    freq: FrequencyOption
    cups: number
    cost: number
  }> = []

  for (const plan of plans) {
    for (const freq of freqs) {
      if (!plan.frequencies.includes(freq.days)) continue
      const monthly = getMonthlyPrice(plan.id, freq.days)
      if (monthly === undefined) continue
      combos.push({
        plan,
        freq,
        cups: plan.cupsPerShipment * freq.deliveriesPerMonth,
        cost: monthly,
      })
    }
  }

  const sufficient = combos.filter(c => c.cups >= cupsNeeded)

  if (sufficient.length > 0) {
    sufficient.sort((a, b) => a.cost - b.cost || a.cups - b.cups)
    const best = sufficient[0]
    return {
      plan: best.plan,
      frequency: best.freq,
      cupsPerMonth: best.cups,
      monthlyPrice: best.cost,
      isShort: false,
    }
  }

  combos.sort((a, b) => b.cups - a.cups)
  const biggest = combos[0]
  return {
    plan: biggest.plan,
    frequency: biggest.freq,
    cupsPerMonth: biggest.cups,
    monthlyPrice: biggest.cost,
    isShort: true,
  }
}

/* ── Grind options ── */

export interface GrindOption {
  id: string
  label: string
  sub: string
}

export const GRIND_OPTIONS: GrindOption[] = [
  { id: 'grano', label: 'Grano entero', sub: 'Sin moler' },
  { id: 'prensa', label: 'Prensa', sub: 'Gruesa' },
  { id: 'aeropress', label: 'Aeropress', sub: 'Media' },
  { id: 'cafetera', label: 'Cafetera', sub: 'Media — goteo / eléctrica' },
  { id: 'v60', label: 'V60 / filtro', sub: 'Media-fina' },
  { id: 'espresso', label: 'Espresso', sub: 'Fina' },
]

/* ── Line metadata ── */

export interface LineInfo {
  key: 'diario' | 'especial'
  name: string
  code: string
  kicker: string
  from: string
  meta: string[]
  coffee: string
}

export const LINE_INFO: Record<string, LineInfo> = {
  diario: {
    key: 'diario',
    name: 'Café de diario',
    code: 'SUM',
    kicker: 'PERFIL FIJO',
    from: 'Desde $70.000/entrega',
    meta: [
      'ORIGEN: Salento, Quindío',
      'NOTAS: Chocolate amargo, caramelo, panela',
      'TAMAÑOS: 454 g o 1 kg por entrega',
    ],
    coffee: 'Caturra Lavado Tradicional',
  },
  especial: {
    key: 'especial',
    name: 'Ediciones especiales',
    code: 'LAB',
    kicker: 'ROTATIVO · MICRO-LOTES',
    from: 'Desde $80.000/entrega',
    meta: [
      'ORIGEN: Rota entre los lotes disponibles',
      'NOTAS: Llegan escritas con cada bolsa',
      'TAMAÑOS: 1 o 2 bolsas de 250 g',
    ],
    coffee: 'Selección del tostador',
  },
}

export const CITIES = ['Medellín', 'Envigado', 'Sabaneta', 'Itagüí', 'Bello', 'Otra ciudad']
