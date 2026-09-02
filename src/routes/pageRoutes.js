// src/routes/pageRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const loginPage = require('../pages/login.js');
const registerPage = require('../pages/register.js');
const dashboardPage = require('../pages/dashboard.js');
const settingsPage = require('../pages/settings.js');
const { getStoreConnectionState } = require('../services/whatsappService.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

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

        // Fetch products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (productsError) {
            console.error("Cilad dhanka soo jiidista alaabta ah:", productsError.message);
            // Don't return, just render with empty products array
        }

        // 🟢 TASK 4: Fetch store subscription status
        const { data: storeStatus, error: statusError } = await supabase
            .from('stores')
            .select('is_pro, monthly_message_count, message_limit, plan_type, subscription_end_date')
            .eq('id', storeId)
            .single();

        if (statusError) {
            console.error("Cilad soo jiidista xaaladda isdiiwaangelinta:", statusError.message);
            // Render with default/fallback values if status fetch fails
            const defaultStatus = { is_pro: false, monthly_message_count: 0, message_limit: 50, plan_type: 'free' };
            return res.send(dashboardPage(products || [], isBotConnected, defaultStatus));
        }

        // HUBI IN XIRMADU DHACDAY (Waqti ama Quota)
        if (storeStatus && storeStatus.is_pro) {
            let expired = false;
            let reason = '';

            // Hubinta 1: Waqtiga (30 maalmood) - Xirmad kasta
            if (storeStatus.subscription_end_date) {
                const endDate = new Date(storeStatus.subscription_end_date);
                const now = new Date();
                if (now > endDate) {
                    expired = true;
                    reason = 'Waqtiga 30-ka maalmood way dhammaadeen';
                }
            }

            // Hubinta 2: Xadka fariimaha (Quota) - basic_100 iyo basic_1000 oo keliya (premium aan xad lahayn)
            if (!expired && storeStatus.monthly_message_count >= storeStatus.message_limit) {
                expired = true;
                reason = `Xadkii fariimaha (${storeStatus.monthly_message_count}/${storeStatus.message_limit}) waa la gaaray`;
            }

            if (expired) {
                console.log(`[PAGE] Xirmada dukaanka ${storeId} way dhacday: ${reason}`);
                storeStatus.is_pro = false;

                // Cusbooneysii DB-ga si loo diiwaangeliyo in xirmadu dhacday
                await supabase.from('stores').update({ is_pro: false }).eq('id', storeId);
            }
        }

        // U gudbi xaaladda bot-ka iyo xogta isdiiwaangelinta bogga
        res.send(dashboardPage(products || [], isBotConnected, storeStatus));

    } catch (err) {
        console.error("Cilad Server-ka ah:", err);
        res.send(dashboardPage([], false, false, 0));
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