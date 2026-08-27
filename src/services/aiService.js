// src/services/aiService.js
const supabase = require('../config/supabaseClient');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { OpenAI } = require('openai'); // Import OpenAI for DeepSeek & OpenRouter
require('dotenv').config(); // Ensure dotenv is loaded

// Preferred Gemini models to try in order of preference/cost
const preferredGeminiModels = [
    "gemini-2.5-flash",
    "gemini-1.5-flash-latest"
];

// Helper to execute product search
async function executeProductSearch(storeId, query) {
    const { data: products, error } = await supabase
        .from('products')
        .select('product_name, product_price, product_desc')
        .eq('store_id', storeId)
        .ilike('product_name', `%${query}%`)
        .limit(5); // limit to save tokens

    if (error) {
        console.error('❌ Cilad raadinta alaabta (DB):', error);
        return { message: 'Cilad ayaa dhacday markii la raadinayay alaabta.' };
    }

    if (!products || products.length === 0) {
        return { message: `Alaabta '${query}' lagama helin dukaanka.` };
    }

    return { products };
}

// Tool definitions for Gemini
const geminiTools = [{
    functionDeclarations: [
        {
            name: "search_store_products",
            description: "Search for a product in the store database by name or keywords to get its price, description, and availability. ALWAYS use this tool whenever the user asks about a product, its price, or if it's in stock. Don't say you don't know without using this tool.",
            parameters: {
                type: "OBJECT",
                properties: {
                    query: {
                        type: "STRING",
                        description: "The name or keywords of the product to search for (e.g., 'kabo nike', 'shaati', 'saacad')",
                    },
                },
                required: ["query"],
            },
        },
    ],
}];

// Tool definitions for OpenAI (OpenRouter & DeepSeek)
const openAiTools = [
    {
        type: "function",
        function: {
            name: "search_store_products",
            description: "Search for a product in the store database by name or keywords to get its price, description, and availability. ALWAYS use this tool whenever the user asks about a product, its price, or if it's in stock. Don't say you don't know without using this tool.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "The name or keywords of the product to search for (e.g., 'kabo nike', 'shaati', 'saacad')"
                    }
                },
                required: ["query"]
            }
        }
    }
];

