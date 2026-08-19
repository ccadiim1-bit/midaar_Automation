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
  const lowerCaseMessage = messageBody.toLowerCase().trim();

  // --- PRE-CHECK: Subscription Limit ---
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('monthly_message_count, message_limit, greeting_message, is_pro')
    .eq('id', storeId)
    .single();

  if (storeError || !store) {
    console.error(`[HANDLER] Could not fetch store data for ID ${storeId}:`, storeError);
    return; // Stop processing if store not found
  }

  // Kaliya hubi salaanta iyo FAQ haddii aysan fariintu sawir lahayn
  if (!imageData) {
    // --- TIER 1: Greeting Check ---
    const greetings = ['hi', 'hello', 'salaam', 'slm', 'salam', 'is ka waran', 'iska waran', 'haye'];
    if (greetings.some(g => lowerCaseMessage.startsWith(g))) {
      const greetingResponse = store.greeting_message || "Salaam! Sideen kuu caawin karaa maanta?";
      await sendMessageFromHandler(storeId, customerPhone, greetingResponse);
      await logAndIncrement(storeId, customerPhone, messageBody, greetingResponse, 'greeting');
      // console.log(`[HANDLER] Responded with a greeting to ${customerPhone} for store ${storeId}.`);
      return;
    }

    // --- TIER 2: FAQ Caching ---
    const { data: faqs, error: faqError } = await supabase
      .from('store_faqs')
      .select('answer, keywords')
      .eq('store_id', storeId);

    if (faqError) console.error(`[HANDLER] Error fetching FAQs for store ${storeId}:`, faqError);

    if (faqs && faqs.length > 0) {
      for (const faq of faqs) {
        const foundKeyword = faq.keywords.some(keyword => lowerCaseMessage.includes(keyword.toLowerCase()));
        if (foundKeyword) {
          await sendMessageFromHandler(storeId, customerPhone, faq.answer);
          await logAndIncrement(storeId, customerPhone, messageBody, faq.answer, 'faq');
        // console.log(`[HANDLER] Responded with a cached FAQ to ${customerPhone} for store ${storeId}.`);
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
  // Keep only the last 10 messages to prevent history from growing too large
  if (userChatHistory[storeId][customerPhone].length > 10) {
    userChatHistory[storeId][customerPhone].shift();
  }

  // --- TIER 3: AI Fallback ---
  // console.log(`[HANDLER] No greeting or FAQ match. Falling back to AI for store ${storeId}.`);
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('product_name, product_price, product_desc')
    .eq('store_id', storeId);

  // Fetch chat history for the current user
  const chatHistoryForAI = userChatHistory[storeId][customerPhone];

  if (productError) console.error(`[HANDLER] Error fetching products for AI context:`, productError);

  let productsContext = "\n\n📦 ALAABTA AANU HAYNO:\n";
  productsContext += (products && products.length > 0)
    ? products.map(p => `- ${p.product_name}: ${p.product_price}. (${p.product_desc || ''})`).join('\n')
    : "Waqtigan xaadirka ah wax alaab ah oo firfircoon lama hayo.\n";
  
  const aiResponse = await generateAIResponse(storeId, messageBody, productsContext, chatHistoryForAI, imageData);

  // Add AI's response to history
  userChatHistory[storeId][customerPhone].push({ role: 'ai', text: aiResponse });
  // Keep only the last 10 messages
  if (userChatHistory[storeId][customerPhone].length > 10) {
    userChatHistory[storeId][customerPhone].shift();
  }

  await sendMessageFromHandler(storeId, customerPhone, aiResponse);
  await logAndIncrement(storeId, customerPhone, messageBody, aiResponse, 'ai');
  // console.log(`[HANDLER] Responded with AI to ${customerPhone} for store ${storeId}.`);
}

module.exports = { handleIncomingMessage };