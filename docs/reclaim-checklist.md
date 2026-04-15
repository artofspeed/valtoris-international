# Asset reclaim checklist

Everything the site depends on sits under **one account: Namecheap**. Get ownership of that account and you own the site. This is the list to work through, in priority order.

## Priority 1 — get the Namecheap account

Ask WebCraft Tech, in writing, for:

- [ ] **Namecheap account username**
- [ ] Who the account is registered under (your name, your company, or theirs?)
- [ ] Password reset access via an email address **you** control (not an agency email)
- [ ] 2FA reset if they have it enabled

If the account is registered in **their** name, you have three options:

1. **Namecheap Change of Account** (the recommended path). Namecheap supports transferring specific services (domain, hosting, email) from one account to another — see Namecheap KB article "Push / Change of Account." You need both parties to agree in writing to Namecheap support. Free.
2. **Full account transfer to you.** They hand over credentials + the registered email. You change the email and password. Free.
3. **Transfer the domain out to a different registrar under your name.** Slower (7 days), requires an EPP auth code from Namecheap, and moves only the domain — you'd also need to migrate the hosting and email separately. Use this only if they refuse #1 and #2.

## Priority 2 — files + database backups (in case you split)

Even if you keep WordPress, you want a complete offline backup. Ask for or fetch yourself:

- [ ] **Full `public_html/` file backup** (ZIP). This is the entire website filesystem: WordPress core, theme, plugins, `wp-content/uploads/`, and `wp-config.php`.
- [ ] **Full MySQL database export** (`.sql` dump). This is the WordPress database — all posts, pages, users, menus, Elementor layouts.
- [ ] **cPanel full backup** (cPanel → "Backups" → "Download a Full Account Backup"). This packages files + DB + email + DNS zone in one `.tar.gz`.

**Do this yourself from cPanel** if you get access — do not rely on the agency to provide it.

## Priority 3 — licenses and keys

- [ ] **`boskery` theme license** — which account on ThemeForest purchased it? Ask for the purchase code. If the theme was purchased under WebCraft Tech's Envato account, you are relying on their goodwill for updates. Buy your own copy under your Envato account ($39–59) for peace of mind.
- [ ] **Elementor Pro license** — see `audit.md`. Today the site uses `pro-elements` (unlicensed). If you switch to a real Elementor Pro license, buy it under your account.
- [ ] **Google reCAPTCHA site key + secret key** — check Elementor → Settings → Integrations, or WordPress → Forms → Settings. These are in **your** control once you have WP admin.
- [ ] **Google Analytics / Tag Manager accounts** — if the agency set these up in their own Google account, get Admin access transferred, or create new ones under your Google account.

## Priority 4 — DNS records inventory (for disaster recovery)

Before changing anything, export the current DNS zone so you can restore it exactly if needed. In cPanel: **Zone Editor → Export Zone File**. Save the resulting `valtorisinternational.com.db` file somewhere safe.

Key records to write down in plain text too (they are listed in `audit.md`):

- A record → `66.29.141.228`
- MX 5/10/20 → `mx1/mx2/mx3-hosting.jellyfish.systems`
- SPF TXT record
- DMARC TXT record
- Any DKIM TXT record under `default._domainkey` (check cPanel → Email Deliverability)

## Priority 5 — email account audit

Current mailboxes (from the agency's setup notes):

- [ ] `sales@valtorisinternational.com`
- [ ] `operation@valtorisinternational.com`
- [ ] Every other `@valtorisinternational.com` mailbox that exists in cPanel — list them all

For each:

- [ ] **Rotate the password** (cPanel → Email Accounts → Manage → Password)
- [ ] Confirm the forwarders and filters (agency may have set up auto-forwards you don't know about)
- [ ] Export mailbox contents if you plan to migrate to Google Workspace or Microsoft 365

**Action:** the two passwords you pasted in chat earlier (`$$##lilian-1##$$` × 2) are now in plaintext in our session / logs. Rotate both immediately, and pick different passwords for the two mailboxes.

## What WebCraft Tech cannot stop you from doing

- Logging into Namecheap with the account credentials once you have them
- Exporting a full cPanel backup
- Pointing the domain's nameservers elsewhere (takes ~1 hour to propagate)
- Cancelling auto-renewals on their services (if any are billed through them as a middleman)

## What you need to verify before firing them

1. The Namecheap account is in **your** name (or can be transferred to you)
2. You have a full cPanel backup downloaded locally
3. You have the boskery theme purchase code or a fresh license under your account
4. You have all mailbox passwords — rotated
5. You have (or have built) a replacement for the site — **this repo's static clone is that replacement**

Once those five boxes are checked, you can part ways on your timeline, not theirs.
