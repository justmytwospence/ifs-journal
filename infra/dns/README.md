# DNS records (source of truth)

DNS records for domains we control, committed here so the configuration is
reproducible if Cloudflare access is lost, the domain is migrated, or someone
new needs to recreate the setup.

## ifsjournal.me

See `ifsjournal.me.json`. Three records, all required for Resend to send mail
from `*@ifsjournal.me`:

- `resend._domainkey` (TXT) — DKIM signing key.
- `send` (MX, priority 10) — bounce feedback channel for Amazon SES (Resend's
  underlying relay).
- `send` (TXT) — SPF authorizing Amazon SES.

All three live at Cloudflare DNS. Proxy is **off** (DNS-only, gray cloud) on
every record — Cloudflare's proxy doesn't apply to TXT/MX, but make sure not
to flip it on if the UI offers it.

## Verifying live DNS matches this file

```bash
dig +short TXT  resend._domainkey.ifsjournal.me
dig +short MX   send.ifsjournal.me
dig +short TXT  send.ifsjournal.me
```

Each should match the corresponding `value` in `ifsjournal.me.json`.

## Refetching from Resend

Resend is the authority on which records it expects. If this file ever
diverges from what's in Resend's dashboard, refetch and update:

```bash
curl -H "Authorization: Bearer $RESEND_FULL_ACCESS_KEY" \
  https://api.resend.com/domains/5e4cb7c3-20f9-4eaf-a88b-6a83905758a7
```

The `records[]` array in the response is the canonical set. Update this file
to match, then update Cloudflare DNS to match this file.

A "full access" key is required (the send-only key the Vercel integration
creates can't read domain config). Create one ad-hoc, run the query, revoke
the key.

## Improvements not yet in place

- **DMARC.** Resend doesn't require it but recommends it for deliverability.
  Add a TXT record at `_dmarc` with something like
  `v=DMARC1; p=none; rua=mailto:dmarc-reports@ifsjournal.me;` and add it to
  `ifsjournal.me.json`.
- **Terraform.** The Cloudflare provider has `cloudflare_dns_record` and
  could apply this JSON directly. Worth doing once there's more than one
  domain or more than a handful of records. Today, the JSON + `dig` check is
  enough.
