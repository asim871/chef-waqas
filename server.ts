import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to lazily initialize or retrieve the Gemini client safely
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim().length === 0) {
    console.warn("[Chef Waqas API] GEMINI_API_KEY is not defined or is placeholder. Using robust direct knowledge fallbacks.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.warn("[Chef Waqas API] Error instantiating GoogleGenAI:", err);
    return null;
  }
}

// Signature recipes from Chef Waqas
const SIGNATURE_RECIPES = [
  {
    id: "rec_1",
    recipeName: "Waqas' Special Smoked Beef Biryani",
    description: "A legendary double-layered Basmati rice dish, cooked with tender smoked beef shank, caramelized onions, fresh mint, and my secret royal spice blend. Finished with a professional amber smoke-dum.",
    prepTime: 30,
    cookTime: 60,
    servings: 6,
    difficulty: "Hard",
    course: "Mains",
    ingredients: [
      "1kg Beef Shank, cut into 1.5-inch cubes",
      "4 cups Aged Basmati Rice, soaked for 30 minutes",
      "3 Large Onions, thinly sliced for caramelization",
      "4 Ripe Tomatoes, finely chopped",
      "1 cup Greek Yogurt, whisked",
      "2 tbsp Mughlai Ginger-Garlic paste",
      "1.5 tbsp Chef Waqas' Signature Garam Masala",
      "1 tsp Premium Kesar (Saffron) strands, dissolved in 1/4 cup warm milk",
      "1 cup Fresh Coriander and Mint leaves, chopped",
      "1 piece of Hardwood Coal, for local smoking step",
      "4 tbsp Premium Cow Ghee"
    ],
    steps: [
      "Soak the Basmati rice in cold water for 30 minutes, then parboil in plenty of heavily salted water infused with whole cardamoms, bay leaves, and cloves until 70% cooked. Drain and let steam dry.",
      "In a heavy-bottomed copper pot, heat Cow Ghee. Fry the sliced onions on medium heat until uniformly golden-amber. Drain and set aside half of these caramelized onions for final decoration.",
      "Add Mughlai ginger-garlic paste and beef shank to the remaining ghee, searing on high heat until deeply browned. Stir in chopped tomatoes, whisked yogurt, and garam masala. Cover tightly and simmer on low-medium until the beef is meltingly tender (approx 45 mins).",
      "Smoking Dum Technique: Place a small heat-safe steel cup on top of the cooked beef gravy. Drop a red-hot ember of charcoal into the bowl. Drizzle a half teaspoon of ghee over the coal to release dense aromatic smoke, and instantly clamp the heavy lid on for 5-7 minutes.",
      "Layering: Uncover and remove the smoking cup. Layer the parboiled rice evenly over the beef gravy. Top with reserved caramelized onions, chopped mint, coriander, and drizzle the royal crimson saffron milk randomly.",
      "Dum Stage: Seal the pot's rim with high-temp kitchen foil, cover with the lid, and let it cook on very low heat over an iron tawa (heat diffuser) for 20 minutes. Gently fluff together and serve steaming hot."
    ],
    chefTricks: [
      "Always parboil rice in water that tastes 'as salty as the sea' so every grain is perfectly seasoned from within.",
      "Using double-layered dum over a flat iron griddle (tawa) ensures the bottom gravy never scorches."
    ]
  },
  {
    id: "rec_2",
    recipeName: "Mughlai Kadai Chicken",
    description: "An imperial classic skillet stir-fry featuring juicy chicken pieces wok-tossed with sweet roasted garlic, crushed coriander seeds, fiery peppercorns, and juicy vine-ripened tomatoes.",
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    difficulty: "Medium",
    course: "Mains",
    ingredients: [
      "800g Chicken, cut into medium bone-in pieces",
      "5 Vine-Ripened Red Tomatoes, halved widthwise",
      "10 cloves Sweet Garlic, thinly sliced",
      "1.5 inches Fresh Ginger, sliced into fine juliennes",
      "4 Fresh Green Chilies, slit lengthwise",
      "2 tbsp Coriander Seeds, coarsely hand-crushed",
      "1 tbsp Whole Black Peppercorns, coarsely hand-crushed",
      "1 tsp Kasuri Methi (Dried Fenugreek), toasted and crushed",
      "3 tbsp Mustard Oil or Unsalted Butter"
    ],
    steps: [
      "Heat Mustard Oil in a heavy iron kadai or skillet until it shimmers. Add chicken pieces and fry on high heat for 5-7 mins until colored crisp and light golden.",
      "Place halved vine-ripened tomatoes skin-side up directly on the chicken. Close the lid and let steam build over medium heat for 8 minutes. Lift the lid and gently peel off all translucent tomato skin using tongs.",
      "Using a wooden spoon, mash the softened tomatoes into a pulpy gravy. Add garlic slices, ginger juliennes, salt, crushed coriander, and black peppercorns.",
      "Bhunno (Stir-fry) vigorously on high heat. Continue stirring until the tomato juices evaporate completely and you see glistening oil separate cleanly at response margins.",
      "Introduce the slit green chilies and sprinkle Kasuri Methi. Toss everything well, cover and simmer on low for a terminal 3 minutes, then garnish with ginger juliennes."
    ],
    chefTricks: [
      "Never utilize tomato paste or purees. Authentic Mughlai Kadai derives its velvety texture purely from direct pulp reduction of whole fresh vine tomatoes.",
      "Mustard oil brings a beautiful pungent depth when smoked before cooking."
    ]
  },
  {
    id: "rec_3",
    recipeName: "Pan-Seared Mustard Seabass",
    description: "Delicate premium seabass fillets marinated in freshly ground stone-mustard, yellow turmeric, and sharp citrus, then seared in hot mustard oil.",
    prepTime: 15,
    cookTime: 10,
    servings: 2,
    difficulty: "Easy",
    course: "Mains",
    ingredients: [
      "2 fresh Seabass Fillets, skin-on",
      "1.5 tbsp Yellow Mustard Paste (made from ground seeds)",
      "1 tsp Turmeric powder",
      "1 tsp Kashmiri Red Chili powder (for bright red hues)",
      "1 tbsp Fresh Lemon juice",
      "2 tbsp Cold-Pressed Mustard Oil",
      "1/2 tsp Pink salt"
    ],
    steps: [
      "Wash the seabass fillets thoroughly in cold water and use a paper towel to pat them skin-dry completely. Score the skin gently in diagonal patterns.",
      "In a small porcelain bowl, whisk yellow mustard paste, turmeric, Kashmiri chili, lemon juice, pink salt, and a teaspoon of liquid mustard oil into a smooth marination glaze.",
      "Gently rub the mustard glaze over both side of the fillets, making sure to work it inside the scored pockets of the fish skin. Allow item to marinate at room temperature for 15 minutes.",
      "Get a heavy cast-iron skillet extremely hot, then pour in 2 tablespoons of mustard oil. Heat until it starts to release light wisps of smoke.",
      "Lay fillets down skin-side first. Press down with a warm metal spatula for 10-15 seconds to prevent curling, letting the skin blister into a crisp mosaic. Cook undisturbed for 4 minutes.",
      "Carefully flip using a wide fish spatula. Coast for an additional 2 minutes until the flesh flakes easily. Serve with charred lemon discs."
    ],
    chefTricks: [
      "Pressing the fish down flat at the precise instant of oil contact prevents skin contraction and ensures a uniform, crisp crust.",
      "Do not move the fish around. It will naturally release from the pan surface once the skin has caramelized correctly."
    ]
  },
  {
    id: "rec_4",
    recipeName: "Royal Saffron Kheer (Rice Pudding)",
    description: "An elegant, rich celebration pudding cooked with fragrant crushed Jasmine rice, aromatic green cardamom, sweet caramelized milk, and premium Kashmiri saffron strands.",
    prepTime: 10,
    cookTime: 50,
    servings: 6,
    difficulty: "Medium",
    course: "Dessert",
    ingredients: [
      "1.5 Liters Organic Whole Milk",
      "1/2 cup Jasmine or Basmati Rice, washed and soaked for 1 hour",
      "1/2 cup Fine Granulated Sugar",
      "12 Saffron strands, warm-milk infused",
      "1/2 tsp Cardamom green pods, outer hulls discarded and seeds crushed",
      "2 tbsp Pistachios and Almonds, slivered",
      "1 tbsp Pure Rose Water extract"
    ],
    steps: [
      "Drain the soaked rice, place on a cutting board, and break down coarsely using a rolling pin or pulse very briefly in a blender. The grains should resemble raw sand, not fine/pounded flour.",
      "In a thick-bottomed steel pan, bring whole milk to an active boil. Turn down to medium-low, drop in the cracked rice, and whisk continuously for 3 minutes to avoid starches clumping at the bottom.",
      "Let the rice pudding bubble along gently, stirring every 3-4 minutes. Scrape down all dense milk solids that gather at the sides of the pan and fold them back into the boiling core.",
      "Cook for 35-40 minutes until the rice granules are thoroughly soft and have fully integrated with the reduced, creamy milk base.",
      "Stir in the infused golden saffron milk, crushed green cardamom seeds, raw sugar, and half of the slivered nuts. Stir on low heat for 10 minutes until sugar has catalyzed and thickened.",
      "Turn off heating, blend in the rose water, and portion into traditional clay pots or individual glass bowls. Chill in the refrigerator for 2 hours to set beautifully before serving."
    ],
    chefTricks: [
      "Never substitute with starch thickeners. Kheer's true indulgence rests on slow gelatinization of rice starches combined with caramelizing whole milk lipids.",
      "Adding sugar at the absolute end prevents it from coating rice grains and stalling their hydration."
    ]
  },
  {
    id: "rec_5",
    recipeName: "Sizzling Tandoori Lamb Chops",
    description: "Double-cut baby lamb chops marinated in warm yogurt spiced with cardamom, raw papaya (for incredible melt-in-mouth texture), finished in skillet tandoor style.",
    prepTime: 60,
    cookTime: 12,
    servings: 3,
    difficulty: "Hard",
    course: "Appetizer",
    ingredients: [
      "6 Double-Cut Premium Lamb Chops, cleaned",
      "1 cup Thick Greek Yogurt, hung dry",
      "1 tbsp Raw Papaya paste (freshly ground with skin)",
      "1 tbsp Kashmiri Chili powder",
      "1 tsp Amchoor (Tangy Dry Mango powder)",
      "1 tbsp Chef Waqas' Ground Ginger & Garlic paste",
      "1 tsp Kala Namak (Indian Black Salt)",
      "1 Fresh Lime, juiced",
      "2 tbsp Clarified Butter (Ghee), melted for basting"
    ],
    steps: [
      "Tenderizing marination: Lightly score the fleshy hubs of the chops. Rub with raw papaya paste and 1/2 tsp salt. Allow to tenderize inside the fridge for 1 hour.",
      "Create high-cling glaze: In a bowl, incorporate dry hung yogurt, ginger-garlic paste, fresh lime juice, Kashmiri chili, amchoor, and black salt to construct a fragrant rub.",
      "Apply yogurt spiced mixture generously to the chops, coating each individual side of the rib bone. Marinate in the refrigerator for at least 4 hours (overnight is golden).",
      "Heat a dry heavy cast-iron grill pan or skillet with 1 tbsp ghee on high heat until sizzling hot. It should replicate intense tandoor temperature.",
      "Lay the chops down with distance between them. Sear for 5 mins until charred grid marks develop, turn over and baste immediately with melted butter. Sear the other side for another 5 mins.",
      "Stand the chops upright on their fat edges for 2 minutes to cook off any white outer fat. Place chops on foil, cover and rest for 5 minutes before slicing and presenting on hot plates."
    ],
    chefTricks: [
      "Raw green papaya contains natural actinidin enzymes that decompose tough meat structural proteins, ensuring unparalleled tenderness in lamb ribs.",
      "Basting with warm butter while searing forms a lovely caramelized outer bark."
    ]
  },
  {
    id: "rec_6",
    recipeName: "Chef's Artisanal Butter Naan",
    description: "A super soft, yeasted flatbread cooked creatively over an inverted iron skillet to replicate tandoor convection baking, brushed with clarified herb butter.",
    prepTime: 80,
    cookTime: 12,
    servings: 6,
    difficulty: "Medium",
    course: "Breads",
    ingredients: [
      "3 cups Premium All-Purpose Flour",
      "1 tsp Active Instant Dry Yeast",
      "1 tbsp Raw Cane Sugar",
      "1 tsp Sea salt",
      "1/4 cup Lukewarm Water",
      "1/2 cup Whisked Greek Yogurt",
      "2 tbsp Milk-clarified Cow Ghee",
      "Warm Whole Milk, for custom kneading state",
      "1 tsp Nigella seeds (Kalonji), for topping",
      "1/2 cup Melted Salted Butter, for terminal brushing",
      "1/4 cup Chopped fresh Coriander leaves"
    ],
    steps: [
      "Yeast activation: Stir raw cane sugar and dry yeast into lukewarm water. Let stand for 8 minutes until a bubbly, thick yeast cream forms.",
      "Dough creation: In a large bowl, whisk sifted flour and sea salt. Rub in 2 tablespoons of Ghee, add the active yeast foam and whisked yogurt. Stir together while slowly adding milk until a soft, uniform dough comes together.",
      "Kneading: Place on a kitchen counter and knead for 8-10 mins until elastic, supple, and non-sticky. Place in oiled bowl, cover with damp napkin, and proof in a dark cupboard for 1.5 hours.",
      "Portioning: Gently deflate dough. Slice into 6 equal segments. Wrap into round balls and let them rise for a final 15 minutes before rolling.",
      "Baking style: Roll each portion into an oval tear-drop sheet. Wet the backside of the naan thoroughly with a wet paintbrush or wet fingers. This acts as raw glue.",
      "Skillet convection: Slap the wet side directly down onto an extremely hot, smoking iron skillet. As huge bubbles rise, tip the entire skillet upside down directly over open gas fire, 2 inches above flames to roast the naan face. Brush instantly with butter and kalonji, sprinkle with cilantro."
    ],
    chefTricks: [
      "Using non-stick skillets for this fails, as the wet naan will merely fall off the pan head-first onto the burner during inversion.",
      "Wetting the back of the naan is key to securing it to the iron. The intense steam created causes structural air bubbles to bloom."
    ]
  }
];

