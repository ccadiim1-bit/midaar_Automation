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
const { generateAIResponse } = require('./aiService'); 
const supabase = require('../config/supabaseClient'); // 🟢 KUDARISTA CUSUB: Si loo soo jiido nambarada shaqaalaha

// Kaydka Bot-yada shaqaynaya si aysan isku dul kicin
const activeSockets = {}; 
const stoppedBots = {}; 
const userChatHistory = {}; // 🟢 KUDARISTA CUSUB: Kaydka lagu xafido silsiladda fariimaha (Chat History)
const connectionStatus = {}; // 🟢 WAA LAGU DARAY: Halkan lagu kaydiyo xaalad kasta oo dukaan

async function startWhatsApp(storeId) {
    stoppedBots[storeId] = false; 

    // HUBI IN BOT-KU HORAY U KACSAN YAHAY
    if (activeSockets[storeId]) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) horay ayuu u shaqeynayay!`);
        return;
    }

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
                    startWhatsApp(storeId).catch(err => console.error("Cilad dib-u-kicinta:", err));
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
            let imageData = null;

            // 🟢 KUDARISTA CUSUB (SAWIRADA): Ku darso in uu soo qabto caption-ka sawirada
            const messageText = msg.message.conversation || 
                                msg.message.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.extendedTextMessage?.text || 
                                msg.message.ephemeralMessage?.message?.conversation || 
                                msg.message.imageMessage?.caption || 
                                msg.message.ephemeralMessage?.message?.imageMessage?.caption || "";

            // 🟢 KUDARISTA CUSUB (SAWIRADA): Haddii ay sawir tahay, soo deji oo u beddel Base64
            if (isImageMessage) {
                try {
                    console.log(`📸 [SAWIR] Laga soo diray: ${senderNumber}`);
                    
                    const buffer = await downloadMediaMessage(
                        msg, 
                        'buffer', 
                        {}, 
                        { reuploadRequest: sock.updateMediaMessage }
                    );
                    
                    const mimetype = msg.message.imageMessage?.mimetype || msg.message.ephemeralMessage?.message?.imageMessage?.mimetype || 'image/jpeg';
                    
                    imageData = {
                        inlineData: {
                            data: buffer.toString('base64'),
                            mimeType: mimetype
                        }
                    };
                } catch (err) {
                    console.error("❌ Cilad soo dejinta sawirka:", err);
                }
            }

            // 🟢 KUDARISTA CUSUB (SAWIRADA): Hubi in qoraal amaba sawir uu jiro si AI-ga loogu diro
            if (messageText || imageData) {
                console.log(`\n📩 [MACAAMIIL] - Laga soo diray: ${senderNumber}`);
                if (messageText) console.log(`💬 Wuxuu yiri: ${messageText}`);

                // 🟢 KORDHIN: Xusuusta waxaa laga dhigay 10 fariin si uusan u hilmaamin magaca alaabta
                if (!userChatHistory[storeId]) userChatHistory[storeId] = {};
                if (!userChatHistory[storeId][senderNumber]) userChatHistory[storeId][senderNumber] = [];

                // Ha ku darin Base64 image-ka xusuusta kaydka si aanu memory-ga u buuxin, qoraalka kaliya kaydi
                if (messageText) {
                    userChatHistory[storeId][senderNumber].push({ role: 'user', text: messageText });
                    if (userChatHistory[storeId][senderNumber].length > 10) userChatHistory[storeId][senderNumber].shift();
                }

                try {
                    // 🟢 KUDARISTA CUSUB (SAWIRADA): 'imageData' ayaa lagu daray function-ka
                    const aiResponse = await generateAIResponse(storeId, messageText, userChatHistory[storeId][senderNumber], imageData);

                    if (aiResponse && activeSockets[storeId]) {
                        
                        let finalResponseToUser = aiResponse;

                        // 🟢 NIDAAMKA CUSUB EE QABASHADA DALABKA (ORDER TRIGGERED)
                        if (aiResponse.includes('ORDER_TRIGGERED')) {
                            console.log(`🚨 DALAB CUSUB AYAA LA QABTAY! Waxaan ku wareejinaynaa Admin/Delivery...`);

                            // 1. Soo jiido nambarada shaqaalaha ee dukaankan
                            const { data: storeInfo, error } = await supabase
                                .from('stores')
                                .select('admin_number, delivery_numbers')
                                .eq('id', storeId)
                                .single();

                            if (error) console.error("⚠️ Cilad soo jiidista nambarada Delivery-ga:", error.message);

                            const dalabkaXogtiisa = aiResponse.replace('ORDER_TRIGGERED:', '').trim();
                            
                            // 🟢 XALINTA CILADDA: Kala bixi xogta uu AI-gu soo saaray
                            const xogtaParts = dalabkaXogtiisa.split('|').map(item => item.trim());
                            
                            // Default: Nambarka WhatsApp-ka ee asalka ah (Haddii uu shaqayn waayo nambarka uu qoray)
                            let finalPhoneLink = senderNumber.split('@')[0].split(':')[0].replace(/\D/g, ''); 

                            // Hubi in AI-gu soo saaray dhamaan xogtii (Magaca | Nambarka | Magaalada | Alaabta)
                            if (xogtaParts.length >= 4) {
                                // Soo qabo nambarka uu gacantiisa ku soo qortay (Qaybta 2aad) oo ka saar xarfaha
                                let typedNumber = xogtaParts[1].replace(/\D/g, ''); 
                                
                                // Hubi in nambarku uusan laba jeer isku dhufmin (Duplication Check)
                                if (typedNumber.length % 2 === 0 && typedNumber.length >= 14) {
                                    const halfLength = typedNumber.length / 2;
                                    const firstHalf = typedNumber.substring(0, halfLength);
                                    const secondHalf = typedNumber.substring(halfLength);
                                    
                                    if (firstHalf === secondHalf) {
                                        typedNumber = firstHalf; 
                                    }
                                }

                                if (typedNumber.length >= 7) { 
                                    // 🟢 MA JIRO '252' lagu darayo! Si toos ah u qaado nambarka uu qofku soo qoray.
                                    finalPhoneLink = typedNumber;
                                    xogtaParts[1] = typedNumber; // Dib ugu sax xogta soo baxaysa
                                }
                            }
                            
                            const cleanedDalabXogta = xogtaParts.join(' | ');

                            const ogeysiisMsg = `🚨 *DALAB CUSUB (NEW ORDER)* 🚨\n\n📌 *Xogta Dalabka:* \n${cleanedDalabXogta}\n\n📞 *Macmiilka:* wa.me/${finalPhoneLink}\n\n*Fadlan adiga la wareeg oo u jawaab macmiilkan.*`;

                            let dalabWaaLaDiray = false;

                            // 2. U dir Admin-ka
                            if (storeInfo && storeInfo.admin_number) {
                                const adminJid = `${storeInfo.admin_number.replace(/\D/g, '')}@s.whatsapp.net`;
                                await sock.sendMessage(adminJid, { text: ogeysiisMsg });
                                dalabWaaLaDiray = true;
                            }

                            // 3. U dir Delivery-ga (Haddii uu yahay nambar ka duwan Admin-ka)
                            if (storeInfo && storeInfo.delivery_numbers) {
                                const deliveryJid = `${storeInfo.delivery_numbers.replace(/\D/g, '')}@s.whatsapp.net`;
                                if (deliveryJid !== (`${storeInfo?.admin_number?.replace(/\D/g, '')}@s.whatsapp.net`)) {
                                    await sock.sendMessage(deliveryJid, { text: ogeysiisMsg });
                                    dalabWaaLaDiray = true;
                                }
                            }

                            // 4. Macmiilka fariin gabagabo ah u dir
                            if (dalabWaaLaDiray) {
                                finalResponseToUser = "✅ Dalabkaaga si guul leh ayaa loo diiwaangeliyay! Inyar kadib waxaa kugula soo xiriiraya qaybta keenista (Delivery) si ay kuugu xaqiijiyaan.";
                            } else {
                                finalResponseToUser = "✅ Dalabkaaga waa la qoray, xafiiska ayaana kula soo xiriiri doona waqti dhow.";
                            }

                            await sock.sendMessage(senderNumber, { text: finalResponseToUser });

                        } else {
                            // Haddii aysan ahayn dalab gabagabo ah, u jawaab sidii caadiga ahayd
                            await sock.sendMessage(senderNumber, { text: finalResponseToUser });
                            console.log('✅ AI-gu wuxuu si guul leh u diray jawaabta!');
                        }

                        // 🟢 KORDHIN: Kaydi jawaabta AI-ga, sidoo kalena ka dhig 10 fariin ugu badnaan
                        userChatHistory[storeId][senderNumber].push({ role: 'ai', text: finalResponseToUser });
                        if (userChatHistory[storeId][senderNumber].length > 10) userChatHistory[storeId][senderNumber].shift();
                    }
                } catch (err) {
                    console.error('❌ Cilad dirista jawaabta AI-ga:', err);
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
            await startWhatsApp(storeId);
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
module.exports = { startWhatsApp, getStoreConnectionState, stopWhatsApp, requestWhatsAppPairingCode };