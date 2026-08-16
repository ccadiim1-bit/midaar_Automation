// src/routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const { startWhatsApp, getStoreConnectionState, requestWhatsAppPairingCode } = require('../services/whatsappService.js');

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.isLoggedIn && req.session.storeData) {
        return next();
    }
    res.status(401).send({ error: "Fadlan soo gal nidaamka" });
}

router.use(isLoggedIn);

router.post('/start', (req, res) => {
    const storeId = req.session.storeData.id;
    
    startWhatsApp(storeId).catch(err => {
        console.error(`❌ Cilad ayaa ka dhacday kicinita Bot-ka dukaanka ${storeId}:`, err.message || err);
    });
    
    res.send({ status: 'started' });
});

router.get('/qr', (req, res) => {
    const storeId = req.session.storeData.id;
    const state = getStoreConnectionState(storeId);
    
    let qrImage = '';
    if (state.status === 'connected') {
        qrImage = 'connected';
    } else if (state.status === 'qr_ready') {
        qrImage = state.qr;
    }
    
    res.send({ qrImage });
});

router.post('/pair', async (req, res) => {
    const { phoneNumber } = req.body;
    const storeId = req.session.storeData.id;

    if (!phoneNumber) {
        return res.status(400).send({ error: "Nambarka WhatsApp-ka waa loo baahan yahay." });
    }

    try {
        const code = await requestWhatsAppPairingCode(storeId, phoneNumber);
        
        if (code) {
            res.send({ status: 'success', code: code });
        } else {
            res.status(400).send({ error: "Lama soo saari karin koodhka. Hubi in bot-ku diyaar yahay." });
        }
    } catch (err) {
        console.error(`❌ Cilad dhanka soo saarista Pairing Code-ka dukaanka ${storeId}:`, err);
        res.status(500).send({ error: "Cilad Server-ka ah ayaa dhacday." });
    }
});

module.exports = router;