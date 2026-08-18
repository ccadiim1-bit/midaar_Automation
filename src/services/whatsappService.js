// src/services/whatsappService.js
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    Browsers, 
    DisconnectReason,
    downloadMediaMessage // 🟢 KUDARISTA CUSUB (SAWIRADA): Soo dejinta sawirada
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabaseClient'); // 🟢 KUDARISTA CUSUB: Si loo soo jiido nambarada shaqaalaha

// Kaydka Bot-yada shaqaynaya si aysan isku dul kicin
const activeSockets = {}; 
// 🟢 KUDAR CUSUB: Ka hortagga fariimaha la soo celceliyo (Deduplication)
// Waxaan ku kaydinaynaa aqoonsiga fariimaha la farsameeyay si aan laba jeer loo dirin
const processedMessages = new Set();


/**
 * Exports a function to allow external services (like the BullMQ worker)
 * to send messages through an active WhatsApp socket.
 * @param {string} storeId - The ID of the store's socket to use.
 * @param {string} recipient - The recipient's phone number (JID).
 * @param {string} text - The message text to send.
 */
async function sendMessageFromHandler(storeId, recipient, text) {
  const sock = activeSockets[storeId];
  if (!sock) {
    console.error(`[WHATSAPP] No active socket for store ${storeId} to send reply.`);
    return;
  }
  await sock.sendMessage(recipient, { text });
}

let globalAddMessageToQueueFn = null; // Module-scoped variable to hold the queue function

const stoppedBots = {}; 
const connectionStatus = {}; // 🟢 WAA LAGU DARAY: Halkan lagu kaydiyo xaalad kasta oo dukaan

