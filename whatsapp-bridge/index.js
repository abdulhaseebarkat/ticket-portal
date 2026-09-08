/**
 * WhatsApp group bridge.
 *
 * Meta's official WhatsApp Business Cloud API cannot read group messages at
 * all - it only supports 1:1 business messaging. Since the whole point here
 * is to keep employees reporting IT issues in their existing department
 * groups, this bridge instead links a dedicated WhatsApp number as a silent
 * member of those groups (via WhatsApp's multi-device protocol, through the
 * Baileys library) and forwards what it sees to the backend.
 *
 * This bridge NEVER sends WhatsApp messages - it only listens. That keeps
 * it on the lower-risk end of "unofficial WhatsApp automation": the linked
 * number behaves like a normal, quiet group member.
 *
 * First run: watch this container's logs for a QR code and scan it from the
 * dedicated number's WhatsApp app (Settings -> Linked Devices -> Link a
 * Device). The session is then persisted under AUTH_DIR so it survives
 * restarts without re-scanning.
 *
 * History backfill: WhatsApp only hands a linked device its chat history
 * once, right when that device is first linked (scanning a fresh QR code) -
 * it's not something that can be requested later for an already-linked
 * session. So right after a fresh link, this bridge also processes that
 * one-time history sync, but only messages from the last
 * WHATSAPP_HISTORY_BACKFILL_HOURS hours (default 48) - recent enough to be
 * genuinely useful context, not so old that half of it is already resolved
 * in person and would just misrepresent today's dashboard as still-open
 * issues. The backend independently de-duplicates by WhatsApp's own stable
 * message id, so re-linking (or Baileys re-emitting overlapping history
 * batches, which it sometimes does) can never create a duplicate message or
 * complaint for something already captured.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const FormData = require('form-data');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const BRIDGE_SECRET = process.env.BRIDGE_SHARED_SECRET || '';
const AUTH_DIR = process.env.AUTH_DIR || path.join(__dirname, 'auth');
const HISTORY_BACKFILL_HOURS = Number(process.env.WHATSAPP_HISTORY_BACKFILL_HOURS || 48);

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

if (!BRIDGE_SECRET) {
    logger.warn('BRIDGE_SHARED_SECRET is not set - the backend will reject every request from this bridge.');
}

// The portal shows a "bridge disconnected" warning if it hasn't heard from
// this heartbeat in a few minutes - catches silent failures (a crash, a
// lost network, a phone-side logout) that would otherwise just look like
// "no new complaints" with nothing telling anyone why.
const HEARTBEAT_INTERVAL_MS = 60 * 1000;
let currentlyConnected = false;

async function sendHeartbeat(status) {
    try {
        await axios.post(
            `${BACKEND_URL}/api/whatsapp/bridge/heartbeat`,
            { status },
            { headers: { 'X-Bridge-Secret': BRIDGE_SECRET }, timeout: 10000 }
        );
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to send heartbeat to the backend');
    }
}

// Set up once at module scope (not inside start()) so reconnects don't stack up duplicate intervals.
setInterval(() => {
    if (currentlyConnected) {
        sendHeartbeat('connected');
    }
}, HEARTBEAT_INTERVAL_MS);

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        // Needed so a fresh link actually receives a history sync payload to
        // backfill from - without this WhatsApp sends little to nothing.
        syncFullHistory: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('Scan this QR code from the dedicated WhatsApp number (Linked Devices -> Link a Device):');
            qrcode.generate(qr, { small: true });
            // Without this, the portal keeps showing whatever the *last*
            // session's status was (often "connected") for up to 3 minutes
            // after a relink starts, since nothing had told it otherwise -
            // misleadingly implying it's still working when it's actually
            // sitting here waiting to be scanned.
            currentlyConnected = false;
            await sendHeartbeat('awaiting_scan');
        }

        if (connection === 'open') {
            logger.info('WhatsApp bridge connected.');
            currentlyConnected = true;
            await sendHeartbeat('connected');
            await syncGroups(sock);
        }

        if (connection === 'close') {
            currentlyConnected = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const loggedOut = statusCode === DisconnectReason.loggedOut;
            logger.warn({ statusCode }, 'Connection closed.');
            await sendHeartbeat(loggedOut ? 'logged_out' : 'disconnected');
            if (loggedOut) {
                logger.error(`Session logged out - delete ${AUTH_DIR} and restart to re-link with a fresh QR code.`);
            } else {
                start().catch((err) => logger.error({ err }, 'Reconnect failed'));
            }
        }
    });

    // Re-sync the group list periodically too, in case the bridge account
    // gets added to a new department group after startup.
    setInterval(() => syncGroups(sock).catch((err) => logger.error({ err: err.message }, 'Periodic group sync failed')), 30 * 60 * 1000);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        // 'notify' = live messages. Historical replays come through the
        // separate 'messaging-history.set' event handled below instead.
        if (type !== 'notify') {
            return;
        }
        for (const message of messages) {
            try {
                await forwardMessage(message, { isHistorical: false });
            } catch (err) {
                logger.error({ err }, 'Failed to handle an incoming message');
            }
        }
    });

    sock.ev.on('messaging-history.set', async ({ messages, syncType, isLatest }) => {
        // Always log this event firing at all, even with nothing usable in
        // it - otherwise "fired but found nothing in range" and "never
        // fired" are indistinguishable from the logs afterward.
        logger.info(
            { syncType, isLatest, rawMessageCount: messages ? messages.length : 0 },
            'Received a history sync batch from WhatsApp.'
        );
        if (!messages || messages.length === 0) {
            return;
        }
        await backfillHistory(messages);
    });
}

/**
 * Processes one batch of historical messages from WhatsApp's one-time
 * post-link history sync: keeps only recent, real group messages, replays
 * them oldest-first (so reply-threading and status correlation on the
 * backend sees them in the order they actually happened), and forwards each
 * one through the exact same path a live message takes.
 */