// Endpoint: Fetch signature recipes
app.get("/api/recipes/signature", (req, res) => {
  res.json({ success: true, recipes: SIGNATURE_RECIPES });
});

// Exquisite fallback recipe generator to guarantee flawless execution under severe API load
function generateProceduralFallbackRecipe(ingredients: string[], dietType?: string, cookingTime?: string, difficulty?: string, customPrompt?: string) {
  const targetDifficulty = difficulty || "Medium";
  const mainIngredient = ingredients[0] || "Basmati Rice";
  const capitalIngredient = mainIngredient.charAt(0).toUpperCase() + mainIngredient.slice(1);

  const recipeName = `Chef Waqas' Hand-Crafted Shahi ${capitalIngredient}`;
  const description = `This is my personal handcrafted selection celebrating aromatic ${capitalIngredient}. In my traditional kitchen, we cook this with immense patience over a steady clay flame (tandoor style), resulting in a perfect blend of sweet caramelized elements and subtle herbal nuances. A true masterpiece for any dining table!`;
  
  // Clean ingredients list
  const finalIngredientsList = [
    `500g Choice ${capitalIngredient} (properly cleaned and primed)`,
    "3 tbsp Premium Cow Ghee or Cold-Pressed Mustard Oil",
    "2 Large Purple Onions, sliced razor-thin for sweet frying",
    "4 Cloves of Sweet Garlic & 1-inch Ginger, crushed with sea salt",
    "1.5 cups Home-brewed Aromatic Broth or Warm Water",
    "1.5 tbsp Chef Waqas' Signature Garam Masala Blend",
    "2 Fresh Green Chilies, slit lengthwise for bright, elegant heat",
    "Fresh coriander sprigs and julienned ginger, for the final touch-up"
  ];
  
  // Add some other specific user ingredients
  if (ingredients.length > 1) {
    for (let i = 1; i < Math.min(ingredients.length, 5); i++) {
      finalIngredientsList.push(`1 cup of premium ${ingredients[i]} (gently parboiled or tossed in ghee beforehand)`);
    }
  }

  const steps = [
    `In a heavy copper handi or cast-iron skillet, heat the Premium Cow Ghee (or Mustard Oil) until it begins to shimmer.`,
    `Toss in the thinly sliced purple onions. Sauté on medium-low heat with a steady, loving hand until they caramelize into a beautiful amber-gold color.`,
    `Incorporate the crushed ginger-garlic paste and slit green chilies. Fry for exactly 2 minutes until the sharp raw aromas turn sweet and nutty.`,
    `Gently introduce your prepared ${capitalIngredient} ${ingredients.length > 1 ? `along with the clean slices of ${ingredients.slice(1).slice(0, 3).join(', ')}` : ''}. Sauté (Bhunno) on high fire for 5 minutes until everything is glazed in the fragrant fat.`,
    `Pour in the parboiled warm broth. Bring to a rapid rolling boil, then instantly clamp a tight lid or heavy tin foil over the rim. Reduce heat to low.`,
    `Allow the mixture to cook undisturbed for 18 minutes (the Dum stage), letting the internal steam fully blossom the starches and proteins.`,
    `Lift the lid, sprinkle my Signature Garam Masala across the top, let steam settle for another 2 minutes, then fluff gently with a wide wooden spoon. Garnish with cilantro and ginger ribbons.`
  ];

  const chefTricks = [
    `Always layer the aromatic spice blend near the end of the steaming cycle. The hot steam absorbs the cardamon and mace oils, distributing them evenly without cooking off the fragrance.`,
    `If you have access to a small coal, light it on the burner until red hot, place it in a foil cup over the gravy, drizzle a drop of ghee, and seal the lid for 5 minutes for a spectacular smoked wood finish.`
  ];

  return {
    recipeName,
    description,
    prepTime: 12,
    cookTime: Number(cookingTime) || 25,
    servings: 4,
    difficulty: targetDifficulty,
    course: "Mains" as const,
    ingredients: finalIngredientsList,
    steps,
    chefTricks
  };
}

