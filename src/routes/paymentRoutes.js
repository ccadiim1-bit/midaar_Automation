// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

// TASK 1: New route to save the expected payment number
router.post('/set-expected-number', isLoggedIn, async (req, res) => {
    let { senderNumber } = req.body;
    const storeId = req.session.storeData.id;

    if (!senderNumber) {
        return res.status(400).json({ success: false, message: 'senderNumber is required' });
    }

    // Nadiifi nambarka oo u qaabee qaabka saxda ah (Ka jar 252, kuna dar 0 haddii ay maqan tahay)
    senderNumber = senderNumber.replace(/[^0-9]/g, '');
    if (senderNumber.startsWith('252')) {
        senderNumber = senderNumber.substring(3);
    }
    if (/^(61|62|68|69|77|90)/.test(senderNumber)) {
        senderNumber = '0' + senderNumber;
    }

    try {
        const { error } = await supabase
            .from('stores')
            .update({ payment_number: senderNumber })
            .eq('id', storeId);

        if (error) throw error;

        res.json({ success: true });
    } catch (error) {
        console.error('Error setting expected payment number:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

// 🟢 CUSBOONAYSIIN: La waafajiyay fariimaha dhabta ah ee Hormuud, Somnet, Golis, iyo Somtel
const parseEvcPlusSms = (text) => {
    // Qaabka 1: EVC to EVC (Hormuud)
    // Tusaale: [-EVCPLUS-] waxaad $4.99 ka heshay 0613984128...
    let match = text.match(/waxaad\s+\$([0-9,.]+)\s+ka\s+heshay\s+(\d+)/i);
    if (match) {
        return {
            amount: parseFloat(match[1].replace(/,/g, '')),
            senderNumber: match[2],
            transactionId: null,
            paymentMethod: 'EVC Plus'
        };
    }

    // Qaabka 2: Somnet (Jeep) iyo Golis (Sahal)
    // Tusaale Somnet: [-EVCPlus-] $0.01 ayaad ka Heshay Magac(25268...)... via Somnet Telecom
    // Tusaale Golis: [-EVCPlus-] $1 ayaad ka Heshay Magac(25290...)... via Sahal mfs
    match = text.match(/\$([0-9,.]+)\s+ayaad\s+ka\s+heshay.*?\((252\d+)\).*?via\s+(Somnet|Sahal)/i);
    if (match) {
        return {
            amount: parseFloat(match[1].replace(/,/g, '')),
            senderNumber: match[2],
            transactionId: null,
            paymentMethod: match[3].toLowerCase().includes('sahal') ? 'Golis' : 'Somnet'
        };
    }

    return null;
};

const parseEDahabSms = (text) => {
    // Tusaale eDahab: 1.5 Dollar Ayaad Ka Heshay Magac... Lambarka :623246102 Aqanoosiga : PP...
    const amountMatch = text.match(/([0-9,.]+)\s+Dollar Ayaad Ka Heshay/i);
    const numberMatch = text.match(/Lambarka\s*:\s*(\d+)/i);
    
    // Waxaan ku darnay 'Aqanoosiga' maadaama Somtel ay qalad higgaad ah ku leeyihiin SMS-kooda
    const transactionIdMatch = text.match(/(?:Aqanoosiga|Aqoonsiga)\s*:\s*([A-Z0-9.]+)/i);

    if (amountMatch && numberMatch) {
        return {
            amount: parseFloat(amountMatch[1].replace(/,/g, '')),
            senderNumber: numberMatch[1],
            transactionId: transactionIdMatch ? transactionIdMatch[1] : null,
            paymentMethod: 'eDahab'
        };
    }
    return null;
};

// Middleware-ka Amniga ee Webhook-ga
function verifySmsWebhook(req, res, next) {
    const providedSecret = req.headers['x-sms-secret'];
    const expectedSecret = process.env.SMS_WEBHOOK_SECRET;

    // 🟢 KUDARIS CUSUB: Si loo ogaado ciladda, aan soo bandhigno waxa naloo soo diray
    // Removed debugging logs to hide passwords from the terminal
    
    if (!expectedSecret || providedSecret !== expectedSecret) {
        console.warn('[PAYMENT] Codsi Webhook ah oo aan la aqoon ama aan lahayn sir sax ah.');
        return res.status(403).send('Forbidden: Access Denied');
    }
    next();
}

router.post('/sms-webhook', verifySmsWebhook, async (req, res) => {
    try {
        const text = req.body.text || req.body.content || req.body.message || req.body.body;
        const from = req.body.from || req.body.sender || req.body.phone;

        if (!text) {
            console.log('Webhook received without text body.');
            return res.status(400).send('Missing SMS text');
        }

        // 🟢 Tus qoraalka dhabta ah ee soo dhacay
        console.log(`[PAYMENT] Received SMS from ${from}: "${text}"`);

        // 🟢 Si toos ah u tijaabi dhammaan shirkadaha (Ha ku xirin from===192)
        let paymentInfo = parseEvcPlusSms(text) || parseEDahabSms(text);

        if (!paymentInfo) {
            console.log('[PAYMENT] Could not parse payment info from SMS.');
            return res.status(200).send('SMS not a recognized payment format.');
        }

        const { amount, senderNumber, transactionId, paymentMethod } = paymentInfo;
        console.log(`[PAYMENT] Parsed successfully: $${amount} from ${senderNumber} via ${paymentMethod}`);

        // TASK 3: Check Database
        // 🟢 XALKA UGU DAMBEEYA: Si joogto ah u nadiifi nambarada si is waafaqsan
        const robustCleanNumber = (num) => {
            if (!num) return '';
            let cleaned = num.replace(/[^0-9]/g, '');
            if (cleaned.startsWith('252')) cleaned = cleaned.substring(3);
            if (cleaned.startsWith('0')) cleaned = cleaned.replace(/^0+/, '');
            return cleaned;
        };

        const cleanSender = robustCleanNumber(senderNumber);
        console.log(`[PAYMENT DEBUG] Raadinta nambarka la nadiifiyay: ${cleanSender}`);

        // Soo jiid dhammaan dukaamada si aan u hubinno khaanadaha admin_number IYO payment_number
        const { data: allStores, error: storesError } = await supabase
            .from('stores')
            .select('id, admin_number, payment_number');

        if (storesError || !allStores) {
            console.error('[PAYMENT] Cilad baa ka dhacday soo jiidista dukaamada:', storesError);
            return res.status(500).send('Database error');
        }

        // Raadi dukaanka leh nambarka (ha ahaado kii diiwaanka ama kii uu hadda galiyay foomka)
        const store = allStores.find(s => {
            const cleanAdmin = robustCleanNumber(s.admin_number);
            const cleanPayment = robustCleanNumber(s.payment_number);
            
            return cleanAdmin === cleanSender || cleanPayment === cleanSender;
        });

        if (!store) {
            // Haddii la waayo, wuxuu terminal-ka noogu soo daabici doonaa waxa dhabta ah ee DB-ga ku jira
            console.error(`[PAYMENT] Store not found. Nambarada DB-ga ku jira waa:`, allStores.map(s => ({ id: s.id, admin: s.admin_number, pay: s.payment_number })));
            return res.status(200).send('Store not found for this number.');
        }

        console.log(`[PAYMENT] ✅ Waa la helay dukaanka! ID: ${store.id}`);
        let planType = 'unknown';
        const subscriptionEndDate = new Date();
        let messageLimit = 0;

        // Hubinta xirmada
        if (amount >= 4.90 && amount <= 5.00) {
            planType = 'weekly';
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 7);
            messageLimit = 100; 
        } else if (amount >= 9.90 && amount <= 10.00) {
            planType = 'monthly';
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            messageLimit = 1000; 
        } else if (amount >= 99.90 && amount <= 100.00) {
            planType = 'premium';
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            messageLimit = 999999999; 
        } else {
            console.log(`[PAYMENT] Unsupported payment amount: ${amount}`);
            return res.status(200).send('Unsupported payment amount.');
        }

        // Diiwaangeli lacag bixinta
        const { error: paymentInsertError } = await supabase.from('payments').insert({
            store_id: store.id,
            sender_number: senderNumber,
            amount: amount,
            transaction_id: transactionId,
            payment_method: paymentMethod
        });

        if (paymentInsertError) console.error('[PAYMENT] Error inserting payment record:', paymentInsertError);

        // U fur adeegga macaamiisha
        const { error: storeUpdateError } = await supabase.from('stores').update({
            is_pro: true,
            monthly_message_count: 0,
            plan_type: planType,
            subscription_end_date: subscriptionEndDate.toISOString(),
            message_limit: messageLimit
        }).eq('id', store.id);

        if (storeUpdateError) throw storeUpdateError;

        console.log(`[PAYMENT] ✅ Successfully upgraded store ${store.id} to Pro (${planType}).`);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error in payment webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;