# Migration plan

Two independent questions:

1. **Where does the website live?** Today: Namecheap shared hosting + WordPress. Target: GitHub Pages (this project).
2. **Where does email live?** Today: Namecheap Jellyfish. Target: choose — stay, or move to Google Workspace / Microsoft 365.

You can answer (1) and (2) separately. Most painless migration: move the website off Namecheap first; decide on email later.

## Phase A — Keep the WordPress site running (no migration yet)

Before you do anything else, make a safety net:

1. In cPanel, **download a full account backup** (see `reclaim-checklist.md`).
2. Rotate all mailbox passwords.
3. In the Namecheap account, **disable any auto-renewal you do not want** and confirm the ones you do.
4. Enable 2FA on the Namecheap account with your phone.

At this point you are no longer at risk of losing the site overnight.

## Phase B — Deploy the static clone to GitHub Pages

This project already builds a static site. Steps:

1. Merge this PR to `main`.
2. In the repo settings → **Pages** → set **Source: GitHub Actions**.
3. The workflow `.github/workflows/deploy-valtoris.yml` will publish the site to `https://<owner>.github.io/<repo>/valtoris-international/`.
4. Verify every route (same list as `scripts/e2e-diff.mjs`).

At this point you have a fully-independent copy of the website, reachable at a GitHub URL, that will never go down because of a shared-hosting 503.

## Phase C — Point the real domain at GitHub Pages

Two options, ordered from safest to most aggressive:

### C1. Keep `valtorisinternational.com` on WordPress, serve the clone at `www2.` or `static.` (optional dry run)

- Add a CNAME record `www2.valtorisinternational.com → <owner>.github.io`
- Add `public/CNAME` containing `www2.valtorisinternational.com`
- Wait 30 min, load the URL, confirm it looks right

Used as a staging / preview so you can sit on the real deploy for a few days.

### C2. Cut over the apex domain

Once C1 looks right (or skip C1 if you are confident):

1. In `public/CNAME` put `valtorisinternational.com`
2. In Namecheap DNS (cPanel Zone Editor):
   - Delete the A record `66.29.141.228`
   - Add four A records pointing to GitHub Pages' apex IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - Add `AAAA` records for the IPv6 equivalents (`2606:50c0:8000::153`, `…:8001::153`, `…:8002::153`, `…:8003::153`)
   - Add CNAME `www → <owner>.github.io`
   - **Do not touch the MX records or TXT/SPF/DMARC records** — those serve email.
3. In Namecheap cPanel, set `VITE_BASE=/` in the workflow (or push a change) so links serve from the apex.
4. Wait 10–60 min for DNS propagation.
5. In the GitHub repo settings → Pages, **Enforce HTTPS** once the cert issues (GitHub Pages does Let's Encrypt automatically — it takes ~15 min after the DNS points correctly).

At this point the website is on GitHub Pages. Email is **untouched** and still flows to Namecheap.

## Phase D — Fix the static-clone limitations

Before going live with C2, address these:

- [ ] **Contact form** — Contact Form 7 needs PHP. Replace with a static-friendly service:
  - Cheapest: [Web3Forms](https://web3forms.com) (free, no signup, pastes a key into the form's `action`)
  - Or: [Formspree](https://formspree.io) (50 submissions/month free)
  - Or: Netlify Forms if you ever move off GitHub Pages
- [ ] **Login page** — today it is a visual stub. Either remove the link from the nav or point it at a real auth system if you actually need customer accounts (probably: don't).
- [ ] **News / blog** — if you plan to post news articles, either (a) write them as MDX files in this repo and add routes manually, or (b) keep WordPress around for the blog only and iframe it, or (c) move the blog to a hosted service (Substack, Ghost).
- [ ] **Elementor frontend JS** — sliders / lightboxes are currently static. If any are critical, rebuild them as React components using the existing HTML as a guide.

## Phase E — Email, separately

After the website is live on GitHub Pages, the email question is independent. Options:

1. **Keep Namecheap email.** No changes needed. Cheapest.
2. **Move to Google Workspace** (~$6/user/month). Best deliverability, best client tooling.
3. **Move to Microsoft 365 Business Basic** (~$6/user/month). Similar to Google, better if the team uses Outlook + Word.

Migration for (2) or (3) is basically:

- Create the accounts in the new service, matching each mailbox
- Export old mailboxes (IMAP download via Thunderbird / Apple Mail)
- Import into the new accounts
- Change Namecheap DNS MX records to the new provider (Google: `smtp.google.com`; Microsoft: `<tenant>.mail.protection.outlook.com`)
- Keep the old mailboxes live for 2 weeks as a safety net, then close

**While you are sorting out C2 (website DNS) and (email migration), you can keep the same Namecheap account managing all of it.** They are independent DNS record sets — changing website A records does not affect MX records.

## Phase F — Leave WebCraft Tech

After Phases A–E, the only remaining reason to stay with WebCraft Tech is "someone to call when things break." Since nothing is on their infrastructure at that point — it is all on Namecheap (or Google, if you moved email) — there is no technical lock-in. You can:

- Cancel any retainer / maintenance contract with them
- Change the email on the Namecheap account to yours if it is not already
- Rotate the Namecheap password
- Revoke any shared cPanel access tokens

If Phase B (GitHub Pages) is live and Phases C–E are done, parting ways is a billing problem, not an availability problem.
