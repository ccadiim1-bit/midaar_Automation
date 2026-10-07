// src/services/messageHandlerService.js
const supabase = require('../config/supabaseClient');
const { generateAIResponse } = require('./aiService');
const { sendMessageFromHandler, stopWhatsApp } = require('./whatsappService');

// In-memory storage for chat history. For production, consider Redis or a database.
const userChatHistory = {};

/**
 * Logs the response and increments the message count for the store.
 * @param {string} storeId - The ID of the store.
 * @param {string} customerPhone - The customer's phone number.
 * @param {string} messageBody - The original message from the customer.
 * @param {string} responseBody - The response sent to the customer.
 * @param {'greeting' | 'faq' | 'ai' | 'limit'} responseType - The type of response.
 */
async function logAndIncrement(storeId, customerPhone, messageBody, responseBody, responseType) {
  // 1. Log the message to the message_logs table
  const { error: logError } = await supabase.from('message_logs').insert({
    store_id: storeId,
    customer_phone: customerPhone,
    response_type: responseType,
  });

  if (logError) {
    console.error(`[HANDLER] Error logging message for store ${storeId}:`, logError);
  }

  // 2. Increment the store's message count via RPC
  // Ensure you have created this RPC function in Supabase.
  const { error: rpcError } = await supabase.rpc('increment_message_count', {
    store_uuid: storeId,
  });

  if (rpcError) {
    console.error(`[HANDLER] Error incrementing message count for store ${storeId}:`, rpcError);
  }
}

/**
 * Processes an incoming message through a 3-tier system.
 * @param {string} storeId - The ID of the store receiving the message.
 * @param {string} customerPhone - The phone number of the customer.
 * @param {string} messageBody - The text of the incoming message.
 */
async function handleIncomingMessage(storeId, customerPhone, messageBody, imageData = null) {
  // 🔒 FIX 3: Ka hortagga crash-ka "undefined.toLowerCase()" marka sawir la soo diro
  // messageBody waxay noqon kartaa undefined ama null marka fariinta oo keliya sawir tahay
  messageBody = messageBody || '';
  imageData = imageData || null;

  const lowerCaseMessage = messageBody.toLowerCase().trim();

  console.log(`[HANDLER] 🔄 Fariin la helay - Store: ${storeId}, Ka: ${customerPhone}, Qoraal: "${messageBody}", Sawir: ${imageData ? 'Haa' : 'Maya'}`);

  // --- PRE-CHECK: Subscription Limit ---
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('monthly_message_count, message_limit, greeting_message, is_pro')
    .eq('id', storeId)
    .single();

  if (storeError || !store) {
    console.error(`[HANDLER] ❌ Store data lama helin ID: ${storeId}`, storeError);
    return;
  }

  console.log(`[HANDLER] 📊 Store xogta: is_pro=${store.is_pro}, count=${store.monthly_message_count}/${store.message_limit}`);

  // Kaliya hubi salaanta iyo FAQ haddii aysan fariintu sawir lahayn
  if (!imageData) {
    // --- TIER 1: Greeting Check ---
    const greetings = ['hi', 'hello', 'salaam', 'slm', 'salam', 'is ka waran', 'iska waran', 'haye', 'asc', 'waryaa haye', 'saaxiib', '.'];
    if (greetings.some(g => lowerCaseMessage.startsWith(g))) {
      console.log(`[HANDLER] 👋 TIER 1: Salaan la helay - ku jawaabaya greeting response`);
      const greetingResponse = store.greeting_message || "Salaam! Sideen kuu caawin karaa maanta?";
      await sendMessageFromHandler(storeId, customerPhone, greetingResponse);
      await logAndIncrement(storeId, customerPhone, messageBody, greetingResponse, 'greeting');
      return;
    }

    // --- TIER 2: FAQ Caching ---
    console.log(`[HANDLER] 🔍 TIER 2: FAQ-yada la hubinayaa...`);
    const { data: faqs, error: faqError } = await supabase
      .from('store_faqs')
      .select('answer, keywords')
      .eq('store_id', storeId);

    if (faqError) console.error(`[HANDLER] Error fetching FAQs for store ${storeId}:`, faqError);

    if (faqs && faqs.length > 0) {
      for (const faq of faqs) {
        const foundKeyword = faq.keywords.some(keyword => lowerCaseMessage.includes(keyword.toLowerCase()));
        if (foundKeyword) {
          console.log(`[HANDLER] 📚 TIER 2: FAQ la helay - ku jawaabaya`);
          await sendMessageFromHandler(storeId, customerPhone, faq.answer);
          await logAndIncrement(storeId, customerPhone, messageBody, faq.answer, 'faq');
          return;
        }
      }
    }
  }

  // --- Chat History Management ---
  if (!userChatHistory[storeId]) userChatHistory[storeId] = {};
  if (!userChatHistory[storeId][customerPhone]) userChatHistory[storeId][customerPhone] = [];

  // Ku dar fariinta isticmaalaha taariikhda. Haddii ay sawir tahay, ku dar qoraal ku meel gaar ah.
  const historyText = messageBody || "[Sawir la soo diray]";
  userChatHistory[storeId][customerPhone].push({ role: 'user', text: historyText });
  // Keep only the last 6 messages to prevent history from growing too large
  if (userChatHistory[storeId][customerPhone].length > 6) {
    userChatHistory[storeId][customerPhone].shift();
  }

  // --- TIER 3: AI Fallback ---
  console.log(`[HANDLER] 🤖 TIER 3: AI-ga loo gudbaynayaa fariinta...`);
  
  // Fetch chat history for the current user
  const chatHistoryForAI = userChatHistory[storeId][customerPhone];

  const aiResponse = await generateAIResponse(storeId, messageBody, chatHistoryForAI, imageData);
  console.log(`[HANDLER] ✅ AI jawaab soo celisay: "${aiResponse ? aiResponse.substring(0, 80) : 'MALA'}..."`);

  // Add AI's response to history
  userChatHistory[storeId][customerPhone].push({ role: 'ai', text: aiResponse });
  // Keep only the last 6 messages
  if (userChatHistory[storeId][customerPhone].length > 6) {
    userChatHistory[storeId][customerPhone].shift();
  }

  await sendMessageFromHandler(storeId, customerPhone, aiResponse);
  console.log(`[HANDLER] ✅ Fariinta AI waa loo diray: ${customerPhone}`);
  await logAndIncrement(storeId, customerPhone, messageBody, aiResponse, 'ai');
}

module.exports = { handleIncomingMessage };