// Endpoint: AI Recipe Generator with Multi-Model Fallbacks and Procedural Backups
app.post("/api/ai/generate", async (req, res) => {
  const { ingredients, dietType, cookingTime, difficulty, customPrompt } = req.body;

  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ success: false, error: "Please enter at least one ingredient" });
  }

  const ingredientsString = ingredients.join(", ");
  
  const instructions = `
You are Chef Waqas, an expert master chef famous for high-end authentic South Asian, Mughlai, and creative modern fusion cuisine. You are warm, enthusiastic, and passionate, sharing valuable culinary wisdom.
Generate a cohesive, realistic, and delicious recipe utilizing the ingredients provided: ${ingredientsString}.
${dietType ? `The recipe MUST be suitable for a ${dietType} diet.` : ''}
${cookingTime ? `Ideally, keep the total cooking and prep time around ${cookingTime} minutes.` : ''}
${difficulty ? `Match the target cooking level: ${difficulty}.` : ''}
${customPrompt ? `The user also asks for: ${customPrompt}` : ''}

You MUST return a perfectly formatted JSON response containing exactly matching fields described in the following schema:
- recipeName: A creative, luxurious recipe name crafted in the distinct voice of Chef Waqas (e.g. "Chef Waqas' Aromatic Garlic Fennel Lamb").
- description: A warm, inviting introduction (2 to 3 sentences) in the voice of Chef Waqas, explaining why this combination is delicious, full of character.
- prepTime: Integer value in minutes.
- cookTime: Integer value in minutes.
- servings: Integer value representing portions (e.g. 2, 4, 6).
- difficulty: String representing difficulty level ("Easy", "Medium", or "Hard").
- course: String represent cooking course ("Mains", "Dessert", "Breads", "Appetizer").
- ingredients: An array of strings, listing precise measurements and ingredients required. Be realistic based on what was provided, adding reasonable kitchen staples (oils, water, simple spices).
- steps: An array of clear, professionally-worded step-by-step instructions.
- chefTricks: An array of 2 unique professional culinary tips/tricks in the voice of Chef Waqas, detailing how to level up the flavor, cook correctly, or substitute components.

Do NOT include any surrounding codeblock markdown or ticks (like \`\`\`json or \`\`\`). Return raw valid JSON.
`;

  // Array of models to try in sequence to manage 503 demand spikes dynamically
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  const ai = getAIClient();

  if (ai) {
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Chef Waqas API] Attempting recipe generation using model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: instructions,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recipeName: { type: Type.STRING, description: "A creative name in the style of Chef Waqas." },
                description: { type: Type.STRING, description: "A warm introduction in Chef Waqas' first-person narrative." },
                prepTime: { type: Type.INTEGER, description: "Preparation time in minutes." },
                cookTime: { type: Type.INTEGER, description: "Active cooking time in minutes." },
                servings: { type: Type.INTEGER, description: "Servings count." },
                difficulty: { type: Type.STRING, description: "Difficulty level - Easy, Medium, or Hard." },
                course: { type: Type.STRING, description: "Mains, Dessert, Breads, or Appetizer." },
                ingredients: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Precise list of formatted ingredient lines."
                },
                steps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Chronological, detailed cooking instructions."
                },
                chefTricks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Special culinary secrets or tips from Chef Waqas' kitchen book."
                }
              },
              required: ["recipeName", "description", "prepTime", "cookTime", "servings", "difficulty", "course", "ingredients", "steps", "chefTricks"],
            }
          }
        });

        const responseText = response.text ? response.text.trim() : "";
        if (responseText) {
          let data;
          // Fallback parser in case AI yields markdown blocks
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            data = JSON.parse(responseText.slice(jsonStart, jsonEnd + 1));
          } else {
            data = JSON.parse(responseText);
          }
          
          console.log(`[Chef Waqas API] Generation succeeded cleanly with model ${modelName}`);
          return res.json({ success: true, recipe: data, fallbackUsed: false });
        }
      } catch (err: any) {
        console.warn(`[Chef Waqas API] Model ${modelName} failed. Error code: ${err.status || err.code || "unknown"}. Proceeding to fallback options.`, err.message || err);
      }
    }
  } else {
    console.log("[Chef Waqas API] Skipping generative AI models (no client available). Directing immediately to handcrafted generator.");
  }

  // Absolute flawless fallback: If both AI models fail or are unavailable, generate an exquisite recipe directly!
  try {
    console.log("[Chef Waqas API] Active models experienced demand limits. Serving handcrafted signature procedural recipe.");
    const fallbackRecipe = generateProceduralFallbackRecipe(ingredients, dietType, cookingTime, difficulty, customPrompt);
    return res.json({ 
      success: true, 
      recipe: fallbackRecipe, 
      fallbackUsed: true,
      message: "The AI stoves are super hot right now, so I've hand-picked this signature recipe from my personal secret vault!"
    });
  } catch (fallbackError: any) {
    console.error("[Chef Waqas API] Complete failure in fallback generator:", fallbackError);
    return res.status(500).json({ success: false, error: "My apologies, friend! The kitchen stoves are temporarily resting. Try again in a minute!" });
  }
});

