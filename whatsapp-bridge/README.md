# whatsapp-bridge

Read-only listener that lets the Plant IT Support Portal see complaints
posted in existing department WhatsApp groups (e.g. "Curing MES
Complaints"), without changing how employees or the IT team use those
groups.

## Why this exists

Meta's official WhatsApp Business Cloud API cannot read group messages at
all - it only supports 1:1 business messaging. This bridge instead links a
**dedicated WhatsApp number** as a normal (silent) member of each group,
using WhatsApp's own multi-device protocol via the
[Baileys](https://github.com/WhiskeySockets/Baileys) library, and forwards
what it sees to the backend.

**It never sends any WhatsApp message.** It only listens, which keeps it on
the low-risk end of "unofficial WhatsApp automation" - but note this is
still outside WhatsApp's Business Terms of Service for groups, so use a
number you can afford to replace if it's ever flagged, not a primary/daily
number.

## First-time setup

1. Get a dedicated WhatsApp number (a spare SIM works) - don't use anyone's
   personal daily-driver number.
2. Add that number as a participant in every department complaint group you
   want tracked.
3. Copy `.env.example` to `.env` and set `BRIDGE_SHARED_SECRET` to match the
   backend's `WHATSAPP_BRIDGE_SECRET` (see `backend/.env.example`), and point
   `BACKEND_URL` at the backend.
4. Start it: `docker compose up -d whatsapp-bridge` (or `npm install && npm start`
   locally), then watch its logs for a QR code.
5. On the dedicated number: WhatsApp -> Settings -> Linked Devices -> Link a
   Device -> scan the printed QR code.
6. Once connected, the bridge automatically discovers every group that
   number is a member of and registers it in the backend with monitoring
   turned **off**.
7. In the portal's Groups admin page, turn monitoring on (and set the
   department/area) for the groups you actually want processed into
   complaints. Nothing is turned into a complaint until you do this.

The linked session is saved under `AUTH_DIR` (a Docker volume in
`docker-compose.yml`), so the QR code only needs scanning once - it survives
container restarts unless the session is explicitly logged out from the
phone.

## Re-linking after a logout

If the linked device gets logged out from the phone (WhatsApp → Linked
Devices), the bridge won't show a new QR code on its own — it deliberately
avoids retrying forever against a dead session. To get a fresh QR code:

```
npm run relink
```

That stops nothing for you, though — if `node index.js` is still running in
that window, press **Ctrl+C** first, then run `npm run relink`. It clears the
old session and starts the bridge fresh, printing a new QR code immediately.

## What gets sent to the backend

For every message in a group this number belongs to: the group id, sender's
phone number and display name, the message text (or image caption), an
attached image if present, the WhatsApp message id, and - when the sender
used WhatsApp's native "reply" feature - the id of the message being replied
to (used to reliably match a resolution reply back to the right complaint).
