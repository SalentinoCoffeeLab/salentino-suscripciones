import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const screenshotsDir = path.join(__dirname, 'screenshots')
const BASE_URL = 'http://localhost:5174'

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })
  const page = await context.newPage()

  // ── Step 1: Initial page ─────────────────────────────────────────────────
  console.log('Navigating to', BASE_URL)
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await sleep(800)
  await page.screenshot({ path: `${screenshotsDir}/01-step1-initial.png`, fullPage: true })
  console.log('Screenshot 1 saved')

  // Dump visible text so we can read the page
  const step1Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 1 text ---\n', step1Text, '\n---')

  // ── Step 2: Click "Café de diario" ───────────────────────────────────────
  console.log('Looking for Café de diario card...')
  const cafeDiario = page.locator('text=Café de diario').first()
  await cafeDiario.waitFor({ state: 'visible', timeout: 10000 })
  await cafeDiario.click()
  await sleep(800)
  await page.screenshot({ path: `${screenshotsDir}/02-step2-after-select-plan.png`, fullPage: true })
  console.log('Screenshot 2 saved')

  const step2Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 2 text ---\n', step2Text, '\n---')

  // ── Step 3: Select "2 tazas" ─────────────────────────────────────────────
  console.log('Looking for 2 tazas option...')
  const dosTazas = page.locator('text=2 tazas').first()
  await dosTazas.waitFor({ state: 'visible', timeout: 8000 })
  await dosTazas.click()
  await sleep(500)

  // ── Step 4: Select "V60 / filtro" ────────────────────────────────────────
  console.log('Looking for V60 / filtro option...')
  // Try multiple possible labels
  const v60 = page.locator('text=/V60|filtro/i').first()
  await v60.waitFor({ state: 'visible', timeout: 8000 })
  await v60.click()
  await sleep(500)

  await page.screenshot({ path: `${screenshotsDir}/03-step2-cups-grind-selected.png`, fullPage: true })
  console.log('Screenshot 3 saved')

  const step3Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 2 (after selections) text ---\n', step3Text, '\n---')

  // ── Step 5: Click "Continuar a entrega" ──────────────────────────────────
  console.log('Looking for Continuar button...')
  const continuar = page.locator('text=/Continuar/i').first()
  await continuar.waitFor({ state: 'visible', timeout: 8000 })
  await continuar.click()
  await sleep(800)
  await page.screenshot({ path: `${screenshotsDir}/04-step3-delivery.png`, fullPage: true })
  console.log('Screenshot 4 saved')

  const step4Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 3 text ---\n', step4Text, '\n---')

  // ── Step 6: Click "← Volver" ─────────────────────────────────────────────
  console.log('Looking for Volver button...')
  const volver = page.locator('text=/Volver/i').first()
  await volver.waitFor({ state: 'visible', timeout: 8000 })
  await volver.click()
  await sleep(800)
  await page.screenshot({ path: `${screenshotsDir}/05-step2-after-back.png`, fullPage: true })
  console.log('Screenshot 5 saved')

  const step5Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 2 (after back) text ---\n', step5Text, '\n---')

  // ── Step 7: Use stepper to go back to Step 1 ─────────────────────────────
  console.log('Looking for Step 1 stepper...')
  // Try clicking on "Paso 1" or the first stepper indicator
  const stepperOne = page.locator('[data-step="1"], [data-testid*="step-1"], button:has-text("1")').first()
  let stepperClicked = false
  if (await stepperOne.count() > 0) {
    await stepperOne.click()
    stepperClicked = true
  } else {
    // Try clicking on "1" indicator or "Elige tu café" stepper label
    const stepperAlt = page.locator('text=/Elige tu café|Paso 1|Step 1/i').first()
    if (await stepperAlt.count() > 0) {
      await stepperAlt.click()
      stepperClicked = true
    }
  }

  if (!stepperClicked) {
    console.log('Could not find stepper — trying generic step indicator')
    // Last resort: find any element that looks like a step number
    const allButtons = await page.locator('button, [role="button"]').all()
    for (const btn of allButtons) {
      const txt = (await btn.textContent() || '').trim()
      if (txt === '1') {
        await btn.click()
        stepperClicked = true
        break
      }
    }
  }

  await sleep(800)
  await page.screenshot({ path: `${screenshotsDir}/06-step1-via-stepper.png`, fullPage: true })
  console.log('Screenshot 6 saved — stepper clicked:', stepperClicked)

  const step6Text = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('--- Step 1 (via stepper) text ---\n', step6Text, '\n---')

  await browser.close()
  console.log('Done. Screenshots saved to', screenshotsDir)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
