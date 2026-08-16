// src/routes/pageRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const loginPage = require('../pages/login.js');
const registerPage = require('../pages/register.js');
const dashboardPage = require('../pages/dashboard.js');
const settingsPage = require('../pages/settings.js');
const { getStoreConnectionState } = require('../services/whatsappService.js');

// Middleware to check if user is logged in
function isLoggedIn(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    res.redirect('/login');
}

router.get('/', (req, res) => {
    res.redirect('/login');
});

router.get('/register', (req, res) => {
    res.redirect('/login');
});

router.get('/login', (req, res) => {
    res.send(loginPage());
});

router.get('/register-setup', (req, res) => {
    if (!req.session.tempUser) {
        return res.redirect('/login');
    }
    const userEmail = req.session.tempUser.email || '';
    res.send(registerPage(userEmail));
});

router.get('/dashboard', isLoggedIn, async (req, res) => {
    try {
        const storeId = req.session.storeData.id;

        // Soo jiido xaaladda bot-ka
        const botState = getStoreConnectionState(storeId);
        const isBotConnected = botState.status === 'connected';

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Cilad dhanka soo jiidista alaabta ah:", error.message);
            return res.send(dashboardPage([], isBotConnected));
        }

        // U gudbi xaaladda bot-ka bogga
        res.send(dashboardPage(products, isBotConnected));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        // U gudbi xaalad default ah haddii cilad server dhacdo
        res.send(dashboardPage([], false));
    }
});

router.get('/settings', isLoggedIn, async (req, res) => {
    try {
        const storeId = req.session.storeData.id;
        const { data: store, error } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();

        if (error) {
            console.error("Cilad dhanka soo jiidista xogta Settings-ka ah:", error.message);
            return res.send(settingsPage(req.session.storeData));
        }

        req.session.storeData = store;
        res.send(settingsPage(store));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.send(settingsPage(req.session.storeData));
    }
});

module.exports = router;