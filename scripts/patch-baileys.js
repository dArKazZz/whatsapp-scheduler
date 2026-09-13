const fs = require('fs');
const path = require('path');

function patchBaileys() {
  const targetFile = path.join(
    __dirname,
    '..',
    'node_modules',
    '@whiskeysockets',
    'baileys',
    'lib',
    'Socket',
    'messages-recv.js'
  );

  if (!fs.existsSync(targetFile)) {
    console.log('[Patch-Baileys] Target file not found, skipping patch.');
    return false;
  }

  let content = fs.readFileSync(targetFile, 'utf8');

  if (content.includes('// PATCHED_SEND_MESSAGES_AGAIN_V2')) {
    console.log('[Patch-Baileys] Already patched with V2.');
    return true;
  }

  // Find start of sendMessagesAgain
  const marker = 'const sendMessagesAgain = async (key, ids, retryNode) => {';
  const startIndex = content.indexOf(marker);

  if (startIndex === -1) {
    console.error('[Patch-Baileys] Could not find sendMessagesAgain function!');
    return false;
  }

  // Find the end of sendMessagesAgain function (before handleReceipt)
  const handleReceiptMarker = 'const handleReceipt = async (node) => {';
  const endIndex = content.indexOf(handleReceiptMarker);

  if (endIndex === -1) {
    console.error('[Patch-Baileys] Could not find handleReceipt function!');
    return false;
  }

  const replacement = `// PATCHED_SEND_MESSAGES_AGAIN_V2
    const sendMessagesAgain = async (key, ids, retryNode) => {
        const msgs = await Promise.all(ids.map(id => getMessage({ ...key, id })));
        const remoteJid = key.remoteJid;
        const participant = key.participant || remoteJid;
        const isGroup = isJidGroup(remoteJid);
        const sendToAll = !isGroup || !jidDecode(participant)?.device;

        // CRITICAL: Determine real phone JIDs from message context
        const destJids = msgs.map(m => m?._targetJid || remoteJid).filter(Boolean);
        const jidsToAssert = Array.from(new Set([participant, ...destJids]));

        // Clear stale session cache to force fresh PreKey fetch for all devices
        for (const j of jidsToAssert) {
            try {
                const signalId = signalRepository.jidToSignalProtocolAddress(j);
                await authState.keys.set({ session: { [signalId]: null } });
            } catch (e) {}
        }
        await assertSessions(jidsToAssert, true);

        if (isGroup) {
            await authState.keys.set({ 'sender-key-memory': { [remoteJid]: null } });
        }

        logger.debug({ participant, sendToAll, jidsToAssert }, 'forced fresh sessions for retry');

        for (const [i, msg] of msgs.entries()) {
            if (msg) {
                updateSendMessageAgainCount(ids[i], participant);
                const msgRelayOpts = { messageId: ids[i] };
                if (sendToAll) {
                    msgRelayOpts.useUserDevicesCache = false;
                } else {
                    msgRelayOpts.participant = {
                        jid: participant,
                        count: +retryNode.attrs.count
                    };
                }
                const destJid = msg._targetJid || key.remoteJid;
                await relayMessage(destJid, msg, msgRelayOpts);
            } else {
                logger.debug({ jid: key.remoteJid, id: ids[i] }, 'recv retry request, but message not available');
            }
        }
    };
    `;

  content = content.slice(0, startIndex) + replacement + content.slice(endIndex);

  // Also patch handleReceipt to log retry stanzas
  if (!content.includes('// LOG_RETRY_STANZA')) {
    content = content.replace(
      "if (attrs.type === 'retry') {",
      `if (attrs.type === 'retry') {
                        // LOG_RETRY_STANZA
                        try {
                            const retryDetail = JSON.stringify({ from: attrs.from, participant: attrs.participant, id: attrs.id, count: getBinaryNodeChild(node, 'retry')?.attrs?.count });
                            if (typeof global.__whatsappAddLog === 'function') {
                                global.__whatsappAddLog('[RetryStanza] ' + retryDetail);
                            }
                        } catch(e) {}`
    );
  }

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[Patch-Baileys] Successfully applied V2 patch to messages-recv.js!');
  return true;
}

if (require.main === module) {
  patchBaileys();
}

module.exports = patchBaileys;