async function generateAIResponse(storeId, userPrompt, chatHistory = [], imageData = null) {
    try {
        const { data: storeInfo, error: storeError } = await supabase
            .from('stores')
            .select('system_prompt, location, work_hours, gemini_key')
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

        MUHIIM: Haddii qofka macmiilka ahi uu wax ka weydiiyo alaab, Khasab Waa Inaad isticmaashid tool-ka 'search_store_products' si aad uga soo raadiso database-ka. Ha dhihin 'ma hayno' ama 'ma garanayo' ilaa aad tool-ka isticmaashid!

        🖼️ FAHAMIDA SAWIRADA (IMAGE UNDERSTANDING) - MUHIIM AADKA:
        - Haddii macmiilku soo diro SAWIR, waa inaad si toos ah u gartaa sawirka oo aad u sheegto waxa ku muuqda.
        - Ka dib markii aad gartid alaabta ku jirta sawirka, KU DARSII HALKAN HORE tool-ka 'search_store_products' si aad uga raadiso dukaanka.
        - Tusaale: Haddii sawirka uu muujinayo kabo Nike, raadi 'kabo nike' database-ka. Haddii uu muujinayo shaati cas, raadi 'shaati' database-ka.
        - Haddii alaabta sawirka ku jirta aanay database-ka ku jirin, u sheeg macmiilka si xushmad leh inaan la hayn alaabtan.
        - MARNABA ha iska indho tirin sawirka. Waxaad KHASAB tahay inaad ka jawaabto.

        SHURUUDAHA JAWABTA:
        1. Ula hadl sidii qof iibiye ah oo xushmad leh.
        2. Af-Soomaali gaaban oo cad isticmaal.
        3. Haddii wax aan jirin lagu weydiiyo oo aad ka weydo tool-ka, dheh hadda ma hayno.
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

        while (formattedHistory.length > 0 && formattedHistory[0].role === 'model') {
            formattedHistory.shift();
        }

        const effectiveUserPrompt = userPrompt || (imageData ? "Fadlan eeg sawirkan oo ii sheeg waxa ku muuqda, ka dib raadi alaabta dukaanka." : "");

        let aiResponseText = null;

        // XALLINTA SAWIRKA: Diyaarinta format-ka saxda ah ee base64 (ka jarida prefix haduu leeyahay)
        let cleanBase64 = null;
        let imageUrlForOpenAi = null;
        if (imageData) {
            cleanBase64 = imageData.replace(/^data:image\/\w+;base64,/, ""); // Wuxuu ka saarayaa horgalaha
            imageUrlForOpenAi = `data:image/jpeg;base64,${cleanBase64}`; // Wuxuu u samaynayaa horgale nadiif ah OpenRouter-ka
        }

        // --- TALLAABADA 1-AAD: Isku day furaha gaarka ah ee dukaanka (Store's API Key) ---
        if (storeInfo && storeInfo.gemini_key) {
            for (const modelName of preferredGeminiModels) {
                try {
                    const genAI = new GoogleGenerativeAI(storeInfo.gemini_key);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        systemInstruction: finalSystemPrompt,
                        tools: geminiTools
                    });

                    const promptParts = [];
                    // Kudar qoraalka
                    if (effectiveUserPrompt) {
                        promptParts.push({ text: effectiveUserPrompt });
                    }
                    // Kudar sawirka (Iyadoo la isticmaalayo base64 nadiif ah)
                    if (cleanBase64) {
                        promptParts.push({
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: cleanBase64,
                            },
                        });
                    }

                    const chatSession = model.startChat({ history: formattedHistory });
                    let result = await chatSession.sendMessage(promptParts);

                    const functionCalls = result.response.functionCalls();

                    if (functionCalls && functionCalls.length > 0) {
                        const call = functionCalls[0];
                        if (call.name === "search_store_products") {
                            const searchResult = await executeProductSearch(storeId, call.args.query);
                            result = await chatSession.sendMessage([{
                                functionResponse: {
                                    name: "search_store_products",
                                    response: searchResult
                                }
                            }]);
                        }
                    }

                    aiResponseText = result.response.text();
                    return aiResponseText;

                } catch (storeKeyError) {
                    const errorMessage = storeKeyError.message || 'Cilad aan la aqoon';
                    console.warn(`⚠️ [AI] Furaha gaarka ah ee dukaanka wuu fashilmay (${modelName}):`, errorMessage);
                }
            }
        }

        // --- TALLAABADA 2-AAD: U gudub OpenRouter haddii kii dukaanku fashilmo ---
        if (!aiResponseText) {
            const openRouterApiKey = process.env.OPENROUTER_KEY_1;
            if (openRouterApiKey) {
                // 🖼️ Modelasha vision-ka (saxan) ee OpenRouter
                const openRouterModelsToTry = [
                    "google/gemini-2.5-flash",       // ✅ FIX: Magaca saxda ah
                    "google/gemini-2.0-flash-001",   // Backup Google model
                    'anthropic/claude-3-haiku'       // Back up vision model
                ];

                if (imageData) {
                    console.log(`🖼️ [OpenRouter] Sawir ayaa la soo diray - waxaan isticmaalayaa vision model si loo garto.`);
                }

                const openRouterClient = new OpenAI({
                    apiKey: openRouterApiKey,
                    baseURL: 'https://openrouter.ai/api/v1'
                });

                const openRouterMessages = [{ role: "system", content: finalSystemPrompt }];

                chatHistory.forEach(msg => {
                    openRouterMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                const userMessageContent = [];
                if (effectiveUserPrompt) {
                    userMessageContent.push({ type: "text", text: effectiveUserPrompt });
                }
                // Ku darida sawirka qaabka OpenAI u baahan yahay
                if (imageUrlForOpenAi) {
                    userMessageContent.push({
                        type: "image_url",
                        image_url: { url: imageUrlForOpenAi }
                    });
                }

                if (userMessageContent.length > 0) {
                    openRouterMessages.push({ role: "user", content: userMessageContent });
                }

                for (const model of openRouterModelsToTry) {
                    try {
                        const completion = await openRouterClient.chat.completions.create({
                            model: model,
                            messages: openRouterMessages,
                            tools: openAiTools,
                            tool_choice: "auto"
                        });

                        let responseMessage = completion.choices[0].message;

                        if (responseMessage.tool_calls) {
                            openRouterMessages.push(responseMessage);

                            for (const toolCall of responseMessage.tool_calls) {
                                if (toolCall.function.name === 'search_store_products') {
                                    const args = JSON.parse(toolCall.function.arguments);
                                    const searchResult = await executeProductSearch(storeId, args.query);

                                    openRouterMessages.push({
                                        role: "tool",
                                        tool_call_id: toolCall.id,
                                        name: toolCall.function.name,
                                        content: JSON.stringify(searchResult),
                                    });
                                }
                            }

                            const secondCompletion = await openRouterClient.chat.completions.create({
                                model: model,
                                messages: openRouterMessages
                            });

                            aiResponseText = secondCompletion.choices[0].message.content;
                        } else {
                            aiResponseText = responseMessage.content;
                        }

                        if (aiResponseText) {
                            return aiResponseText;
                        }
                    } catch (openRouterError) {
                        const errorMessage = openRouterError.message || 'Cilad aan la aqoon';
                        console.error(`❌ [AI] OpenRouter (${model}) wuu fashilmay:`, errorMessage);
                    }
                }
            }
        }

        // --- TALLAABADA 3-AAD: Fallback to DeepSeek if all Gemini & OpenRouter attempts fail ---
        if (!aiResponseText) {
            const deepseekApiKey = process.env.MASTER_DEEPSEEK_API_KEY;
            if (!deepseekApiKey) {
                console.error('❌ CRITICAL: MASTER_DEEPSEEK_API_KEY not found in .env file. DeepSeek fallback not possible.');
                throw new Error("No DeepSeek API key available for fallback.");
            }

            try {
                console.log('⚠️ [AI] Dhammaan noocyadii hore way fashilmeen. Waxaan u gudbaynaa DeepSeek...');
                const deepseekClient = new OpenAI({
                    apiKey: deepseekApiKey,
                    baseURL: 'https://api.deepseek.com'
                });

                const deepseekMessages = [{ role: "system", content: finalSystemPrompt }];

                chatHistory.forEach(msg => {
                    deepseekMessages.push({
                        role: msg.role === 'ai' ? 'assistant' : 'user',
                        content: msg.text
                    });
                });

                // XUSUSO: DeepSeek MA taageero sawiro (Vision). Qoraalka kaliya u dir!
                const userMessageContent = [];
                if (effectiveUserPrompt) {
                    userMessageContent.push({ type: "text", text: effectiveUserPrompt });
                }
                // Halkan SAWIRO kuma dareyno si uusan u jabin DeepSeek
                if (imageData) {
                    userMessageContent.push({ type: "text", text: "[Sawir ayaa la soo diray balse nidaamkan ma akhriyi karo sawirada, ka raali ahow.]" });
                }

                if (userMessageContent.length > 0) {
                    deepseekMessages.push({ role: "user", content: userMessageContent });
                }

                const completion = await deepseekClient.chat.completions.create({
                    model: "deepseek-chat",
                    messages: deepseekMessages,
                    tools: openAiTools,
                    tool_choice: "auto"
                });

                let responseMessage = completion.choices[0].message;

                if (responseMessage.tool_calls) {
                    deepseekMessages.push(responseMessage);

                    for (const toolCall of responseMessage.tool_calls) {
                        if (toolCall.function.name === 'search_store_products') {
                            const args = JSON.parse(toolCall.function.arguments);
                            const searchResult = await executeProductSearch(storeId, args.query);

                            deepseekMessages.push({
                                role: "tool",
                                tool_call_id: toolCall.id,
                                name: toolCall.function.name,
                                content: JSON.stringify(searchResult),
                            });
                        }
                    }

                    const secondCompletion = await deepseekClient.chat.completions.create({
                        model: "deepseek-chat",
                        messages: deepseekMessages
                    });

                    aiResponseText = secondCompletion.choices[0].message.content;
                } else {
                    aiResponseText = responseMessage.content;
                }

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