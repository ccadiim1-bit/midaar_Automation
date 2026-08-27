// src/services/whatsappService.js
const { 
    default: makeWASocket, 
    // useMultiFileAuthState, // Waa laga saaray si loogu beddelo MongoDB
    fetchLatestBaileysVersion, 
    Browsers, 
    DisconnectReason,
    downloadMediaMessage, // 🟢 KUDARISTA CUSUB (SAWIRADA): Soo dejinta sawirada
    BufferJSON, // 🟢 KUDARISTA CUSUB: Si loogu beddelo xogta DB-ga
    proto, // 🟢 KUDARISTA CUSUB: Si loogu beddelo xogta DB-ga
    initAuthCreds // 🟢 KUDARISTA CUSUB: Si loo abuuro xogta bilowga ah ee session-ka
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino'); // 🟢 WAA LAGU DARAY: Si loo maareeyo qoraallada terminal-ka
// const fs = require('fs'); // Waa laga saaray, looma baahna kaydinta MongoDB
// const path = require('path'); // Waa laga saaray, looma baahna kaydinta MongoDB
const supabase = require('../config/supabaseClient'); // 🟢 KUDARISTA CUSUB: Si loo soo jiido nambarada shaqaalaha
const { connectToMongo } = require('../config/mongoClient'); // 🟢 KUDARISTA CUSUB: Isku xirka MongoDB

// Kaydka Bot-yada shaqaynaya si aysan isku dul kicin
const activeSockets = {};
// 🔒 MUTEX GUARD: Ka hortagga in hal store uu laba jeer bilowdo isku mar (Double-Initialization)
const startingBots = new Set();
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
    // 🟢 WAA LAGA SAARAY: 'throw new Error' si BullMQ uusan fariinta si joogto ah isugu dayin inuu diro marka uusan bot-ku shaqaynayn
    return;
  }
  await sock.sendMessage(recipient, { text });
}

let globalAddMessageToQueueFn = null; // Module-scoped variable to hold the queue function

const stoppedBots = {}; 
const connectionStatus = {}; // 🟢 WAA LAGU DARAY: Halkan lagu kaydiyo xaalad kasta oo dukaan

// 🟢 SHAQADA CUSUB: Kaydinta xogta WhatsApp-ka ee MongoDB
const useMongoDBAuthState = async (storeId) => {
    const db = await connectToMongo();
    const collection = db.collection('whatsapp_sessions');

    // Shaqo yar oo abuuraysa fure u gaar ah dukaankan
    const storeKey = (key) => `${storeId}_${key}`;

    const writeData = async (data, id) => {
        const convertedData = JSON.parse(JSON.stringify(data, BufferJSON.replacer));
        // Isticmaal furaha gaarka ah ee dukaankan
        return collection.replaceOne({ _id: storeKey(id) }, { _id: storeKey(id), session: convertedData }, { upsert: true });
    };

    const readData = async (id) => {
        // Isticmaal furaha gaarka ah ee dukaankan
        const doc = await collection.findOne({ _id: storeKey(id) });
        if (!doc) return null;
        // Xogta waa in dib loogu soo celiyaa qaabkii ay ahayd
        return JSON.parse(JSON.stringify(doc.session), BufferJSON.reviver);
    };

    const removeData = async (id) => {
        try {
            // Isticmaal furaha gaarka ah ee dukaankan
            await collection.deleteOne({ _id: storeKey(id) });
        } catch (error) {
            console.error(`[MONGO_AUTH] Cilad tirtirista session-ka ${storeKey(id)}:`, error);
        }
    };

    // Shaqadan waxay tirtiraysaa dhammaan xogta session-ka ee dukaankan
    const clearStoreData = async () => {
        try {
            await collection.deleteMany({ _id: new RegExp(`^${storeId}_`) });
            console.log(`[MONGO_AUTH] Dhammaan xogtii session-ka ee dukaanka ${storeId} waa la tirtiray.`);
        } catch (error) {
            console.error(`[MONGO_AUTH] Cilad tirtirista xogta dukaanka ${storeId}:`, error);
        }
    };

    // 🟢 CUSBOONAYSIIN: Isticmaal shaqada saxda ah ee abuurista xogta bilowga ah
    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(ids.map(async (id) => {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = proto.Message.AppStateSyncKeyData.fromObject(value);
                        }
                        data[id] = value;
                    }));
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: () => writeData(creds, 'creds'),
        clearStoreData, // Shaqada tirtiraysa xogta marka la gooyo
    };
};

