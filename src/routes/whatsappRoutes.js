// src/routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const { addMessageToQueue } = require('../services/queueService'); 
const { isLoggedIn } = require('../middleware/authMiddleware.js'); 
const { getStoreConnectionState, downloadMetaMedia } = require('../services/whatsappService.js');
const supabase = require('../config/supabaseClient'); 

// UI endpoints (kept for compatibility with frontend so UI doesn't crash)
router.post('/start', isLoggedIn, (req, res) => res.send({ status: 'started' }));
router.post('/restart', isLoggedIn, (req, res) => res.send({ status: 'restarting' }));
router.get('/qr', isLoggedIn, (req, res) => res.send({ qrImage: 'connected' }));
router.post('/pair', isLoggedIn, (req, res) => res.send({ status: 'success', code: 'META-API-CONNECTED' }));

// Meta API Webhook Verifier
router.get('/webhook', (req, res) => {
    const verify_token = process.env.VERIFY_TOKEN || "midaar_token";
    
    let mode = req.query["hub.mode"];
    let token = req.query["hub.verify_token"];
    let challenge = req.query["hub.challenge"];

    if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            console.log("WEBHOOK_VERIFIED");
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
});

// Meta API Webhook Receiver
router.post('/webhook', async (req, res) => {
    try {
        let body = req.body;

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                let phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
                let msgInfo = body.entry[0].changes[0].value.messages[0];
                let from = msgInfo.from; 
                let msg_body = msgInfo.text ? msgInfo.text.body : "";

                // Map incoming Webhook to the correct store using the phone_id column
                const { data: stores, error } = await supabase
                    .from('stores')
                    .select('id, whatsappapi, phone_id')
                    .not('phone_id', 'is', null)
                    .not('whatsappapi', 'is', null);

                let storeId = null;
                let token = null;

                if (stores && stores.length > 0) {
                    for (const store of stores) {
                        if (store.phone_id && store.phone_id.trim() === phone_number_id) {
                            storeId = store.id;
                            token = store.whatsappapi.trim();
                            break;
                        }
                    }
                }

                if (storeId) {
                    let imageBase64 = null;
                    if (msgInfo.type === 'image') {
                        const imageId = msgInfo.image.id;
                        if (msgInfo.image.caption) {
                            msg_body = msgInfo.image.caption;
                        }
                        if (token) {
                            imageBase64 = await downloadMetaMedia(imageId, token);
                        }
                    }

                    if (msg_body || imageBase64) {
                        await addMessageToQueue({
                            storeId: storeId,
                            customerPhone: from,
                            messageBody: msg_body,
                            imageData: imageBase64
                        });
                    }
                } else {
                    console.error("No store found matching the incoming WhatsApp phone_number_id.");
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (err) {
        console.error("Webhook processing error:", err);
        res.sendStatus(500);
    }
});

module.exports = router;