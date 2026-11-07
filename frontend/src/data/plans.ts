export interface CoffeePlan {
  id: string
  name: string
  description: string
  price: string
  tier: 1 | 2 | 3 | 4 | 5
  image: string
  details: string[]
}

export const SALENTINO_PLANS: CoffeePlan[] = [
  {
    id: 'suministro-medio',
    name: 'Suministro Medio',
    description: '454g de tu café favorito. Molienda a tu medida.',
    price: '$60,000/envío',
    tier: 1,
    image: '/assets/plan-454g.webp',
    details: ['454g', 'Tú eliges', 'Semanal · Quincenal · Mensual'],
  },
  {
    id: 'suministro-familiar',
    name: 'Suministro Familiar',
    description: '1 kilo completo de café fresco. Envío gratis.',
    price: '$105,000/envío',
    tier: 2,
    image: '/assets/plan-1kg.webp',
    details: ['1kg', 'Tú eliges', 'Envío gratis', 'Más popular'],
  },
  {
    id: 'suministro-abastecimiento',
    name: 'Suministro Abastecimiento',
    description: '2 kilos para que nunca te falte. Envío gratis + prioridad.',
    price: '$195,000/envío',
    tier: 4,
    image: '/assets/plan-2kg.webp',
    details: ['2kg', 'Tú eliges', 'Envío gratis', 'Prioridad de despacho'],
  },
  {
    id: 'lab-discovery',
    name: 'Lab Series Discovery',
    description: '250g de un lote exclusivo curado por el tostador. Incluye tarjeta editorial.',
    price: '$68,000/envío',
    tier: 3,
    image: '/assets/plan-lab-250g.webp',
    details: ['250g', 'El tostador elige', 'Lotes exclusivos'],
  },
  {
    id: 'lab-ritual',
    name: 'Lab Series Ritual',
    description: '454g curados por el tostador. Early access a nuevos lotes.',
    price: '$110,000/envío',
    tier: 4,
    image: '/assets/plan-lab-454g.webp',
    details: ['454g', 'El tostador elige', 'Early access', 'Más popular'],
  },
  {
    id: 'lab-contraste',
    name: 'Lab Series Contraste',
    description: '2 bolsas de 250g con perfiles distintos + guía comparativa. Cupping semestral.',
    price: '$125,000/envío',
    tier: 5,
    image: '/assets/plan-lab-2x250g.webp',
    details: ['2×250g', 'El tostador elige', 'Guía comparativa', 'Cupping semestral'],
  },
]

// Map plan IDs to MP plan key prefixes
const PLAN_KEY_MAP: Record<string, { prefix: string; frequencies: number[] }> = {
  'suministro-medio': { prefix: 'suministro_454', frequencies: [7, 14, 30] },
  'suministro-familiar': { prefix: 'suministro_1000', frequencies: [7, 14, 30] },
  'suministro-abastecimiento': { prefix: 'suministro_2000', frequencies: [7, 14, 30] },
  'lab-discovery': { prefix: 'lab_discovery', frequencies: [14, 30] },
  'lab-ritual': { prefix: 'lab_ritual', frequencies: [14, 30] },
  'lab-contraste': { prefix: 'lab_contraste', frequencies: [14, 30] },
}

// Loaded from mercadopago/plans-catalog.json at build time
// In production, replace PENDING URLs with real MP checkout URLs
const MP_LOOKUP: Record<string, { planId: string; checkoutUrl: string; price: number }> = {
  suministro_454_7: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_454_7', price: 60000 },
  suministro_454_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_454_14', price: 60000 },
  suministro_454_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_454_30', price: 60000 },
  suministro_1000_7: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_1000_7', price: 105000 },
  suministro_1000_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_1000_14', price: 105000 },
  suministro_1000_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_1000_30', price: 105000 },
  suministro_2000_7: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_2000_7', price: 195000 },
  suministro_2000_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_2000_14', price: 195000 },
  suministro_2000_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_2000_30', price: 195000 },
  lab_discovery_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_disc_14', price: 68000 },
  lab_discovery_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_disc_30', price: 68000 },
  lab_ritual_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_rit_14', price: 110000 },
  lab_ritual_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_rit_30', price: 110000 },
  lab_contraste_14: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_con_14', price: 125000 },
  lab_contraste_30: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_con_30', price: 125000 },
  migration_podio_ritual: { planId: 'PENDING', checkoutUrl: 'https://www.mercadopago.com.co/subscriptions/checkout?preapproval_plan_id=PENDING_mig', price: 90000 },
}

export function getPlanById(id: string): CoffeePlan | undefined {
  return SALENTINO_PLANS.find(p => p.id === id)
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
