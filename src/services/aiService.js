// src/services/aiService.js
const supabase = require('../config/supabaseClient'); 
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai'); // Import OpenAI for DeepSeek fallback
require('dotenv').config(); // Ensure dotenv is loaded

/**
 * 1. Load multiple Gemini API keys from .env file (e.g., GEMINI_KEY_1, GEMINI_KEY_2).
 * This allows for load balancing and avoids rate limits.
 */
const geminiApiKeys = Object.keys(process.env)
  .filter(key => key.startsWith('GEMINI_KEY_'))
  .map(key => process.env[key]);

if (geminiApiKeys.length === 0) {
  console.error('❌ CRITICAL: No GEMINI_KEY_... found in .env file. AI service will not work.');
  // Consider exiting or throwing here if AI is absolutely essential
}

let currentApiKeyIndex = 0;

/**
 * 2. Implements a round-robin mechanism to rotate through the available API keys.
 * @returns {string} The next API key to use.
 */
function getNextApiKey() {
  if (geminiApiKeys.length === 0) {
    throw new Error("No Gemini API keys available.");
  }
  // Ensure we don't go out of bounds if keys are removed or changed dynamically (unlikely but safe)
  if (currentApiKeyIndex >= geminiApiKeys.length) {
    currentApiKeyIndex = 0;
  }  const key = geminiApiKeys[currentApiKeyIndex];
  currentApiKeyIndex = (currentApiKeyIndex + 1) % geminiApiKeys.length;
  console.log(`[AI] Using API Key index: ${currentApiKeyIndex}`);
  return key;
}

// Preferred Gemini models to try in order of preference/cost
const preferredGeminiModels = [
    "gemini-flash-latest",
];

