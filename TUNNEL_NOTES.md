# Tonight's live-call test setup (temporary)

This file only matters while testing a real Vapi phone call locally. Delete it once you don't
need the tunnel anymore — it's not part of the product, just a note to your future self.

## Current state

- The app runs on **port 3000** now (`npm run dev` → `next dev -p 3000`, pinned in
  package.json). It was on 3002 earlier — moved to free 3000 up for normal use.
- `cloudflared tunnel --url http://localhost:3000` is running in the background, giving:
  **`https://illustrated-routing-cottages-harder.trycloudflare.com`**
- `.env.local`'s `VAPI_PUBLIC_URL` is set to that URL — this is the ONLY thing pointed at the
  tunnel. `APP_URL` stays `http://localhost:3000` (keep browsing/signing in there, not the
  tunnel URL — Google's session cookie won't follow you across domains).
- moonlight's real Vapi number: **+1 (571) 441-3234** (re-provisioned after the port move —
  the earlier +1 571 441 3276 number is deleted, its old tunnel is dead, don't use it).

## If the tunnel drops (laptop sleeps, network blip, you close the terminal)

The phone number's webhook URL was set to the tunnel URL *at the moment it was created* — a
dead tunnel means the number still rings, but the AI can't check availability or book anything
(the "assistant-request"/tool-call webhooks time out). Fix:

1. Restart the tunnel: `cloudflared tunnel --url http://localhost:3002`
2. Copy the NEW url it prints (it's random every time — different from the one above)
3. Update `VAPI_PUBLIC_URL` in `.env.local` to the new URL
4. Restart `npm run dev`
5. In Settings → Integrations → Phone calls, click **Disable**, then **Enable** again — this
   provisions a fresh number pointed at the new tunnel URL (the old number is released)

## Known limitation, found tonight

Vapi's free `provider: "vapi"` numbers are **US-only** (confirmed live — no Indian numbers
available on this plan). moonlight's number is a US one (+1 571). Fine for tonight's test and
tomorrow's demo since any phone can dial it; for a real Indian clinic launch, phone calls would
need a purchased/imported local number instead (e.g. via Twilio) — not something to solve
tonight.

## Winding down after tonight / before tomorrow's demo

If you don't plan to do a real live call in the actual demo (recommended — see the earlier
conversation on why "Try it out" → Voice mode is the safer bet on stage):

1. Stop cloudflared (`Ctrl+C` in its terminal, or `pkill cloudflared`)
2. Leave `VAPI_PUBLIC_URL` as-is or blank it out in `.env.local` — either way it just means the
   *existing* number can't take live calls until a tunnel is running again; nothing breaks
3. Settings will keep showing "Phone calls: Connected" with the number, which is genuinely true
   and fine to show off — you just won't dial it live on stage

Delete this file whenever it's no longer useful.
