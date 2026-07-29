const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    Browsers, 
    DisconnectReason 
} = require('@whiskeysockets/baileys'); 
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { generateAIResponse } = require('./aiService'); 

// Kaydka Bot-yada shaqaynaya si aysan isku dul kicin
const activeSockets = {}; 
let qrCodeImage = ''; 

async function startWhatsApp(storeId) {
    // 🟢 HUBI IN BOT-KU HORAY U KACSAN YAHAY
    if (activeSockets[storeId]) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) horay ayuu u shaqeynayay!`);
        return;
    }

    console.log(`⏳ Waxaan isku xirayaa WhatsApp (Local Folder) - Store ID: ${storeId}...`);

    const authFolderPath = path.join(__dirname, `../../auth_info/store_${storeId}`);
    const { state, saveCreds } = await useMultiFileAuthState(authFolderPath);

    // 🟢 SOO JIID VERSION-KA UGU DAMBEEYAY EE WHATSAPP WEB
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`ℹ️ WhatsApp Web Version: ${version.join('.')} (Is Latest: ${isLatest})`);

    const sock = makeWASocket({
        version, // Waxay ka hortagtaa Connection Failure/Noise Handshake error
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), // Qaabka rasmiga ah ee Baileys
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
            qrCodeImage = await QRCode.toDataURL(qr); 
        }
        
        if (connection === 'close') {
            // Ka saar kaydka haddii uu xirmo
            delete activeSockets[storeId]; 
            
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
            
            if (shouldReconnect) {
                console.log('❌ Xiriirkii WhatsApp waa go\'ay. Dib ayaa loo kicinayaa 5 ilbiriqsi kadib...');
                setTimeout(() => {
                    startWhatsApp(storeId).catch(err => console.error("Cilad dib-u-kicinta:", err));
                }, 5000); 
            } else {
                console.log('⚠️ Waa lagaa saaray WhatsApp (Logged Out). Session-ka waa la tirtirayaa...');
                if (fs.existsSync(authFolderPath)) {
                    fs.rmSync(authFolderPath, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp (Store ${storeId}) si guul leh ayuu u kacay!`);
            qrCodeImage = 'connected'; 
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ==========================================
    // 💬 DHEGEYSIGA FARIIMAHA IYO KU XIRIDA AI-GA
    // ==========================================
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            // 1. Iska indho-tir fariimaha uu bot-ku isagu diro ama kuwa xogta aan wadanin
            if (!msg.message || msg.key.fromMe) continue; 

            const senderNumber = msg.key.remoteJid;
            
            // 2. 🛑 FILTER-KA: Si buuxda isaga indho-tir Groups-ka, Status-yada, iyo Newsletters-ka (Channels)
            if (
                senderNumber.endsWith('@g.us') || 
                senderNumber === 'status@broadcast' || 
                senderNumber.includes('@newsletter') ||
                senderNumber.includes('@broadcast')
            ) {
                console.log(`⏭️ Fariin (Group/Status) waa la iska indho-tiray, lagama falcelinayo: ${senderNumber}`);
                continue; 
            }
            
            const messageText = msg.message.conversation || 
                                msg.message.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.conversation || "";

            if (messageText) {
                console.log(`\n📩 [MACAAMIIL CUSUB] - Laga soo diray: ${senderNumber}`);
                console.log(`💬 Wuxuu yiri: ${messageText}`);

                try {
                    const aiResponse = await generateAIResponse(storeId, messageText);

                    if (aiResponse) {
                        await sock.sendMessage(senderNumber, { text: aiResponse });
                        console.log('✅ AI-gu wuxuu si guul leh u diray jawaabta!');
                    }
                } catch (err) {
                    console.error('❌ Cilad dirista jawaabta AI-ga:', err);
                }
            }
        }
    });
}

function getLatestQR() {
    return qrCodeImage;
}

module.exports = { startWhatsApp, getLatestQR };