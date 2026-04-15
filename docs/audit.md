# Technical audit — valtorisinternational.com

All findings below came from public sources (DNS-over-HTTPS, RDAP, HTTP headers, HTML inspection) on 2026-04-14 / 2026-04-15. No credentials were used.

## The full stack, at a glance

| Layer      | Provider                         | Evidence                                                              |
| ---------- | -------------------------------- | --------------------------------------------------------------------- |
| Registrar  | **Namecheap, Inc.** (IANA 1068)  | RDAP: `rdap.namecheap.com`                                            |
| DNS        | **Namecheap hosting DNS**        | NS: `dns1.namecheaphosting.com`, `dns2.namecheaphosting.com`          |
| Web host   | **Namecheap shared cPanel**      | `server313.web-hosting.com`, A record `66.29.141.228`                 |
| Web server | **LiteSpeed** + LiteSpeed Cache  | Response headers: `server: LiteSpeed`, `x-litespeed-cache: hit`       |
| Email      | **Namecheap Jellyfish**          | MX: `mx1/mx2/mx3-hosting.jellyfish.systems`                           |
| CMS        | **WordPress 6.9.4**              | `<meta name="generator">`, `/wp-json/` returns a WP API index         |
| Theme      | **`boskery`** (Envato/ThemeForest) | `/wp-content/themes/boskery/…`                                        |
| Builder    | **Elementor 4.0.1** + `pro-elements` | `<meta name="generator">` Elementor, plugin path `/pro-elements/`     |
| Plugins    | Contact Form 7, reCAPTCHA, boskery-addon | Plugin paths in the HTML                                              |

**The whole stack is Namecheap.** The US agency ("WebCraft Tech") is a reseller / manager — they buy Namecheap services and configure them for you. There is no proprietary "WebCraft Tech platform" holding your site hostage.

## Registrar details (RDAP, 2026-04-14)

```
Registrar:        Namecheap, Inc.
IANA ID:          1068
Registered:       2025-04-10
Expires:          2027-04-10   (renewed ~2026-04-14)
Status:           client transfer prohibited   ← normal security lock
DNSSEC:           NOT signed
Nameservers:      DNS1.NAMECHEAPHOSTING.COM
                  DNS2.NAMECHEAPHOSTING.COM
```

`client transfer prohibited` is the default registrar lock — it prevents a transfer until **you** unlock it in the Namecheap panel. It is not a WebCraft Tech restriction.

## DNS records

```
A     valtorisinternational.com      66.29.141.228
MX  5 valtorisinternational.com      mx1-hosting.jellyfish.systems
MX 10 valtorisinternational.com      mx2-hosting.jellyfish.systems
MX 20 valtorisinternational.com      mx3-hosting.jellyfish.systems
TXT   valtorisinternational.com      v=spf1 +a +mx +ip4:66.29.141.222 +ip4:66.29.141.225 include:spf.web-hosting.com ~all
TXT   _dmarc                         v=DMARC1; p=none;
CAA   valtorisinternational.com      (none)
DKIM  default._domainkey             (not resolvable at default selectors; needs cPanel check)
```

## Website stack

- **WordPress 6.9.4** (current major)
- Theme: **`boskery`** — a ThemeForest/Envato WordPress theme for wholesale / B2B trading sites. Licensed per-install; worth confirming the license was purchased under your account.
- Page builder: **Elementor 4.0.1** + **`pro-elements`**
- Contact Form 7 for the contact form
- Google reCAPTCHA v3 on the contact form
- Google Fonts: Plus Jakarta Sans, Quicksand, Roboto Condensed

## Two things worth flagging

### 1. `pro-elements` instead of Elementor Pro

`pro-elements` is a free, third-party package that unlocks Elementor Pro features without a paid Elementor license. It is not illegal, but:

- It does not receive official Elementor Pro security patches
- It is not supported by Elementor's team
- You probably do not have a real Elementor Pro license anywhere

If you are going to keep the WordPress site long term, buy a real Elementor Pro license (~US$59/yr for 1 site). If you migrate to this static React clone instead, the point is moot.

### 2. DMARC is `p=none`

Your domain publishes DMARC (`v=DMARC1; p=none;`) but only in **monitoring mode** — email spoofing is logged, not blocked. After you have verified the mail flow is stable, move to `p=quarantine` and eventually `p=reject` to protect the brand. This is a 2-minute DNS change in cPanel.

## Outages

During the crawl I captured repeated `HTTP 503 "DNS cache overflow"` responses from the origin (`LiteSpeed` + `x-turbo-charged-by: LiteSpeed`). This is a classic "noisy neighbor" pattern on Namecheap shared hosting: another tenant's traffic spikes → the shared LiteSpeed instance runs out of DNS cache / workers → every site on the box returns 503 for a few seconds.

The site is not doing anything wrong — it is the shared hosting plan's fault. Three ways to fix it, in increasing cost:

1. **Move to GitHub Pages** (this project). $0, zero outages from shared hosting.
2. **Upgrade Namecheap to a VPS or StellarBusiness plan.** ~$10–30/month. Keeps WordPress but removes noisy neighbors.
3. **Move to a WordPress-specialist host** (Kinsta, WP Engine, Rocket.net). $30–50/month. Best reliability, keeps WordPress.