async function startWhatsApp(storeId, addMessageToQueueFn) { // Accept addMessageToQueueFn
    stoppedBots[storeId] = false; 

    // HUBI IN BOT-KU HORAY U KACSAN YAHAY
    if (activeSockets[storeId]) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) horay ayuu u shaqeynayay!`);
        return;
    }
    globalAddMessageToQueueFn = addMessageToQueueFn; // Store the function for recursive calls

    console.log(`⏳ Waxaan isku xirayaa WhatsApp (Local Folder) - Store ID: ${storeId}...`);

    connectionStatus[storeId] = { qr: '', status: 'connecting' }; // 🟢 WAA LAGU DARAY

    const authFolderPath = path.join(__dirname, `../../auth_info/store_${storeId}`);
    
    // Samee galka haddii uusan horay u jirin si uusan server-ku u dhicin
    if (!fs.existsSync(authFolderPath)) {
        fs.mkdirSync(authFolderPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(authFolderPath);

    // SOO JIID VERSION-KA UGU DAMBEEYAY EE WHATSAPP WEB
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`ℹ️ WhatsApp Web Version: ${version.join('.')} (Is Latest: ${isLatest})`);

    const sock = makeWASocket({
        version, 
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), 
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000
    });

    // Kaydi Socket-kan si loo ogaado inuu shaqaynayo
    activeSockets[storeId] = sock; 

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`🔄 QR Code cusub ayaa loo soo saaray dukaanka ID: ${storeId}`);
            connectionStatus[storeId].qr = await QRCode.toDataURL(qr); // 🟢 WAA LAGU DARAY
            connectionStatus[storeId].status = 'qr_ready'; // 🟢 WAA LAGU DARAY
        }
        
        if (connection === 'close') {
            delete activeSockets[storeId]; 
            // 🟢 WAA LAGU DARAY: Cusboonaysii xaaladda marka uu xirmo
            if (connectionStatus[storeId]) {
                connectionStatus[storeId].status = 'disconnected';
                connectionStatus[storeId].qr = '';
            }
            
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️ Waa lagaa saaray WhatsApp (Mobile-ka ayaa laga xiray). Shaqadii Bot-ka waa la joojinayaa...');
                delete connectionStatus[storeId]; // 🟢 WAA LAGU DARAY: Ka saar xogta oo dhan
                try { sock.ws.close(); } catch (err) {}
                sock.ev.removeAllListeners();
                
                setTimeout(() => {
                    if (fs.existsSync(authFolderPath)) {
                        fs.rmSync(authFolderPath, { recursive: true, force: true });
                        console.log(`🗑️ Galka WhatsApp (${storeId}) waa la tirtiray maxaa yeelay telefoonka ayaa laga gooyay.`);
                    }
                }, 2000);
            } else if (stoppedBots[storeId]) {
                console.log(`⏸️ Bot-ka (Store ${storeId}) waa la hakiyay. Galkii (Session) waa la xafiday.`);
                if (connectionStatus[storeId]) connectionStatus[storeId].status = 'stopped'; // 🟢 WAA LAGU DARAY
                sock.ev.removeAllListeners(); 
            } else {
                console.log('❌ Xiriirkii WhatsApp waa go\'ay. Dib ayaa loo kicinayaa 5 ilbiriqsi kadib...');
                setTimeout(() => {
                    startWhatsApp(storeId, globalAddMessageToQueueFn).catch(err => console.error("Cilad dib-u-kicinta:", err));
                }, 5000); 
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp (Store ${storeId}) si guul leh ayuu u kacay!`);
            if (connectionStatus[storeId]) { // 🟢 WAA LAGU DARAY
                connectionStatus[storeId].status = 'connected';
                connectionStatus[storeId].qr = '';
            }
        }
    });

    sock.ev.on('creds.update', () => {
        if (fs.existsSync(authFolderPath)) {
            saveCreds();
        }
    });

    // ==========================================
    // 💬 DHEGEYSIGA FARIIMAHA IYO KU XIRIDA AI-GA
    // ==========================================
    sock.ev.on('messages.upsert', async (m) => {
        if (!activeSockets[storeId]) return;

        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue; 

            // 🟢 KUDAR CUSUB: Ka hortagga fariimaha la soo celceliyo (Deduplication)
            const messageId = msg.key.id;
            if (processedMessages.has(messageId)) {
                console.log(`[WHATSAPP] Iska indho-tir fariin soo noqotay (ID: ${messageId})`);
                continue;
            }

            // Ku dar aqoonsiga fariinta kaydka, kana saar 5 daqiiqo kadib si aadan xusuusta u buuxin
            processedMessages.add(messageId);
            setTimeout(() => {
                processedMessages.delete(messageId);
            }, 5 * 60 * 1000); // 5 daqiiqo

            // 🟢 CUSBOONAYSIIN: Hubi xadka fariimaha ka hor intaadan fariinta u dirin safka (queue)
            try {
                const { data: store, error } = await supabase
                    .from('stores')
                    .select('is_pro, monthly_message_count, message_limit, subscription_end_date')
                    .eq('id', storeId)
                    .single();

                if (error) {
                    console.error(`[WHATSAPP] Cilad soo jiidista xaaladda dukaanka ${storeId}:`, error.message);
                    continue;
                }

                if (store) {
                    const now = new Date();
                    const endDate = store.subscription_end_date ? new Date(store.subscription_end_date) : null;

                    // HUBINTA 1: Haddii uu Pro yahay, hubi in xirmadu aysan dhicin (waqti ahaan)
                    if (store.is_pro && endDate && now > endDate) {
                        console.log(`[WHATSAPP] Xirmadii Pro ee dukaanka ${storeId} way dhacday (waqtiga ayaa ka dhamaaday). Fariinta waa la iska indho-tiray.`);
                        continue; // Jooji fariinta
                    }

                    // HUBINTA 2: Hubi xadka fariimaha (Tirada) ee dhammaan noocyada xirmooyinka
                    if (store.monthly_message_count >= store.message_limit) {
                        console.log(`[WHATSAPP] Xadkii fariimaha (tirada) waa la gaaray dukaanka ${storeId}. Fariinta waa la iska indho-tiray.`);
                        continue; // Jooji fariinta
                    }
                } else {
                     console.warn(`[WHATSAPP] Xogta dukaanka lama helin (ID: ${storeId}) markii la hubinayay xadka.`);
                     continue;
                }
            } catch (dbError) {
                console.error(`[WHATSAPP] Cilad weyn oo dhacday markii la hubinayay xadka fariimaha ${storeId}:`, dbError.message);
                continue;
            }


            const senderNumber = msg.key.remoteJid;
            
            // FILTER: Iska indho-tir Groups, Status, iyo Newsletters
            if (
                senderNumber.endsWith('@g.us') || 
                senderNumber === 'status@broadcast' || 
                senderNumber.includes('@newsletter') ||
                senderNumber.includes('@broadcast')
            ) {
                continue; 
            }

            // 🟢 KUDARISTA CUSUB (SAWIRADA): Hubi haddii fariintu tahay sawir
            const isImageMessage = msg.message.imageMessage || msg.message.ephemeralMessage?.message?.imageMessage;
            let imageBase64 = null;

            // 🟢 KUDARISTA CUSUB (SAWIRADA): Ku darso in uu soo qabto caption-ka sawirada
            const messageText = msg.message.conversation || 
                                msg.message.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.conversation || 
                                msg.message.imageMessage?.caption || 
                                msg.message.ephemeralMessage?.message?.imageMessage?.caption || "";

            // 🟢 CUSBOONAYSIIN: Haddii ay sawir tahay, soo deji oo u beddel Base64
            if (isImageMessage) {
                try {
                    const buffer = await downloadMediaMessage(
                        msg,
                        'buffer',
                        {},
                        {
                            logger: console,
                            reuploadRequest: sock.updateMediaMessage
                        }
                    );
                    imageBase64 = buffer.toString('base64');
                    console.log(`[WHATSAPP] Sawir waa la soo dejiyay oo loo beddelay Base64 (size: ${Math.round(imageBase64.length / 1024)} KB)`);
                } catch (downloadError) {
                    console.error('[WHATSAPP] Cilad soo dejinta sawirka:', downloadError);
                    // Continue without image data if download fails
                }
            }

            // U dir fariinta safka (queue) haddii ay qoraal leedahay AMA ay sawir tahay
            if (messageText || imageBase64) {
                try {
                    await addMessageToQueueFn({ // Use the injected function
                        storeId: storeId,
                        customerPhone: senderNumber,
                        messageBody: messageText,
                        imageData: imageBase64, // 🟢 WAA LAGU DARAY: U gudbi sawirka
                    });
                } catch (queueError) {
                    console.error(`[WHATSAPP] Failed to add message to queue for store ${storeId}:`, queueError);
                }
            }
        }
    });
}

