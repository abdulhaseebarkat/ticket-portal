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
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            logger.info('Scan this QR code from the dedicated WhatsApp number (Linked Devices -> Link a Device):');
            qrcode.generate(qr, { small: true });
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
        // 'notify' = live messages. Ignore history-sync replays on reconnect.
        if (type !== 'notify') {
            return;
        }
        for (const message of messages) {
            try {
                await handleMessage(message);
            } catch (err) {
                logger.error({ err }, 'Failed to handle an incoming message');
            }
        }
    });
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

async function handleMessage(message) {
    const remoteJid = message.key.remoteJid || '';
    if (!remoteJid.endsWith('@g.us')) {
        return; // Only interested in group chats.
    }
    if (message.key.fromMe) {
        return; // This bridge never sends messages, so it should never see its own.
    }
    if (!message.message) {
        return; // Deleted/edited/protocol messages with no content.
    }

    const senderJid = message.key.participant || remoteJid;
    const senderWhatsapp = normalizeJid(senderJid);
    const senderName = message.pushName || null;
    const text = extractText(message.message);
    const isImage = Boolean(message.message.imageMessage);

    if (!text && !isImage) {
        return; // Reactions, stickers, etc. - nothing a complaint can be made of.
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
    } catch (err) {
        logger.error({ err: err.message }, 'Failed to forward message to the backend');
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
