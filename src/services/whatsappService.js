// src/services/whatsappService.js
const supabase = require('../config/supabaseClient');

async function getWhatsappConfig(storeId) {
    const { data: store, error } = await supabase
        .from('stores')
        .select('whatsappapi, phone_id')
        .eq('id', storeId)
        .single();
    
    if (error || !store || !store.whatsappapi || !store.phone_id) {
        throw new Error("WhatsApp Phone ID or Access Token not found. Please add them in Settings.");
    }
    
    return { 
        phoneId: store.phone_id.trim(), 
        token: store.whatsappapi.trim() 
    };
}

async function sendMessageFromHandler(storeId, recipient, text) {
    try {
        const { phoneId, token } = await getWhatsappConfig(storeId);
        
        const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: recipient,
                type: "text",
                text: { preview_url: false, body: text }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData);
        }
        // console.log(`[WHATSAPP] Sent message to ${recipient}`);
    } catch (error) {
        console.error(`[WHATSAPP] Failed to send message to ${recipient}:`, error.response ? JSON.stringify(error.response.data) : error.message);
    }
}

// Helper to download media if needed (called from webhook route)
async function downloadMetaMedia(imageId, token) {
    try {
        // 1. Get media URL
        const urlRes = await fetch(`https://graph.facebook.com/v20.0/${imageId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!urlRes.ok) throw new Error("Failed to get media URL");
        const urlData = await urlRes.json();
        const mediaUrl = urlData.url;

        // 2. Download binary
        const mediaRes = await fetch(mediaUrl, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        
        if (!mediaRes.ok) throw new Error("Failed to download media binary");
        
        const arrayBuffer = await mediaRes.arrayBuffer();

        // 3. Convert to base64
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (err) {
        console.error("[WHATSAPP] Error downloading media:", err.message);
        return null;
    }
}

// Dummy functions to maintain compatibility with existing codebase without breaking anything
async function autoStartAllBots(addMessageToQueueFn) {
    console.log("Meta WhatsApp API uses Webhooks. No bots to auto-start.");
}

// Alias needed by authRoutes.js on login - no-op with Meta API (webhook-based)
async function startWhatsApp(storeId, addMessageToQueueFn) {
    console.log(`[META API] Store ${storeId} uses Webhooks. No session to start.`);
}

function stopWhatsApp(storeId) {
    console.log("Stop requested, but Meta API uses webhooks.");
}

async function softRestartWhatsApp(storeId) {
    console.log("Restart requested, but Meta API uses webhooks.");
}

function getStoreConnectionState(storeId) {
    return { qr: '', status: 'connected' };
}

module.exports = { 
    sendMessageFromHandler, 
    autoStartAllBots, 
    startWhatsApp,
    stopWhatsApp, 
    softRestartWhatsApp, 
    getStoreConnectionState,
    downloadMetaMedia,
    getWhatsappConfig
};