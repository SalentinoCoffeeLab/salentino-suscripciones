#!/bin/bash
# Deploy Salentino subscription frontend to production.
#
# Prerequisites:
#   1. Update VITE_APPS_SCRIPT_URL in .env with the deployed Apps Script URL
#   2. Update MP_LOOKUP URLs in src/data/plans.ts with real MP checkout URLs
#      (from mercadopago/plans-catalog.json after running create-plans.js)
#
# Deployment options:
#   A) Vercel (recommended):
#      npm run build && npx vercel --prod
#
#   B) Netlify:
#      npm run build && npx netlify deploy --prod --dir=dist
#
#   C) Cloudflare Pages:
#      npm run build && npx wrangler pages deploy dist
#
# After deployment:
#   1. Copy the deployed URL
#   2. In Shopify Admin → Online Store → Pages → Add page
#   3. Title: "Suscripciones"
#   4. In the page editor, add Custom HTML block:
#      <iframe src="YOUR_DEPLOYED_URL"
#              style="width:100%;height:100vh;border:none;"
#              title="Suscripciones Salentino">
#      </iframe>
#   5. Save and preview at salentino.co/pages/suscripciones

set -e

echo "Building production frontend..."
npm run build

echo ""
echo "Build complete! Deploy the dist/ directory with one of:"
echo "  npx vercel --prod"
echo "  npx netlify deploy --prod --dir=dist"
echo "  npx wrangler pages deploy dist"
