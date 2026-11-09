import { test, expect } from '@playwright/test'
import path from 'path'

const SCREENSHOT_DIR = '/tmp/salentino-review'
const BASE_URL = 'http://localhost:5174'

test.describe('Salentino Subscription App — Full Review Journey', () => {
  test.setTimeout(90000)

  test('complete review of all states', async ({ page }) => {
    // ── Screenshot 1: Open the app — Step 1 with two coffee line cards ────
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-step1-initial-two-cards.png'),
      fullPage: true,
    })
    console.log('Screenshot 01: Step 1 initial state with two coffee line cards')

    // ── Verify "Continuar a configurar" is NOT visible when no line selected ──
    const continueToConfigureBtn = page.getByRole('button', { name: /continuar a configurar/i })
    const isVisible = await continueToConfigureBtn.isVisible().catch(() => false)
    if (isVisible) {
      console.log('FAIL: "Continuar a configurar" is visible when no line is selected — BUG')
    } else {
      console.log('PASS: "Continuar a configurar" correctly hidden when no line selected')
    }

    // ── Verify Step 2 is not reachable via stepper (should be disabled) ───
    const stepperButtons = await page.getByRole('listitem').getByRole('button').all()
    console.log(`Stepper buttons count: ${stepperButtons.length}`)
    if (stepperButtons.length >= 2) {
      const step2StepperBtn = stepperButtons[1]
      const step2Disabled = await step2StepperBtn.isDisabled()
      console.log(`Step 2 stepper button disabled (no line selected): ${step2Disabled}`)
    }

    // ── Screenshot 2: Click "Café de diario" card → advances to Step 2 ───
    // The card itself triggers navigation — clicking it dispatches SELECT_LINE and advances to step 2
    const cafeDiarioCard = page.getByRole('radio', { name: /café de diario/i })
    await cafeDiarioCard.click()
    await page.waitForTimeout(400)

    // Should now be on Step 2 (Configura)
    const step2Heading = page.getByRole('heading', { name: /02.*configura/i })
    const onStep2 = await step2Heading.isVisible().catch(() => false)
    if (onStep2) {
      console.log('PASS: Clicking Café de diario card correctly advances to Step 2')
    } else {
      console.log('NOTE: Checking if still on Step 1 after card click...')
      // The card click advances to step 2 AND there is a "Continuar a configurar" button on step 1
      // But SELECT_LINE directly jumps to step 2 based on reducer
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-step2-after-clicking-cafe-diario.png'),
      fullPage: true,
    })
    console.log('Screenshot 02: After clicking Café de diario — Step 2')

    // ── Screenshot 3: Verify disabled "continue" button on Step 2 ─────────
    // The button text is "Elige tazas y molienda" when disabled (not "Continuar a entrega")
    const stepConfigBtn = page.getByRole('button', { name: /elige tazas y molienda/i })
    const isBtnVisible = await stepConfigBtn.isVisible().catch(() => false)
    console.log(`"Elige tazas y molienda" button visible: ${isBtnVisible}`)

    if (isBtnVisible) {
      const isBtnDisabled = await stepConfigBtn.isDisabled()
      console.log(`Button disabled (no selections): ${isBtnDisabled}`)
      if (isBtnDisabled) {
        console.log('PASS: Continue button correctly disabled when no cups/grind selected')
      } else {
        console.log('FAIL: Continue button should be disabled — BUG')
      }
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-step2-continue-button-disabled-state.png'),
      fullPage: true,
    })
    console.log('Screenshot 03: Step 2 showing disabled continue button (Elige tazas y molienda)')

    // ── Screenshot 4: Click "1 TAZA" cups option → show recommendation banner ──
    const unaTazaBtn = page.getByRole('radio', { name: /1 taza/i })
    await unaTazaBtn.click()
    await page.waitForTimeout(400)

    // Check for recommendation banner
    const recBanner = page.locator('.pop').filter({ hasText: /recomendamos|elegiste/i })
    const bannerVisible = await recBanner.isVisible().catch(async () => {
      // Try alternative
      const anyBanner = page.getByText(/te recomendamos/i)
      return anyBanner.isVisible().catch(() => false)
    })
    console.log(`Recommendation banner visible after 1 taza: ${bannerVisible}`)

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-step2-1taza-selected-recommendation-banner.png'),
      fullPage: true,
    })
    console.log('Screenshot 04: After selecting 1 taza — recommendation banner should appear')

    // ── Screenshot 5: Click "V60 / FILTRO" grind option ───────────────────
    const v60Btn = page.getByRole('radio', { name: /v60/i })
    await v60Btn.click()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-step2-v60-selected.png'),
      fullPage: true,
    })
    console.log('Screenshot 05: After selecting V60 / Filtro grind')

    // Verify button is now enabled and shows "Continuar a entrega"
    const continueToDeliveryBtn = page.getByRole('button', { name: /continuar a entrega/i })
    const isEnabled = await continueToDeliveryBtn.isEnabled().catch(() => false)
    console.log(`"Continuar a entrega" button enabled after selections: ${isEnabled}`)
    if (isEnabled) {
      console.log('PASS: Continue button enabled after cups and grind selected')
    } else {
      console.log('FAIL: Continue button should be enabled — BUG')
    }

    // ── Screenshot 6: Click "Continuar a entrega" → Step 3 ───────────────
    await continueToDeliveryBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-step3-delivery-form.png'),
      fullPage: true,
    })
    console.log('Screenshot 06: Step 3 — Delivery form')

    // ── Verify orange asterisks on all labels ─────────────────────────────
    const asteriskSpans = page.locator('label span').filter({ hasText: '*' })
    const asteriskCount = await asteriskSpans.count()
    console.log(`Orange asterisk (*) spans in labels: ${asteriskCount}`)
    if (asteriskCount >= 5) {
      console.log('PASS: All 5 required fields have asterisk markers')
    } else {
      console.log(`NOTE: Found ${asteriskCount} asterisks, expected 5 (email, nombre, celular, dirección, ciudad)`)
    }

    // Verify payment button is disabled when form is empty
    const payBtn = page.getByRole('button', { name: /completa tus datos/i })
    const payBtnVisible = await payBtn.isVisible().catch(() => false)
    if (payBtnVisible) {
      const payBtnDisabled = await payBtn.isDisabled()
      console.log(`Payment button ("Completa tus datos") disabled: ${payBtnDisabled}`)
      if (payBtnDisabled) {
        console.log('PASS: Payment button correctly disabled when form is empty')
      } else {
        console.log('FAIL: Payment button should be disabled — BUG')
      }
    } else {
      // Log all buttons visible
      const allBtns = await page.getByRole('button').all()
      console.log(`All buttons on Step 3 (${allBtns.length}):`)
      for (const btn of allBtns) {
        const txt = await btn.textContent()
        const dis = await btn.isDisabled()
        console.log(`  "${txt?.trim()}" — disabled: ${dis}`)
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-step3-asterisks-disabled-payment.png'),
      fullPage: true,
    })
    console.log('Screenshot 07: Step 3 showing asterisks and disabled payment')

    // ── Screenshot 7: Fill in all form fields ─────────────────────────────
    // Email
    await page.locator('#x-email').fill('test@gmail.com')
    await page.locator('#x-email').blur()
    await page.waitForTimeout(200)

    // Name
    await page.locator('#x-name').fill('Juan Pérez')
    await page.locator('#x-name').blur()
    await page.waitForTimeout(200)

    // Phone
    await page.locator('#x-phone').fill('3001234567')
    await page.locator('#x-phone').blur()
    await page.waitForTimeout(200)

    // Address
    await page.locator('#x-address').fill('Calle 10 #40-20')
    await page.locator('#x-address').blur()
    await page.waitForTimeout(200)

    // City
    await page.locator('#x-city').fill('Medellín')
    await page.locator('#x-city').blur()
    await page.waitForTimeout(400)

    // Check green checkmarks present
    const checkIcons = page.locator('.pop').filter({ has: page.locator('svg') })
    const checkCount = await checkIcons.count()
    console.log(`Green check icons visible after form fill: ${checkCount}`)

    // Check payment button is now enabled
    const payBtnEnabled = page.getByRole('button', { name: /agregar tarjeta y pagar/i })
    const payBtnEnabledVisible = await payBtnEnabled.isVisible().catch(() => false)
    if (payBtnEnabledVisible) {
      const enabled = await payBtnEnabled.isEnabled()
      console.log(`"Agregar tarjeta y pagar" button enabled: ${enabled}`)
      if (enabled) {
        console.log('PASS: Payment button enabled after form is fully filled')
      } else {
        console.log('FAIL: Payment button should be enabled — BUG')
      }
    } else {
      console.log('NOTE: Enabled payment button not found by expected text')
      const allBtns2 = await page.getByRole('button').all()
      console.log('All buttons after form fill:')
      for (const btn of allBtns2) {
        const txt = await btn.textContent()
        const dis = await btn.isDisabled()
        console.log(`  "${txt?.trim()}" — disabled: ${dis}`)
      }
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-step3-form-filled-green-checkmarks-enabled-payment.png'),
      fullPage: true,
    })
    console.log('Screenshot 08: Step 3 form filled — green checkmarks and enabled payment button')

    // ── Screenshot 8: Navigate back to Step 1 via stepper ─────────────────
    // Click the "01 CAFÉ" stepper button
    const stepperItems = page.getByRole('list', { name: 'Pasos' }).getByRole('listitem')
    const step1Item = stepperItems.nth(0)
    const step1Btn = step1Item.getByRole('button')
    await step1Btn.click()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-back-to-step1-via-stepper.png'),
      fullPage: true,
    })
    console.log('Screenshot 09: Back to Step 1 via stepper')

    // Verify "Continuar a configurar" IS visible since line was already selected
    const continueConfigBtn = page.getByRole('button', { name: /continuar a configurar/i })
    const configBtnVisible = await continueConfigBtn.isVisible().catch(() => false)
    if (configBtnVisible) {
      console.log('PASS: "Continuar a configurar" button visible on Step 1 since line is already selected')
    } else {
      console.log('FAIL: "Continuar a configurar" should appear when returning to Step 1 with line selected — BUG')
      // Log all buttons
      const allBtns3 = await page.getByRole('button').all()
      console.log('All buttons on Step 1 (after returning):')
      for (const btn of allBtns3) {
        const txt = await btn.textContent()
        const dis = await btn.isDisabled()
        console.log(`  "${txt?.trim()}" — disabled: ${dis}`)
      }
    }

    // ── Screenshot 9: Navigate to Step 2 via stepper ──────────────────────
    const step2Item = stepperItems.nth(1)
    const step2Btn = step2Item.getByRole('button')
    const step2Reachable = await step2Btn.isEnabled()
    console.log(`Step 2 stepper button reachable from Step 1: ${step2Reachable}`)

    if (step2Reachable) {
      await step2Btn.click()
    } else {
      // Fall back to clicking "Continuar a configurar" if visible
      if (configBtnVisible) {
        await continueConfigBtn.click()
      }
    }
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-step2-selections-preserved.png'),
      fullPage: true,
    })
    console.log('Screenshot 10: Step 2 — verify 1 taza and V60 selections preserved')

    // Check if 1 taza option still shows as selected
    const unaTazaSelected = await page.getByRole('radio', { name: /1 taza/i }).getAttribute('aria-checked')
    console.log(`1 taza aria-checked after returning to Step 2: ${unaTazaSelected}`)

    const v60Selected = await page.getByRole('radio', { name: /v60/i }).getAttribute('aria-checked')
    console.log(`V60 aria-checked after returning to Step 2: ${v60Selected}`)

    if (unaTazaSelected === 'true' && v60Selected === 'true') {
      console.log('PASS: Selections (1 taza + V60) preserved after navigating away and back')
    } else {
      console.log('FAIL: Selections NOT preserved — BUG')
    }

    // ── Screenshot 10: Stepper checkmarks — Step 1 should show ✓ ──────────
    // Scroll to top to see stepper
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(300)
    // Capture just top portion for stepper visibility
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '11-stepper-checkmarks.png'),
      fullPage: false,
    })
    console.log('Screenshot 11: Stepper area — Step 1 (01 CAFÉ) should show ✓ when on Step 2')

    // Check the stepper text to verify Step 1 shows checkmark
    const step1BtnText = await step1Btn.textContent()
    console.log(`Step 1 stepper button text (should contain ✓): "${step1BtnText}"`)
    if (step1BtnText?.includes('✓')) {
      console.log('PASS: Step 1 stepper shows ✓ checkmark when on Step 2 with line selected')
    } else {
      console.log(`NOTE: Step 1 stepper text: "${step1BtnText}" — checking done logic in App.tsx`)
    }

    // ── Final summary ──────────────────────────────────────────────────────
    console.log('\n=== REVIEW COMPLETE ===')
    console.log(`All screenshots saved to ${SCREENSHOT_DIR}`)
  })
})