async function backfillHistory(messages) {
    const cutoff = Date.now() - HISTORY_BACKFILL_HOURS * 60 * 60 * 1000;

    const groupMessages = messages.filter((message) => (message.key.remoteJid || '').endsWith('@g.us') && !message.key.fromMe && message.message);
    const withTimestamp = groupMessages.map((message) => ({ message, timestampMs: toEpochMillis(message.messageTimestamp) }));
    const candidates = withTimestamp
        .filter(({ timestampMs }) => timestampMs !== null && timestampMs >= cutoff)
        .sort((a, b) => a.timestampMs - b.timestampMs);

    logger.info(
        { totalReceived: messages.length, groupMessages: groupMessages.length, withinWindow: candidates.length, windowHours: HISTORY_BACKFILL_HOURS },
        'History backfill batch summary.'
    );

    if (candidates.length === 0) {
        return;
    }

    let forwarded = 0;
    for (const { message, timestampMs } of candidates) {
        try {
            const wasForwarded = await forwardMessage(message, { isHistorical: true, timestampMs });
            if (wasForwarded) {
                forwarded += 1;
            }
        } catch (err) {
            logger.error({ err: err.message }, 'Failed to forward a historical message - skipping it');
        }
    }
    logger.info(`History backfill: forwarded ${forwarded} of ${candidates.length} message(s) to the backend.`);
}

/** Baileys' protobuf "Long" timestamps arrive as a number, a numeric string, or a Long-like {low,high} object depending on version. */
function toEpochMillis(messageTimestamp) {
    if (messageTimestamp === null || messageTimestamp === undefined) {
        return null;
    }
    if (typeof messageTimestamp === 'number') {
        return messageTimestamp * 1000;
    }
    if (typeof messageTimestamp.toNumber === 'function') {
        return messageTimestamp.toNumber() * 1000;
    }
    const parsed = Number(messageTimestamp);
    return Number.isFinite(parsed) ? parsed * 1000 : null;
}