function getStoreConnectionState(storeId) { // 🟢 WAA LAGU DARAY
    return connectionStatus[storeId] || { qr: '', status: 'disconnected' };
}

function stopWhatsApp(storeId) {
    if (activeSockets[storeId]) {
        console.log(`🛑 Joojinta shaqada dhagaysiga bot-ka dukaanka ${storeId}...`);
        stoppedBots[storeId] = true; 
        try {
            activeSockets[storeId].ws.close(); 
        } catch (err) {}
        delete activeSockets[storeId];
        console.log(`✅ Shaqadii Bot-ka waa la hakiyay. Galka QR-ka lama tirtirin.`);
    }
}
// 🟢 SHAQADA CUSUB: Soo saarista Pairing Code-ka (8 xaraf)
async function requestWhatsAppPairingCode(storeId, phoneNumber) {
    try {
        // Nadiifi nambarka (Ka saar summada +, xarfaha, iyo khaanadaha)
        const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

        // Hubi in nidaamka (socket) uu horay u shaqaynayo
        let sock = activeSockets[storeId];

        // Haddii uusan shaqaynayn (bot-ku xiran yahay), waa inaan marka hore kicino
        if (!sock) {
            console.log("Kicinta bot-ka si loo helo Pairing Code...");
            await startWhatsApp(storeId, globalAddMessageToQueueFn);
            sock = activeSockets[storeId];
            
            // Sug 2 ilbiriqsi si uu ula xiriiro server-rada WhatsApp-ka
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (sock) {
            console.log(`📱 Waxaa la codsanayaa Pairing Code nambarka: ${cleanNumber}`);
            
            // Shaqada rasmiga ah ee kutubta 'baileys' u qaabilsan koodhka
            const code = await sock.requestPairingCode(cleanNumber);
            
            console.log(`🔑 Koodhka uu bixiyay WhatsApp: ${code}`);
            return code;
        } else {
            console.error("Lama kicin karin nidaamka bot-ka.");
            return null;
        }
    } catch (error) {
        console.error("❌ Cilad soo saarista Pairing Code-ka:", error);
        return null;
    }
}
module.exports = { startWhatsApp, getStoreConnectionState, stopWhatsApp, requestWhatsAppPairingCode, sendMessageFromHandler };