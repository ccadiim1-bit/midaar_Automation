// src/services/whatsappService.js
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');

// 🟢 Soo jiidashada Maskaxda AI-ga ee aan file-ka gaarka ah u samaynay
const { generateAIResponse } = require('./aiService'); 

let qrCodeImage = ''; 

async function startWhatsApp(storeId) {
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info_baileys/store_${storeId}`);

    const sock = makeWASocket({
        auth: state
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log(`🔄 QR Code cusub ayaa loo soo saaray dukaanka ID: ${storeId}`);
            qrCodeImage = await QRCode.toDataURL(qr); 
        }
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== 401;
            if (shouldReconnect) {
                console.log('❌ Xiriirkii WhatsApp waa go\'ay. Dib ayaa loo kicinayaa...');
                startWhatsApp(storeId); 
            } else {
                console.log('⚠️ Waa lagaa saaray WhatsApp (Logged Out). Dib u iskaan garee.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp si guul leh ayuu isugu xirmay!');
            qrCodeImage = 'connected'; 
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ==========================================
    // 💬 DHEGEYSIGA FARIIMAHA IYO KU XIRIDA AI-GA
    // ==========================================
    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify') return;

        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const senderNumber = msg.key.remoteJid;
        
        const messageText = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            msg.message.ephemeralMessage?.message?.extendedTextMessage?.text || 
                            msg.message.ephemeralMessage?.message?.conversation || "";

        if (messageText) {
            console.log(`\n📩 [MACAAMIIL CUSUB] - Laga soo diray: ${senderNumber}`);
            console.log(`💬 Wuxuu yiri: ${messageText}`);

            // 🟢 Wuxuu si toos ah fariinta ugu gudbinayaa aiService.js
            const aiResponse = await generateAIResponse(storeId, messageText);

            // Marka uu AI-gu soo fikiro, ayuu bot-ku qofka u dirayaa
            if (aiResponse) {
                await sock.sendMessage(senderNumber, { text: aiResponse });
                console.log('✅ AI-gu wuxuu si guul leh u diray jawaabta!');
            }
        }
    });
    // ==========================================
}

function getLatestQR() {
    return qrCodeImage;
}

module.exports = { startWhatsApp, getLatestQR };