async function syncGroups(sock) {
    try {
        const groups = await sock.groupFetchAllParticipating();
        const payload = Object.values(groups).map((group) => ({
            externalGroupId: group.id,
            name: group.subject,
        }));
        if (payload.length === 0) {
            return;
        }
        await axios.post(
            `${BACKEND_URL}/api/whatsapp/bridge/groups/sync`,
            { groups: payload },
            { headers: { 'X-Bridge-Secret': BRIDGE_SECRET } }
        );
        logger.info(`Synced ${payload.length} WhatsApp group(s) with the backend.`);
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to sync groups with the backend');
    }
}

/**
 * Builds and forwards one WhatsApp message to the backend, whether it came
 * in live or from the history backfill. Returns true if it was actually
 * sent (false for messages filtered out - reactions, stickers, etc.).
 */
async function forwardMessage(message, { isHistorical, timestampMs } = {}) {
    const remoteJid = message.key.remoteJid || '';
    if (!remoteJid.endsWith('@g.us')) {
        return false; // Only interested in group chats.
    }
    if (message.key.fromMe) {
        return false; // This bridge never sends messages, so it should never see its own.
    }
    if (!message.message) {
        return false; // Deleted/edited/protocol messages with no content.
    }

    // For a group message, the sender is whoever's in `key.participant` (or,
    // for some history-sync message shapes, the top-level `participant`
    // field instead). That's occasionally missing on history-synced
    // messages - falling back to `remoteJid` here would be wrong, since for
    // a group chat that's the *group's own* id, not a person, and would
    // misattribute the message to the group itself rather than leaving the
    // sender honestly unknown.
    const senderJid = message.key.participant || message.participant || null;
    const senderWhatsapp = senderJid ? normalizeJid(senderJid) : null;
    const senderName = message.pushName || null;
    const text = extractText(message.message);
    // History-synced media isn't guaranteed to still be downloadable (WhatsApp
    // expires the decryption keys), so backfill forwards text only rather
    // than risk a broken/partial image on an old message. Live messages are
    // unaffected and still forward images as always.
    const isImage = !isHistorical && Boolean(message.message.imageMessage);

    if (!text && !isImage) {
        return false; // Reactions, stickers, image-only history entries, etc.
    }

    const form = new FormData();
    form.append('externalGroupId', remoteJid);
    form.append('externalMessageId', message.key.id);
    const quotedId = extractQuotedMessageId(message.message);
    if (quotedId) {
        form.append('quotedExternalMessageId', quotedId);
    }
    form.append('senderWhatsapp', senderWhatsapp || 'unknown');
    if (senderName) {
        form.append('senderName', senderName);
    }
    form.append('messageText', text || '');
    form.append('messageType', isImage ? 'image' : 'text');
    if (isHistorical && timestampMs) {
        form.append('messageTimestamp', new Date(timestampMs).toISOString());
    }

    if (isImage) {
        try {
            const buffer = await downloadMediaMessage(message, 'buffer', {});
            form.append('image', buffer, { filename: 'complaint-photo.jpg', contentType: 'image/jpeg' });
        } catch (err) {
            logger.error({ err: err.message }, 'Failed to download image attachment - forwarding text only');
        }
    }

    try {
        await axios.post(`${BACKEND_URL}/api/whatsapp/bridge/messages`, form, {
            headers: { ...form.getHeaders(), 'X-Bridge-Secret': BRIDGE_SECRET },
        });
        return true;
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to forward message to the backend');
        return false;
    }
}

/** Strips WhatsApp's JID suffix ("@s.whatsapp.net", ":device") down to the plain phone number. */
function normalizeJid(jid) {
    if (!jid) {
        return null;
    }
    return jid.split('@')[0].split(':')[0];
}

function extractText(message) {
    return (
        message.conversation ||
        message.extendedTextMessage?.text ||
        message.imageMessage?.caption ||
        null
    );
}

/** The WhatsApp message id being replied to, when the sender used native "reply". */
function extractQuotedMessageId(message) {
    const contextInfo = message.extendedTextMessage?.contextInfo || message.imageMessage?.contextInfo || null;
    return contextInfo?.stanzaId || null;
}

start().catch((err) => {
    logger.error({ err }, 'Fatal error starting the WhatsApp bridge');
    process.exit(1);
});
