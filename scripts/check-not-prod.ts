// Refuses to run when DATABASE_URL points at the production Neon branch.
// The prod branch endpoint host is stable for the branch's lifetime; if the
// branch is ever recreated, update PROD_ENDPOINT_HOST_FRAGMENT.
//
// Bypass: ALLOW_PROD_DB_WRITE=1 npm run db:seed (or db:reset). Reserved for
// the rare deliberate case (e.g. refreshing demo data on prod).

const PROD_ENDPOINT_HOST_FRAGMENT = 'ep-holy-brook-ad2l0eke'

// Check both env vars the app uses. If either points at the production
// Neon endpoint, we refuse — it's just as bad to seed against the unpooled
// prod URL as the pooled one.
const candidates = [process.env.DATABASE_URL ?? '', process.env.DATABASE_URL_UNPOOLED ?? ''].filter(
  Boolean
)

if (candidates.length === 0) {
  console.error('check-not-prod: neither DATABASE_URL nor DATABASE_URL_UNPOOLED is set.')
  process.exit(1)
}

const matchesProd = candidates.some((url) => url.includes(PROD_ENDPOINT_HOST_FRAGMENT))

if (matchesProd && process.env.ALLOW_PROD_DB_WRITE !== '1') {
  console.error(
    [
      'Refusing to run: DATABASE_URL or DATABASE_URL_UNPOOLED targets the production Neon branch.',
      `(matched host fragment "${PROD_ENDPOINT_HOST_FRAGMENT}")`,
      'Set ALLOW_PROD_DB_WRITE=1 to override.',
    ].join('\n')
  )
  process.exit(1)
}