async function startWhatsApp(storeId, addMessageToQueueFn) { // Accept addMessageToQueueFn
    stoppedBots[storeId] = false;

    // 🔒 MUTEX CHECK 1: Hubi in socket-ku horay u kacsan yahay
    if (activeSockets[storeId]) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) horay ayuu u shaqeynayay. Skip.`);
        return;
    }

    // 🔒 MUTEX CHECK 2: Hubi in bilowga (initialization) uusan socon (Ka hortagga Double-Start)
    if (startingBots.has(storeId)) {
        console.log(`⚠️ Bot-ka dukaanka (ID: ${storeId}) hadda ayaa la bilaabayaa (in progress). Skip.`);
        return;
    }
    startingBots.add(storeId); // Xidh albaabka
    globalAddMessageToQueueFn = addMessageToQueueFn; // Store the function for recursive calls

    console.log(`⏳ Waxaan isku xirayaa WhatsApp (Kaydka: MongoDB) - Store ID: ${storeId}...`);

    connectionStatus[storeId] = { qr: '', status: 'connecting' }; // 🟢 WAA LAGU DARAY

    // 🟢 CUSBOONAYSIIN: Hadda waxaan isticmaalaynaa MongoDB halkii aan ka isticmaali lahayn faylasha
    let state, saveCreds, clearStoreData;
    try {
        ({ state, saveCreds, clearStoreData } = await useMongoDBAuthState(storeId));
    } finally {
        startingBots.delete(storeId); // Xidh albaabka had iyo jeer (success ama failure)
    }

    // SOO JIID VERSION-KA UGU DAMBEEYAY EE WHATSAPP WEB
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`ℹ️ WhatsApp Web Version: ${version.join('.')} (Is Latest: ${isLatest})`);

    // 🟢 CUSBOONAYSIIN: Deji logger si loo qariyo qoraallada aan muhiimka ahayn
    const logger = pino({ level: 'warn' }); // Kaliya soo bandhig digniinaha (warnings) iyo ciladaha (errors)

    const sock = makeWASocket({
        version, 
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), 
        syncFullHistory: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        logger // 🟢 WAA LAGU DARAY: U gudbi logger-ka Baileys
    });

    // Kaydi Socket-kan si loo ogaado inuu shaqaynayo
    activeSockets[storeId] = sock; 

    // 🟢 KUDAR CUSUB: Function hubinaya nambarka si loo wici karo marar kala duwan
    const checkPhoneBinding = async () => {
        if (!sock.user || !sock.user.id) return;
        if (connectionStatus[storeId]?.phoneChecked) return;
        
        try {
            const userPhone = sock.user.id.split(':')[0]; // Tusaale: 25261xxxxxxx
            const db = await connectToMongo();
            const bindingCollection = db.collection('store_whatsapp_bindings');
            
            // Soo hel haddii nambarkan uu horay ugu xirnaa dukaan kale
            const existingBinding = await bindingCollection.findOne({ userPhone: userPhone });
            
            if (existingBinding) {
                if (existingBinding.storeId !== storeId) {
                    console.log(`⚠️ Nambarkaan (${userPhone}) horay ayaa looga diiwaangeliyay dukaan kale! Waa la joojinayaa si looga hortago abuurista account-yo badan.`);
                    
                    try { sock.ws.close(); } catch (err) {}
                    sock.ev.removeAllListeners();
                    await clearStoreData(); // Tirtir session-ka dukaankan cusub
                    delete activeSockets[storeId];
                    
                    if (connectionStatus[storeId]) {
                        connectionStatus[storeId].status = 'disconnected';
                        connectionStatus[storeId].qr = '';
                    }
                    return; // Jooji socodsiinta
                }
            } else {
                // Nambarka waligiis lama isticmaalin, ku xir dukaankan hadda
                await bindingCollection.insertOne({
                    storeId: storeId,
                    userPhone: userPhone,
                    boundAt: new Date()
                });
                console.log(`🔒 Nambarka WhatsApp (${userPhone}) si joogto ah ayaa loogu xiray dukaanka (${storeId}).`);
            }
            // 🟢 WAA LA HUBIYAY, dib dambe ha u hubin
            if (connectionStatus[storeId]) {
                connectionStatus[storeId].phoneChecked = true;
            }
        } catch (error) {
            console.error("[WHATSAPP] Cilad hubinta nambarada horay loo diiwaangeliyay:", error);
        }
    };

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
            const errorMessage = lastDisconnect?.error?.message || '';

            // 🔒 CONFLICT GUARD: Ka hortag Infinite Loop-ka 'stream errored: conflict/replaced'
            const isLoggedOut = statusCode === DisconnectReason.loggedOut;
            const isReplaced = statusCode === 440 || errorMessage.toLowerCase().includes('replaced') || errorMessage.toLowerCase().includes('conflict');

            if (isLoggedOut) {
                console.log('⚠️ Waa lagaa saaray WhatsApp (Mobile-ka ayaa laga xiray). Shaqadii Bot-ka waa la joojinayaa...');
                delete connectionStatus[storeId];
                try { sock.ws.close(); } catch (err) {}
                sock.ev.removeAllListeners();
                await clearStoreData();
                console.log(`🗑️ Xogtii session-ka ee WhatsApp (${storeId}) waa laga tirtiray MongoDB.`);
            } else if (isReplaced) {
                // Socket cusub baa meel kale ka kacay — HA DIB U KICIN, tani waxay dhalin doontaa loop
                console.log(`⚠️ [CONFLICT] Socket-kii (${storeId}) ayaa meel kale looga bedelay (replaced). Dib-u-kicin waa la joojiyay.`);
                sock.ev.removeAllListeners();
                if (connectionStatus[storeId]) connectionStatus[storeId].status = 'disconnected';
            } else if (stoppedBots[storeId]) {
                console.log(`⏸️ Bot-ka (Store ${storeId}) waa la hakiyay. Galkii (Session) waa la xafiday.`);
                if (connectionStatus[storeId]) connectionStatus[storeId].status = 'stopped';
                sock.ev.removeAllListeners();
            } else {
                console.log('❌ Xiriirkii WhatsApp waa go\'ay. Dib ayaa loo kicinayaa 5 ilbiriqsi kadib...');
                setTimeout(() => {
                    startWhatsApp(storeId, globalAddMessageToQueueFn).catch(err => console.error("Cilad dib-u-kicinta:", err));
                }, 5000);
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp (Store ${storeId}) si guul leh ayuu u kacay!`);
            
            // 🟢 WAA LAGA BEDDELAY: Hadda waxay u yeeraysaa function-ka kor ku xusan
            await checkPhoneBinding();

            if (connectionStatus[storeId]) { // 🟢 WAA LAGU DARAY
                connectionStatus[storeId].status = 'connected';
                connectionStatus[storeId].qr = '';
            }
        }
    });

    sock.ev.on('creds.update', async () => {
        saveCreds(); // 🟢 CUSBOONAYSIIN: Si toos ah u kaydi xogta MongoDB
        await checkPhoneBinding(); // 🟢 KUDAR CUSUB: Sidoo kale hubi marka Credentials-ka la helo, waayo halkan ayuu Number-ku ku soo baxaa inta badan
    });

    // ==========================================
    // 💬 DHEGEYSIGA FARIIMAHA IYO KU XIRIDA AI-GA
    // ==========================================
    sock.ev.on('messages.upsert', async (m) => {
        // 🔇 ENCRYPTION ERROR GUARD: Qabo ciladadda groups-ka iyo decryption-ka
        try {

        if (!activeSockets[storeId]) return;

        if (m.type !== 'notify') return;

        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue; 

            // 🟢 KUDAR CUSUB: Ka hortagga fariimaha la soo celceliyo (Deduplication)
            const messageId = msg.key.id;
            if (processedMessages.has(messageId)) {
                // console.log(`[WHATSAPP] Iska indho-tir fariin soo noqotay (ID: ${messageId})`);
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
                    // console.log(`[WHATSAPP] Sawir waa la soo dejiyay oo loo beddelay Base64 (size: ${Math.round(imageBase64.length / 1024)} KB)`);
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

        } catch (upsertError) {
            // 🔇 Iska indho-tir ciladadda Groups-ka & Encryption-ka (No session found, unexpected character, etc.)
            if (upsertError?.message?.includes('No session found') ||
                upsertError?.message?.includes('decrypt') ||
                upsertError?.message?.includes('unexpected non-whitespace')) {
                // Fariimahan waxay ka yimaadaan groups-ka ama session cusub — si aamusnaan u gudbi
            } else {
                console.error(`[WHATSAPP] Cilad messages.upsert (${storeId}):`, upsertError.message);
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

/**
 * Dib u xir WhatsApp socket-ka adiga oo SESSION-KA MONGODB-GA KU HADHSIINAYA.
 * Waxaa loo isticmaalaa marka qofku rabo inuu dib u xiro ama QR cusub helo
 * laakiin uusan rabba in session-kiisa la tirtiro.
 */
async function softRestartWhatsApp(storeId) {
    console.log(`🔄 [RESTART] Dib u xirka bot-ka (session la xafiday) - Store: ${storeId}`);
    
    // Xir socket-ka hadda socda haddii uu jiro (ha tirtirin session-ka)
    if (activeSockets[storeId]) {
        try {
            activeSockets[storeId].ev.removeAllListeners();
            activeSockets[storeId].ws.close();
        } catch (err) {}
        delete activeSockets[storeId];
    }
    
    // Nadiifi xaaladdii joojinta si dib-u-xirku u shaqeeyo
    stoppedBots[storeId] = false;
    
    // Cusboonaysii xaaladda UI-ga
    if (connectionStatus[storeId]) {
        connectionStatus[storeId].status = 'connecting';
        connectionStatus[storeId].qr = '';
    }
    
    // Bilow xiriir cusub (session-kii MongoDB-ga ayaa wali jira)
    await startWhatsApp(storeId, globalAddMessageToQueueFn);
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
            
            // Removed log to hide the pairing code from the terminal
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

// 🟢 KUDAR CUSUB: Kici dhammaan bot-yada markii uu server-ku dib u bilowdo
async function autoStartAllBots() {
    console.log('🔄 Kicinta tooska ah ee dhammaan bot-yada (Auto-start)...');
    try {
        const db = await connectToMongo();
        const collection = db.collection('whatsapp_sessions');
        
        // Hel dhammaan ID-yada dukaamada ee leh Credentials
        const credsDocs = await collection.find({ _id: { $regex: /_creds$/ } }).toArray();
        
        if (credsDocs.length === 0) {
            console.log('ℹ️ Ma jiraan bot-yo u baahan in la kiciyo.');
            return;
        }

        console.log(`▶️ Waxaa la helay ${credsDocs.length} dukaan oo leh session. Waa la kicinayaa...`);
        
        // Soo jeedi queueService (Waxaan u isticmaalaynaa require-ka halkan si aysan u dhicin circular dependency)
        const { addMessageToQueue: queueFn } = require('./queueService');

        for (const doc of credsDocs) {
            const storeId = doc._id.replace('_creds', '');
            console.log(`▶️ Kicinta tooska ah: Store ID -> ${storeId}`);
            
            startWhatsApp(storeId, queueFn).catch(err => console.error(`Cilad kicinta tooska ah ee ${storeId}:`, err));
            
            // Sii yara naso si uusan server-ku u culeysmin marka uu mar qura kicinayo bot-yo badan
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log('✅ Dhammaan bot-yadii diiwaangashanaa waa la kiciyay.');
    } catch (error) {
        console.error('❌ Cilad ka dhacday autoStartAllBots:', error);
    }
}

module.exports = { startWhatsApp, getStoreConnectionState, stopWhatsApp, softRestartWhatsApp, requestWhatsAppPairingCode, sendMessageFromHandler, autoStartAllBots };