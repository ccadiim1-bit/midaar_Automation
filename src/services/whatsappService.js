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
const stoppedBots = {}; // 🟢 KUDAR KAYDKAN CUSUB SI LOO OGAADO BOTS-KA LA HAKIYAY
let qrCodeImage = ''; 

async function startWhatsApp(storeId) {
    stoppedBots[storeId] = false; // 🟢 MARKASTA OO LA KICIYO, HAKINTA KA QAAD

    // 🟢 HUBI IN BOT-KU HORAY U KACSAN YAHAY
    if (activeSockets[storeId]) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) horay ayuu u shaqeynayay!`);
        return;
    }

    console.log(`⏳ Waxaan isku xirayaa WhatsApp (Local Folder) - Store ID: ${storeId}...`);

    // 🟢 XALKA 1: Si qasab ah u nadiifi QR-kii hore mar kasta oo la isku dayo isku-xir cusub.
    qrCodeImage = ''; 

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
            qrCodeImage = await QRCode.toDataURL(qr); 
        }
        
        if (connection === 'close') {
            // Ka saar kaydka haddii uu xirmo
            delete activeSockets[storeId]; 
            
            const statusCode = (lastDisconnect?.error)?.output?.statusCode;
            
            // 🟢 ISBEDELKA WEYN: KALA SAAR LOGOUT-KA BOGGA (WEB) IYO KAN TELEFOONKA (MOBILE)
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('⚠️ Waa lagaa saaray WhatsApp (Mobile-ka ayaa laga xiray). Shaqadii Bot-ka waa la joojinayaa...');
                qrCodeImage = ''; 
                try { sock.ws.close(); } catch (err) {}
                sock.ev.removeAllListeners();
                
                setTimeout(() => {
                    if (fs.existsSync(authFolderPath)) {
                        fs.rmSync(authFolderPath, { recursive: true, force: true });
                        console.log(`🗑️ Galka WhatsApp (${storeId}) waa la tirtiray maxaa yeelay telefoonka ayaa laga gooyay.`);
                    }
                }, 2000);
            } else if (stoppedBots[storeId]) {
                // 🟢 TANI WAA MARKA QOFKU UU "LOGOUT" KAGA DHAHO BOGGA DASHBOARD-KA
                console.log(`⏸️ Bot-ka (Store ${storeId}) waa la hakiyay. Galkii (Session) waa la xafiday.`);
                qrCodeImage = ''; 
                sock.ev.removeAllListeners(); // Jooji dhagaysiga event-yada
            } else {
                // 🟢 HADDII KHADKA GO'O AMA CILAD TIMAADO, DIB U KICI
                console.log('❌ Xiriirkii WhatsApp waa go\'ay. Dib ayaa loo kicinayaa 5 ilbiriqsi kadib...');
                setTimeout(() => {
                    startWhatsApp(storeId).catch(err => console.error("Cilad dib-u-kicinta:", err));
                }, 5000); 
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp (Store ${storeId}) si guul leh ayuu u kacay!`);
            qrCodeImage = 'connected'; 
        }
    });

    // Ha isku dayin inuu keydiyo (saveCreds) haddii galka uusan jirin
    sock.ev.on('creds.update', () => {
        if (fs.existsSync(authFolderPath)) {
            saveCreds();
        }
    });

    // ==========================================
    // 💬 DHEGEYSIGA FARIIMAHA IYO KU XIRIDA AI-GA
    // ==========================================
    sock.ev.on('messages.upsert', async (m) => {
        // Jooji akhrinta fariimaha haddii nidaamka laga baxay
        if (!activeSockets[storeId]) return;

        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            // Iska indho-tir fariimaha uu bot-ku isagu diro
            if (!msg.message || msg.key.fromMe) continue; 

            const senderNumber = msg.key.remoteJid;
            
            // FILTER: Iska indho-tir Groups, Status, iyo Newsletters
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

                    // Hubi mar labaad in bot-ku weli nool yahay ka hor inta aan fariinta la dirin
                    if (aiResponse && activeSockets[storeId]) {
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

// 🟢 FUNCTION-KAN CUSUB WUXUU HAKINAYAA BOT-KA MARKA LAGA BAXO (LOGOUT)
function stopWhatsApp(storeId) {
    if (activeSockets[storeId]) {
        console.log(`🛑 Joojinta shaqada dhagaysiga bot-ka dukaanka ${storeId}...`);
        stoppedBots[storeId] = true; // Calamadee inaan dib loo kicin ilaa laga soo galo
        try {
            activeSockets[storeId].ws.close(); // Xir xiriirka (WebSocket) si uu dhagaysiga u joojiyo
        } catch (err) {}
        delete activeSockets[storeId];
        console.log(`✅ Shaqadii Bot-ka waa la hakiyay. Galka QR-ka lama tirtirin.`);
    }
}

module.exports = { startWhatsApp, getLatestQR, stopWhatsApp };