// Endpoint: AI culinary companion chat with Chef Waqas
app.post("/api/ai/chat", async (req, res) => {
  const { messages } = req.body; // Array of { role: 'user' | 'model', content: string }
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, error: "Messages array is required" });
  }

  const chefSystemInstruction = `
You are Chef Waqas, an warm-hearted, passionate culinary master with decades of experience in traditional Pakistani, Mughlai, and modern East-West fusion cooking. 
Address the user as a fellow culinary enthusiast or "home chef". Keep answers wise, enthusiastic, and loaded with helpful insights or substitutions.
Avoid speaking like a generic chatbot—always embody a real chef. Speak in first person ("I suggest...", "In my kitchen, we always...").
Use clear markdown but keep your total response brief, friendly, and practical (usually under 150 words). Reference aromatic spices (cumin, cardamom, nutmeg, garam masala) or cooking methods (Bhunno/searing, Dum/slow steaming) where natural.
Always encourage cooking with love and precision!
`;

  const chatContext = messages.map(m => {
    return `${m.role === 'user' ? 'User' : 'Chef Waqas'}: ${m.content}`;
  }).join("\n");

  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  const ai = getAIClient();

  if (ai) {
    for (const modelName of modelsToTry) {
      try {
        console.log(`[Chef Waqas Chat] Attempting chat with model: ${modelName}`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `${chatContext}\nChef Waqas' Response:`,
          config: {
            systemInstruction: chefSystemInstruction,
            temperature: 0.8,
            topP: 0.95
          }
        });

        const answer = response.text ? response.text.trim() : "";
        if (answer) {
          console.log(`[Chef Waqas Chat] Chat answered successfully via model: ${modelName}`);
          return res.json({ success: true, response: answer, fallbackUsed: false });
        }
      } catch (err: any) {
        console.warn(`[Chef Waqas Chat] Chat model ${modelName} failed. Proceeding...`, err.message || err);
      }
    }
  } else {
    console.log("[Chef Waqas Chat] Skipping AI backend chat (no client available). Invoking local direct helper.");
  }

  // Exquisite direct linguistic fallback when AI chatbot is inaccessible
  try {
    console.log("[Chef Waqas Chat] AI unavailable, invoking handcrafted culinary knowledge system.");
    const lastUserQuery = messages.length > 0 ? messages[messages.length - 1].content.toLowerCase() : "";
    let answer = "My wonderful home chef friend! My kitchen stoves are currently buzzing with sizzling lamb and bubbling curries. To answer your query, tell me: what delightful spices do we have in our cabinets today?";

    if (lastUserQuery.includes("rice") || lastUserQuery.includes("biryani") || lastUserQuery.includes("pulao")) {
      answer = "Ah! Rice is the absolute crown jewel of Mughlai banquets. My supreme trick is to parboil the basmati rice in water that is as 'salty as the sea' with cinnamon and whole cardamoms. Cook it until strictly 70% soft, then seal the pot with foil (the Dum stage) for 20 minutes on the lowest possible heat. It rises beautifully!";
    } else if (lastUserQuery.includes("naan") || lastUserQuery.includes("roti") || lastUserQuery.includes("bread") || lastUserQuery.includes("flour")) {
      answer = "To bake the most elastic and fluffy Butter Naan without a clay tandoor, you must trust my inversion technique! Roll the dough, paint the backside thoroughly with water, and slap it on a blazing iron skillet. Once big bubbles swell on top, turn the pan completely upside down right over the raw flame to roast the face. Brush instantly with melted butter!";
    } else if (lastUserQuery.includes("spice") || lastUserQuery.includes("masala") || lastUserQuery.includes("garam") || lastUserQuery.includes("chili")) {
      answer = "In my kitchen, spice is a layered story, not just heat! We start by frying onions slow until dark golden-amber. Searing is what blooms the coriander and cumin oils. Then, always introduce my special Garam Masala in the final two minutes of steaming so all the mace, nutmeg, and green cardamom keep their royal perfume intact.";
    } else if (lastUserQuery.includes("oil") || lastUserQuery.includes("ghee") || lastUserQuery.includes("butter")) {
      answer = "Pure Cow Ghee is the lifeblood of high-end South Asian cooking. It brings a sweet nuttiness that regular oils cannot stand up to. However, if you are searing delicate fish or lamb chops, cold-pressed Mustard Oil is incredibly delicious once you heat it to high smoking temperature to release its signature pungency.";
    } else if (lastUserQuery.includes("chicken") || lastUserQuery.includes("meat") || lastUserQuery.includes("lamb") || lastUserQuery.includes("beef") || lastUserQuery.includes("fish")) {
      answer = "When handling meat, tenderization is key! For lamb chops, I always grate fresh green papaya with skin and rub it over the meat for an hour inside the ice box—its natural enzymes break down tough fibers so they melt like winter snow during searing. For chicken, sear (Bhunno) on high heat early to lock in structural moisture!";
    } else if (lastUserQuery.includes("hello") || lastUserQuery.includes("hi ") || lastUserQuery.includes("hey") || lastUserQuery.includes("who is") || lastUserQuery.includes("chef waqas")) {
      answer = "Salaam Alaikum and a very warm welcome to my kitchen! I am Chef Waqas, your dedicated culinary master. Bring me your raw ingredients, dietary needs, or burning questions, and together we shall cook up an absolute feast fit for royalty!";
    }

    return res.json({ 
      success: true, 
      response: answer, 
      fallbackUsed: true,
      message: "Chef Waqas' Quick Kitchen Handbook answers you directly!"
    });
  } catch (fallbackError: any) {
    console.error("[Chef Waqas Chat] Failed in chat local responder:", fallbackError);
    return res.status(500).json({ success: false, error: "Chef Waqas has run to fetch fresh saffron from the pantry! Please write again soon." });
  }
});

// Vite server setup & static assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Chef Waqas backend running secure on port ${PORT}`);
  });
}

startServer();
