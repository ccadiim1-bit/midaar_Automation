// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient.js');
const { isLoggedIn } = require('../middleware/authMiddleware.js'); // 🟢 WAA LAGU DARAY: Middleware la wadaago

// TASK 1: New route to save the expected payment number
router.post('/set-expected-number', isLoggedIn, async (req, res) => {
    const { senderNumber } = req.body;
    const storeId = req.session.storeData.id;

    if (!senderNumber) {
        return res.status(400).json({ success: false, message: 'senderNumber is required' });
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

// TASK 2: Updated SMS parsing logic
const parseEvcPlusSms = (text) => {
    let amountMatch, numberMatch, paymentMethod = 'EVC Plus';
    
    // Check if it's Golis or Somnet cross-network via Hormuud
    if (text.includes('via Sahal') || text.includes('via Somnet')) {
        amountMatch = text.match(/\$([0-9,.]+)\s+ayaad ka Heshay/i);
        numberMatch = text.match(/\((\d+)\)/); // Number is in parentheses
        paymentMethod = text.includes('Sahal') ? 'Golis' : 'Somnet';
    } else {
        // Standard EVC Plus
        amountMatch = text.match(/waxaad\s+\$([0-9,.]+)\s+ka heshay/i);
        numberMatch = text.match(/ka heshay\s+(\d+)/i);
    }

    if (amountMatch && numberMatch) {
        return {
            amount: parseFloat(amountMatch[1].replace(/,/g, '')),
            senderNumber: numberMatch[1], // This will be the number inside parentheses for cross-network
            transactionId: null,
            paymentMethod: paymentMethod
        };
    }
    return null;
};

const parseEDahabSms = (text) => {
    const amountMatch = text.match(/([0-9,.]+)\s+Dollar Ayaad Ka Heshay/i);
    const numberMatch = text.match(/Lambarka\s*:\s*(\d+)/i);
    const transactionIdMatch = text.match(/Aqoonsiga\s*:\s*([A-Z0-9.]+)/i);

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

    if (!expectedSecret || providedSecret !== expectedSecret) {
        console.warn('[PAYMENT] Codsi Webhook ah oo aan la aqoon ama aan lahayn sir sax ah.');
        return res.status(403).send('Forbidden: Access Denied');
    }
    next();
}

router.post('/sms-webhook', verifySmsWebhook, async (req, res) => {
    try {
        const { from, text } = req.body;

        if (!text) {
            console.log('Webhook received without text body.');
            return res.status(400).send('Missing SMS text');
        }

        console.log(`[PAYMENT] Received SMS from ${from}: ${text}`);

        let paymentInfo;
        if (from === '192') {
            paymentInfo = parseEvcPlusSms(text);
        } else {
            paymentInfo = parseEDahabSms(text);
        }

        if (!paymentInfo) {
            console.log('[PAYMENT] Could not parse payment info from SMS.');
            return res.status(200).send('SMS not a recognized payment format.');
        }

        const { amount, senderNumber, transactionId, paymentMethod } = paymentInfo;

        // TASK 3: Update DB query to check payment_number
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('id, admin_number')
            .or(`admin_number.eq.${senderNumber},admin_number.eq.252${senderNumber},payment_number.eq.${senderNumber},payment_number.eq.252${senderNumber}`)
            .single();

        if (storeError || !store) {
            console.error('[PAYMENT] Error finding store or store not found for number:', senderNumber, storeError);
            return res.status(200).send('Store not found for this number.');
        }

        let planType = 'unknown';
        const subscriptionEndDate = new Date();
        let messageLimit = 0;

        if (amount >= 4.90 && amount <= 5.00) {
            planType = 'weekly';
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 7);
            messageLimit = 500; // Xirmada Toddobaadlaha: 500 fariin
        } else if (amount >= 9.90 && amount <= 10.00) {
            planType = 'monthly';
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            messageLimit = 5000; // Xirmada Bishii: 5,000 fariin
        } else if (amount >= 99.90 && amount <= 100.00) {
            planType = 'premium';
            subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
            messageLimit = 999999999; // Xirmada Premium: Fariimo aan xad lahayn
        } else {
            console.log(`[PAYMENT] Unsupported payment amount: ${amount}`);
            return res.status(200).send('Unsupported payment amount.');
        }

        const { error: paymentInsertError } = await supabase.from('payments').insert({
            store_id: store.id,
            sender_number: senderNumber,
            amount: amount,
            transaction_id: transactionId,
            payment_method: paymentMethod
        });

        if (paymentInsertError) console.error('[PAYMENT] Error inserting payment record:', paymentInsertError);

        const { error: storeUpdateError } = await supabase.from('stores').update({
            is_pro: true,
            monthly_message_count: 0,
            plan_type: planType,
            subscription_end_date: subscriptionEndDate.toISOString(),
            message_limit: messageLimit
        }).eq('id', store.id);

        if (storeUpdateError) throw storeUpdateError;

        console.log(`[PAYMENT] Successfully upgraded store ${store.id} to Pro (${planType}).`);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error in payment webhook:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;