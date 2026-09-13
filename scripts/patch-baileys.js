const fs = require("fs");
const path = require("path");

const targetFile = path.join(
  __dirname,
  "..",
  "node_modules",
  "@whiskeysockets",
  "baileys",
  "lib",
  "Socket",
  "messages-recv.js"
);

if (!fs.existsSync(targetFile)) {
  console.log("[Patch-Baileys] Target file not found, skipping patch.");
  process.exit(0);
}

let content = fs.readFileSync(targetFile, "utf8");

if (content.includes("// PATCHED_SEND_MESSAGES_AGAIN")) {
  console.log("[Patch-Baileys] Already patched.");
  process.exit(0);
}

const targetCode = `    const sendMessagesAgain = async (key, ids, retryNode) => {
        // todo: implement a cache to store the last 256 sent messages (copy whatsmeow)
        const msgs = await Promise.all(ids.map(id => getMessage({ ...key, id })));
        const remoteJid = key.remoteJid;
        const participant = key.participant || remoteJid;
        // if it's the primary jid sending the request
        // just re-send the message to everyone
        // prevents the first message decryption failure
        const sendToAll = !jidDecode(participant)?.device;
        await assertSessions([participant], true);
        if (isJidGroup(remoteJid)) {
            await authState.keys.set({ 'sender-key-memory': { [remoteJid]: null } });
        }
        logger.debug({ participant, sendToAll }, 'forced new session for retry recp');
        for (const [i, msg] of msgs.entries()) {
            if (msg) {
                updateSendMessageAgainCount(ids[i], participant);
                const msgRelayOpts = { messageId: ids[i] };
                if (sendToAll) {
                    msgRelayOpts.useUserDevicesCache = false;
                }
                else {
                    msgRelayOpts.participant = {
                        jid: participant,
                        count: +retryNode.attrs.count
                    };
                }
                await relayMessage(key.remoteJid, msg, msgRelayOpts);
            }
            else {
                logger.debug({ jid: key.remoteJid, id: ids[i] }, 'recv retry request, but message not available');
            }
        }
    };`;

const replacementCode = `    // PATCHED_SEND_MESSAGES_AGAIN
    const sendMessagesAgain = async (key, ids, retryNode) => {
        const msgs = await Promise.all(ids.map(id => getMessage({ ...key, id })));
        const remoteJid = key.remoteJid;
        const participant = key.participant || remoteJid;
        const isGroup = isJidGroup(remoteJid);
        // CRITICAL FIX: For 1:1 chats, always sendToAll to ensure fanout to primary phone and web
        const sendToAll = !isGroup || !jidDecode(participant)?.device;
        await assertSessions([participant], true);
        if (isGroup) {
            await authState.keys.set({ 'sender-key-memory': { [remoteJid]: null } });
        }
        logger.debug({ participant, sendToAll }, 'forced new session for retry recp (patched)');
        for (const [i, msg] of msgs.entries()) {
            if (msg) {
                updateSendMessageAgainCount(ids[i], participant);
                const msgRelayOpts = { messageId: ids[i] };
                if (sendToAll) {
                    msgRelayOpts.useUserDevicesCache = false;
                }
                else {
                    msgRelayOpts.participant = {
                        jid: participant,
                        count: +retryNode.attrs.count
                    };
                }
                const destJid = msg._targetJid || key.remoteJid;
                await relayMessage(destJid, msg, msgRelayOpts);
            }
            else {
                logger.debug({ jid: key.remoteJid, id: ids[i] }, 'recv retry request, but message not available');
            }
        }
    };`;

if (!content.includes(targetCode)) {
  console.error("[Patch-Baileys] Could not find targetCode block in messages-recv.js!");
  process.exit(1);
}

content = content.replace(targetCode, replacementCode);
fs.writeFileSync(targetFile, content, "utf8");
console.log("[Patch-Baileys] Successfully patched messages-recv.js!");