async function generateAIResponse(storeId, userPrompt, productsContext, chatHistory = [], imageData = null) {
    try {
        const { data: storeInfo, error: storeError } = await supabase
            .from('stores') 
            .select('system_prompt, location, work_hours, gemini_key') // 🟢 WAA LAGU DARAY: gemini_key
            .eq('id', storeId)
            .single();

        if (storeError) {
            console.error('❌ Cilad akhrinta Dukaanka:', storeError.message);
            return "Waan ka xunnahay, cilad ayaa ka dhacday dhanka kaydka.";
        }

        const finalSystemPrompt = `
        ${storeInfo?.system_prompt || 'Waxaad tahay iibiye asluub leh oo matalaya dukaankan.'}
        
        XOGTA DUKAANKA:
        📍 Goobta: ${storeInfo?.location || 'Lama garanayo'}
        ⏰ Saacadaha: ${storeInfo?.work_hours || 'Lama garanayo'}
        ${productsContext}

        SHURUUDAHA JAWABTA:
        1. Ula hadl sidii qof iibiye ah oo xushmad leh.
        2. Af-Soomaali gaaban oo cad isticmaal.
        3. Haddii wax aan jirin lagu weydiiyo, dheh hadda ma hayno.
        4. KALA SAAR WEYDIINTA IYO DALABKA RASMIGA AH:
           - WEYDIIN (Inquiry): Haddii qofku weydiinayo qiimaha, midabka, ama "ma haysaa?", u sharax alaabta hana soo saarin ORDER_TRIGGERED.
           - DALAB DHAB AH (Order): MARNABA ha soo saarin ORDER_TRIGGERED haddii uusan macmiilku si cad u soo qorin 3-daan qodob: 1. Magaciisa 2. Nambarkiisa Telefoonka 3. Goobtiisa/Magaalada.
           - HADDII XOGTU DHIMAN TAHAY: Haddii uu yiraahdo "waan iibsanayaa" ama "ii keena" balse uusan soo wada raacinin Magaca, Nambarka iyo Goobta, weydii xogta dhiman si xushmad leh (tusaale: "Fadlan iisoo qor magacaaga, nambarkaaga iyo goobta lagugu keenayo si aan dalabka kuugu diiwaangeliyo"), hana soo saarin ORDER_TRIGGERED.
        5. XUSUUSTA DALABKA IYO LA SAXIDA XOGTA (CORRECTION & UPDATE):
           - Haddii macmiilku horay u dalbaday oo uu kaliya sheeko caadi ah wado, ha celinin ORDER_TRIGGERED mar labaad.
           - HADDII MACMIILKU SAXO AMA KA BEDDELO XOGTII DALABKA (tusaale: uu yiraahdo "nambarka baan qalday", "nambarkayga saxda ah waa X", ama uu goobta beddelo), WAA IN AAD MAR LABAAD SOO SAARTAA ORDER_TRIGGERED iyadoo nambarka/xogta cusub ee la saxay ay ku jirto!
        6. KA SOO NIDAAMI ALAABTA XUSUUSTA (PRODUCT INFERENCE):
           - Haddii uu macmiilku yiraahdo "ii keena", "waan iibsanayaa", ama uu soo diro Magac, Nambar iyo Goob ISAGOON MAGACA ALAABTA MAR KALE SOO SAARIN:
           - Ka raadi sheekada hore (chatHistory) alaabtii ugu dambaysay ee uu qiimaheeda ama xogteeda weydiinayay.
           - Ku buuxi magaca alaabtaas qaybta [Alaabta La Dalbaday] ee ORDER_TRIGGERED.
        7. QAABKA SOO SAARISTA DALABKA: Kaliya marka macmiilku uu soo wada gudbiyo xogta oo dhan (Magac, Nambar, Goob), soo saar fariin qaabkan ah (adigoon raacinin sheeko kale):
           ORDER_TRIGGERED: [Magaca Macmiilka] | [Nambarka Telefoonka] | [Goobta/Magaalada] | [Alaabta La Dalbaday]
        `;

        const formattedHistory = chatHistory.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        // Gemini requires history to start with a user message
        // Ensure the history starts with a 'user' role, if not, remove leading 'model' messages
        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift(); 
        }

        let aiResponseText = null;
        
        // --- 🟢 TALLAABADA 1-AAD: Isku day furaha gaarka ah ee dukaanka (Store's API Key) ---
        if (storeInfo && storeInfo.gemini_key) {
            console.log(`[AI] Waxaa la isku dayayaa furaha gaarka ah ee dukaanka...`);
            for (const modelName of preferredGeminiModels) {
                try {
                    console.log(`🔄 [AI] Iskudayga Model-ka: ${modelName} (Furaha Dukaanka)`);
                    const genAI = new GoogleGenerativeAI(storeInfo.gemini_key);
                    const model = genAI.getGenerativeModel({ 
                        model: modelName,
                        systemInstruction: finalSystemPrompt
                    });
    
                    // 🟢 CUSBOONAYSIIN: Ku dar sawirka haddii uu jiro
                    const promptParts = [];
                    if (imageData) {
                        promptParts.push({
                            inlineData: {
                                mimeType: 'image/jpeg', // Waxaan u qaadanaynaa inuu yahay JPEG
                                data: imageData,
                            },
                        });
                    }
                    // Ku dar qoraalka weydiinta
                    promptParts.push({ text: userPrompt });

                    const chatSession = model.startChat({ history: formattedHistory });
                    const result = await chatSession.sendMessage(promptParts);
                    aiResponseText = result.response.text();
                    
                    console.log(`✅ [AI] Guul! Furaha gaarka ah ee dukaanka ayaa shaqeeyay model-ka ${modelName}.`);
                    return aiResponseText; // Return immediately on success with store key

                } catch (storeKeyError) {
                    const errorMessage = storeKeyError.message || 'Cilad aan la aqoon';
                    console.warn(`⚠️ [AI] Furaha gaarka ah ee dukaanka wuu fashilmay (${modelName}):`, errorMessage);
                    // Do not return, let it fall through to master keys
                }
            }
        }

        // --- TALLAABADA 2-AAD: U gudub furayaasha guud haddii kii dukaanku fashilmo ama uusan jirin ---
        if (!aiResponseText) {
            console.log('[AI] Furaha dukaanka wuu fashilmay ama ma jiro. Waxaan u gudbaynaa furayaasha guud (master keys)...');
            
            for (let i = 0; i < geminiApiKeys.length; i++) {
                const apiKey = getNextApiKey(); // Get the next API key in round-robin
                
                for (const modelName of preferredGeminiModels) {
                    try {
                        console.log(`🔄 [AI] Iskudayga Gemini Model-ka: ${modelName} with API Key: ${apiKey.substring(0, 5)}...`);
                        const genAI = new GoogleGenerativeAI(apiKey);
                        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: finalSystemPrompt });
        
                        // 🟢 CUSBOONAYSIIN: Ku dar sawirka haddii uu jiro
                        const promptParts = [];
                        if (imageData) {
                            promptParts.push({
                                inlineData: {
                                    mimeType: 'image/jpeg',
                                    data: imageData,
                                },
                            });
                        }
                        promptParts.push({ text: userPrompt });

                        const chatSession = model.startChat({ history: formattedHistory });
                        const result = await chatSession.sendMessage(promptParts);
                        aiResponseText = result.response.text();
                        
                        console.log(`✅ [AI] Guul! Model-ka ${modelName} ayaa shaqeeyay.`);
                        return aiResponseText; // Return on first successful Gemini response
        
                    } catch (geminiError) {
                        const errorMessage = geminiError.message || 'Cilad aan la aqoon';
                        console.error(`❌ [AI] Gemini Model-ka ${modelName} wuu fashilmay (${apiKey.substring(0, 5)}):`, errorMessage);
                    }
                }
            }
        }

        // --- TALLAABADA 3-AAD: Fallback to DeepSeek if all Gemini attempts fail ---
        if (!aiResponseText) {
            const deepseekApiKey = process.env.MASTER_DEEPSEEK_API_KEY;
            if (!deepseekApiKey) {
                console.error('❌ CRITICAL: MASTER_DEEPSEEK_API_KEY not found in .env file. DeepSeek fallback not possible. Please add it to your .env file.');
                throw new Error("No DeepSeek API key available for fallback.");
            }

            try {
                console.log('⚠️ [AI] Dhammaan noocyadii Gemini way fashilmeen. Waxaan u gudbaynaa DeepSeek...');
                const deepseekClient = new OpenAI({
                    apiKey: deepseekApiKey,
                    baseURL: 'https://api.deepseek.com'
                });
                
                const deepseekMessages = [{ role: "system", content: finalSystemPrompt }];

                // Prepare chat history for DeepSeek
                chatHistory.forEach(msg => {
                    deepseekMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                // 🟢 CUSBOONAYSIIN: Ku dar sawirka iyo qoraalka DeepSeek
                const userMessageContent = [];
                if (userPrompt) {
                    userMessageContent.push({ type: "text", text: userPrompt });
                }
                if (imageData) {
                    userMessageContent.push({
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${imageData}`
                        }
                    });
                }
                if (userMessageContent.length > 0) {
                    deepseekMessages.push({ role: "user", content: userMessageContent });
                }

                console.log(`🔄 [AI] Iskudayga DeepSeek...`);

                const completion = await deepseekClient.chat.completions.create({
                    model: "deepseek-chat", // Or "deepseek-coder" if preferred
                    messages: deepseekMessages,
                });

                aiResponseText = completion.choices[0].message.content;
                console.log(`✅ [AI] Guul! DeepSeek ayaa shaqeeyay.`);
                return aiResponseText;

            } catch (deepseekError) {
                const errorMessage = deepseekError.message || 'Cilad aan la aqoon';
                console.error(`❌ [AI] DeepSeek sidoo kale wuu fashilmay:`, errorMessage);
                throw new Error("Dhammaan nidaamyadii AI-ga way fashilmeen.");
            }
        }

    } catch (error) {
        console.error('❌ Cilad weyn ayaa ka dhacday nidaamka AI-ga:', error.message);
        return "Cilad farsamo ayaa jirta, fadlan dib u isku day inyar kadib.";
    }
}

module.exports = { generateAIResponse };