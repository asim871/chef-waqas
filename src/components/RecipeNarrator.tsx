import React, { useState, useEffect, useRef } from "react";
import { 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Square, 
  AlertCircle 
} from "lucide-react";
import { Recipe } from "../types";

interface RecipeNarratorProps {
  recipe: Recipe;
  onHighlightUpdate: (section: "info" | "ingredients" | "steps" | "tricks" | null, index: number | null) => void;
}

interface SpeechItem {
  id: string;
  section: "info" | "ingredients" | "steps" | "tricks";
  index: number;
  label: string;
  text: string;
}

// HANDCRAFTED PRE-TRANSLATED REPERTOIRE FOR ROYAL SIGNATURE RECIPES
// Ensures 100% flawless semantic quality and pronunciation
const SIGNATURE_TRANSLATIONS: Record<string, {
  recipeNameUrdu: string;
  recipeNameRoman: string;
  descriptionUrdu: string;
  descriptionRoman: string;
  ingredientsUrdu: string[];
  ingredientsRoman: string[];
  stepsUrdu: string[];
  stepsRoman: string[];
  chefTricksUrdu: string[];
  chefTricksRoman: string[];
}> = {
  "rec_1": {
    recipeNameUrdu: "وقاص کی اِسپیشل کوئلے کے دم والی بیف بریانی",
    recipeNameRoman: "Waqas' Special Smoked Beef Biryani",
    descriptionUrdu: "یہ میری مشہور ڈبل لیئرڈ باسمتی چاول کی بیف بریانی ہے، جو نہایت نرم بیف اور میرے خفیہ شاہی مسالے سے بنی ہے۔ اس کا کوئلے والا دم لاجواب ہے۔",
    descriptionRoman: "Yeh meri mashhoor double-layered Basmati chawal ki biryani hai, jo nihayat narm smoked beef aur mere khufia royal masalay se bani hai. Is ka amber dum lajwab hai.",
    ingredientsUrdu: [
      "ایک کلو بیف ہڈی کے بغیر یا ساتھ، ڈیڑھ انچ کے ٹکڑے",
      "چار کپ پرانے باسمتی چاول، تیس منٹ بھگوئے ہوئے",
      "تین عدد بڑی پیاز، باریک کٹی ہوئی",
      "چار لال ٹماٹر، باریک کٹے ہوئے",
      "ایک کپ دہی، اچھی طرح پھینٹا ہوا",
      "دو کھانے کے چمچ شاہی ادرک لہسن پیسٹ",
      "ڈیڑھ کھانے کا چمچ شیف وقاص کا خاص گرم مسالہ",
      "ایک چائے کا چمچ زعفران کے ریشے، چوتھائی کپ نیم گرم دودھ میں ملے ہوئے",
      "ایک کپ ہرا دھنیا اور پودینے کے پتے، کٹے ہوئے",
      "ایک ٹکڑا کوئلہ، دم کے مرحلے کے لیے",
      "چار کھانے کے چمچ دیسی گھی"
    ],
    ingredientsRoman: [
      "1kg Beef shank, deyrh inch ke cubes",
      "4 cups Purane Basmati chawal, tees minute bheegay hue",
      "3 baray Pyaaz, barik katay hue",
      "4 lall Tamatar, barik katay hue",
      "1 cup Dahi, pheta hua",
      "2 bade chammach Mughlai ginger-garlic paste",
      "1.5 bade chammach Chef Waqas' signature garam masala",
      "1 chota chammach Zafran, adha cup garam doodh mein ghula hua",
      "1 cup Hara Dhaniya aur Podina, kata hua",
      "Ek koyla ka tukra, smoke dene ke liye",
      "4 bade chammach Premium Cow Ghee"
    ],
    stepsUrdu: [
      "چاول پانی میں بھگو کر رکھیں، پھر کھڑے مسالوں کے ساتھ پانی میں ستر فیصد نرم ہونے تک ابالیں اور چھان لیں۔",
      "ایک چوڑے پتیلے میں دیسی گھی گرم کریں۔ پیاز کو سنہری ہونے تک فرائی کریں اور آدھی پیاز آخر کے لیے سائیڈ پر رکھ دیں۔",
      "اسی گھی میں ادرک لہسن پیسٹ اور بیف شامل کر کے اچھی طرح بھونیں۔ ٹماٹر، دہی اور مسالہ ڈال کر بیف کے گلنے تک پکائیں۔",
      "پکے ہوئے بیف کے اوپر ایک چھوٹی اسٹیل کی کٹوری رکھیں، اس میں جلتا ہوا کوئلہ رکھ کر تھوڑا گھی ڈالیں اور ڈھکن پانچ منٹ کے لیے بند کر دیں۔",
      "کوئلے والی کٹوری نکال لیں۔ بیف کے اوپر ابلے چاول، بچی پیاز، پودینا، دھنیا اور زعفران والا دودھ ڈال دیں۔",
      "پتیلے کے کناروں پر فائل لگا کر ڈھکن کو بند کریں اور توے پر بیس منٹ کے لیے ہلکی آنچ پر دم دے دیں۔"
    ],
    stepsRoman: [
      "Chawal pani mein bhigo kar rakhien, phir garam khuray masalon ke sath pani mein satter percent soft hone tak ubalen aur nikal lein.",
      "Ek bare pateela mein cow ghee garam karein. Pyaaz ko sunehri hone tak fry karein aur adhi pyaaz aakhir ke liye bacha lein.",
      "Isi ghee mein adrak-lehsan paste aur beef shamil kar ke bhunein. Tamatar, dahi aur biryani masala daal kar beef ke narm hone tak pakaen.",
      "Pake hue beef ke upar ek choti steel ki katori rakhein, is mein jalta hua koyla rakh kar thora ghee daalein aur dhakan band kar ke panch minute dum dein.",
      "Koley wali katori nikaal lein. Beef ke upar parboiled chawal, bachi hui pyaaz, podina, dhaniya aur zafran ka doodh daal dein.",
      "Pateelay ke rim par foil laga kar dhakan ko band karein aur taway par behtareen dum ke liye bees minute halki aanch par rakh dein."
    ],
    chefTricksUrdu: [
      "چاول ابالتے وقت پانی میں نمک اچھی طرح ڈالیں تاکہ ہر دانہ اندر سے نمکین اور بہترین ہو جائے۔",
      "گرم توے پر پتیلا رکھ کر دم دینے سے نیچے گریوی کبھی جلتی نہیں ہے۔"
    ],
    chefTricksRoman: [
      "Chawal ubaltay waqt pani mein namak achi tarah dalen taake chawal ka har daana andar se namkeen aur behtareen ho.",
      "Garam taway par pateela rakh kar dum dainay se nichla masala kabhi jalta nahi hai."
    ]
  },
  "rec_2": {
    recipeNameUrdu: "مغلئی کڑاہی چکن",
    recipeNameRoman: "Mughlai Kadai Chicken",
    descriptionUrdu: "ایک شاہی کڑاہی جو ہائی ہیٹ پر لوہے کی کڑاہی میں بھونی جاتی ہے، جس میں کٹے ہوئے لال ٹماٹروں، کٹی ہوئی کالی مرچ اور ہلکے مسالوں کا تڑکا ہوتا ہے۔",
    descriptionRoman: "Ek mazaidar Mughlai style karahi jo lohay ki karahi mein banayi jati hai. Is mein raseelay chicken ke sath pisa hua saabut dhaniya aur kali mirch shamil hoti hai.",
    ingredientsUrdu: [
      "آٹھ سو گرام چکن، درمیانے ٹکڑے",
      "پانچ عدد سرخ ٹماٹر، درمیان سے کٹے ہوئے",
      "دس جوے لہسن، باریک کٹے ہوئے",
      "ڈیڑھ انچ ادرک، لمبائی میں کٹی ہوئی",
      "چار عدد ہری مرچیں، درمیان سے کٹی ہوئی",
      "دو کھانے کے چمچ خشک دھنیا، ہلکا سا کٹا ہوا",
      "ایک کھانے کا چمچ ثابت کالی مرچ، کٹی ہوئی",
      "ایک چائے کا چمچ قصوری میتھی، بھنی ہوئی",
      "تین کھانے کے چمچ سرسوں کا تیل یا مکھن"
    ],
    ingredientsRoman: [
      "800g Chicken, bone-in pieces",
      "5 Tamatar, darmayan se kate hue",
      "10 clovers Lehsan, barik katay hue",
      "1.5 inch Adrak, behtareen julian cut",
      "4 Harri mirch, slit cut",
      "2 bade chammach Sabut Dhaniya, thora kuta hua",
      "1 bada chammach Kali Mirch, kuta hua",
      "1 chota chammach Kasuri Methi, thori toasted",
      "3 bade chammach Sarso ka tel ya Makkhan"
    ],
    stepsUrdu: [
      "لوہے کی کڑاہی میں سرسوں کا تیل گرم کریں۔ چکن شامل کر کے تیز آنچ پر سنہری ہونے تک فرائی کریں۔",
      "چکن کے اوپر کٹے ہوئے ٹماٹر الٹے کر کے رکھیں۔ ڈھکن بند کر کے بھاپ میں ٹماٹر کے چھلکے نرم کریں اور چھلکے اتار لیں۔",
      "اب ٹماٹر کو چمچ کے ساتھ اچھی طرح میش کر کے گریوی بنائیں۔ اس میں باریک کٹا ہوا لہسن، ادرک، نمک اور کٹا دھنیا اور کالی مرچ ملائیں۔",
      "تیز آنچ پر اچھی طرح 'بھونیں '۔ یہاں تک کہ ٹماٹر کا پانی خشک ہو جائے اور گھی الگ ہو کر کناروں پر نظر آنے لگے۔",
      "آخر میں ہری مرچیں اور قصوری میتھی شامل کریں۔ ہلکی آنچ پر تین منٹ دم دے کر ادرک کے ٹکڑوں سے سجائیں۔"
    ],
    stepsRoman: [
      "Lohay ki karahi mein sarso ka tel garam karein. Chicken shamil kar ke high heat par sunehri hone tak fry karein.",
      "Chicken ke upar kate hue tamatar ulte kar ke rakhein. Dhakan band kar ke steam mein tamatar ke chilkay naram karein aur chilka nikal lein.",
      "Ab tamatar ko chamach ke sath mash kar ke gravy banaen. Is mein sliced garlic, ginger, namak, aur pisa dhaniya kali mirch milaen.",
      "High heat par tezi se 'Bhunno' ya fry karein, yahan tak ke tamatar ka pani khushq ho jaye aur ghee alag nazar aane lage.",
      "Introduce the slit green chilies aur Kasuri Methi shamil karein. Toss karein aur simmer karein low heat par 3 minutes."
    ],
    chefTricksUrdu: [
      "کبھی بھی ٹماٹر کا پیسٹ استعمال نہ کریں۔ کڑاہی کا اصل ذائقہ ٹماٹر کے گودے کی بھنائی سے آتا ہے۔",
      "سرسوں کا تیل استعمال کرنے سے پہلے اسے دھواں نکلنے تک گرم کریں تاکہ اس کا تیکھا پن ختم ہو جائے۔"
    ],
    chefTricksRoman: [
      "Kabhi bhi tamatar ka paste ya puree na shamil karein. Saf kado-kash aur taaza tamatar hi asli laziz karahi ki jaan hain.",
      "Sarso ka tel use karne se pehle use fully smoke karein taake us ki tundi khatam hojaye."
    ]
  },
  "rec_3": {
    recipeNameUrdu: "فرائینگ پین پر تلی ہوئی سرسوں کی سی باس مچھلی",
    recipeNameRoman: "Pan-Seared Mustard Seabass",
    descriptionUrdu: "سرسوں کی چٹنی، ہلدی اور لیموں کے رس میں میرینیٹ کی ہوئی سی باس مچھلی، جسے سرسوں کے پگھلے ہوئے گھی میں ہلکا سا تلا گیا ہے۔",
    descriptionRoman: "Seabass fish ke pieces jinhay humne rai, haldi, lembu ke ras aur behtareen sarso ke tel mein marinate kar ke lohay ke pan par seka hai.",
    ingredientsUrdu: [
      "دو عدد مچھلی کے فلیٹس، جلد کے ساتھ",
      "ڈیڑھ کھانے کا چمچ پسی ہوئی رائی یا سرسوں",
      "ایک چائے کا چمچ ہلدی پاؤڈر",
      "ایک چائے کا چمچ کشمیری لال مرچ پاؤڈر",
      "ایک کھانے کا چمچ تازہ لیموں کا رس",
      "دو کھانے کے چمچ سرسوں کا خالص تیل",
      "آدھا چائے کا چمچ گلابی نمک"
    ],
    ingredientsRoman: [
      "2 Seabass fish fillets, skin-on",
      "1.5 bade chammach Rai/Mustard paste",
      "1 chota chammach Haldi powder",
      "1 chota chammach Kashmiri Lal Mirch",
      "1 bada chammach Lembu ka ras",
      "2 bade chammach Sarso ka tel",
      "Adha chota chammach Namak"
    ],
    stepsUrdu: [
      "مچھلی کے پیسز کو ٹھنڈے پانی سے دھو کر پیپر ٹاول سے پوری طرح خشک کر لیں، اور مچھلی پر ترچھے کٹس لگائیں۔",
      "ایک پیالے میں سرسوں کی پیسٹ, ہلدی، کشمیری مرچ، لیموں کا رس، نمک اور تھوڑا سرسوں کا تیل ملا کر مصالحہ تیار کریں۔",
      "یہ مصالحہ مچھلی پر اچھی طرح لگائیں اور کٹس کے اندر تک بھر دیں، پھر پندرہ منٹ میرینیٹ ہونے دیں۔",
      "پین کو اچھی طرح گرم کر کے اس میں سرسوں کا تیل ڈالیں اور دھواں نکلنے تک گرم کریں۔",
      "مچھلی کو اسکن والی سائیڈ نیچے کر کے رکھیں، چمچ سے تھوڑا دبائیں تاکہ اسکن کڑک بنے۔ چار منٹ پکائیں۔",
      "اس کے بعد مچھلی کو پلٹ دیں اور دوسری طرف سے دو منٹ پکائیں تاکہ مچھلی اندر سے نرم ہو جائے۔ لیموں کے ساتھ تیار ہے۔"
    ],
    stepsRoman: [
      "Fish pieces ko thanday pani se dho kar paper towel se poori tarah khushq kar lein, aur chilkay par halkay cut lagaen.",
      "In a small porcelain bowl, whisk yellow mustard paste, turmeric, Kashmiri chili, lemon juice, pink salt, aur thora sarso ka tel mila kar taiyar karein.",
      "Gently rub the mustard glaze over both side of the fillets, making sure to work it inside the scored pockets of the fish skin. Allow item to marinate at room temperature for 15 minutes.",
      "Get a heavy cast-iron skillet extremely hot, then pour in 2 tablespoons of mustard oil. Heat until it starts to release light wisps of smoke.",
      "Lay fillets down skin-side first. Press down with a warm metal spatula for 10-15 seconds to prevent curling. Cook undisturbed for 4 minutes.",
      "Carefully flip using a wide fish spatula. Coast for an additional 2 minutes until the flesh flakes easily. Serve with charred lemon discs."
    ],
    chefTricksUrdu: [
      "پہلی دفعہ پین پر رکھتے ہی مچھلی کو تھوڑا دبائیں تاکہ اسکن کُرکُری بنے اور مچھلی مڑے نہیں۔",
      "مچھلی کو بار بار مت ہلائیں، جب مچھلی کی جلد اچھی طرح پک جائے گی تو وہ خود ہی پین چھوڑ دے گی۔"
    ],
    chefTricksRoman: [
      "Pehli dafa pan par rakhte hi fish upar se thora dabayein taake skin sikar kar gol na ho jaye.",
      "Fish ko baar baar mat hilaen, jab skin achi tarah pak jayegi to wo khud hi pan chordh degi."
    ]
  },
  "rec_4": {
    recipeNameUrdu: "شاہی زعفرانی کھیر",
    recipeNameRoman: "Royal Saffron Kheer (Rice Pudding)",
    descriptionUrdu: "ایک شاہانہ زرد کھیر جو خوشبودار چاول، ہری الائچی، خشک میہ جات اور کشمیری زعفران کے ساتھ پکے ہوئے خوش ذائقہ دودھ سے تیار کی جاتی ہے۔",
    descriptionRoman: "Ek shahana mithee dish jo khushboodar chawal, hari elaichi, khushk mewajaat aur Kashmiri zafran ke sath doodh ko paka kar banayi jati hai.",
    ingredientsUrdu: [
      "ڈیڑھ لیٹر بھینس کا خالص یا بازاری دودھ",
      "آدھا کپ باسمتی چاول، ایک گھنٹہ بھیگے ہوئے",
      "آدھا کپ چینی یا گڑ",
      "بارہ عدد زعفران کے خشک ریشے، گرم دودھ میں ملے ہوئے",
      "آدھا چائے کا چمچ سبز الائچی طوقے، باریک پسے ہوئے",
      "دو کھانے کے چمچ بادام پستے کے باریک ٹکڑے",
      "ایک کھانے کا چمچ عرقِ گلاب"
    ],
    ingredientsRoman: [
      "1.5 Litre Doodh (Milk)",
      "Adha cup Basmati Rice, 1 ghantay bhigae hue",
      "Adha cup Cheeni (Sugar)",
      "12 Saffron strands, garam dooh mein hal shuda",
      "Adha chota chammach Elaichi green powder",
      "2 bade chammach Pista aur Badam kate hue",
      "1 bada chammach Arq-e-Gulab (Rose water)"
    ],
    stepsUrdu: [
      "چاول کا پانی نکال کر بیلن یا بلینڈر میں ہلکا سا پیس لیں۔ دانے سوجی کی طرح ہونے چاہئیں، آٹا نہیں بنانا۔",
      "ایک بھاری پتیلے میں دودھ ابالیں۔ پھر پسے ہوئے چاول شامل کر کے مسلسل تین منٹ چمچ چلائیں تاکہ کوئی گٹھلی نہ بنے۔",
      "کھیر کو ہلکی آنچ پر پکنے دیں، ہر تین چار منٹ میں چمچ ہلائیں اور پتیلے کے کناروں پر جمی ملائی کو کھرچ کر دودھ میں شامل کرتے جائیں۔",
      "پینتیس سے چالیس منٹ تک پکائیں جب تک چاول بالکل نرم ہو جائیں اور کھیر گاڑھی ہو جائے۔",
      "اب زعفران والا دودھ، پسی الائچی، چینی اور آدھے بادام پستے ملائیں۔ ہلکی آنچ پر دس منٹ پکائیں۔",
      "چولہا بند کر کے عرقِ گلاب شامل کریں، کھیر کو مٹی کے پیالوں میں ڈالیں اور فریج میں رکھ کر ٹھنڈا کر کے پیش کریں۔"
    ],
    stepsRoman: [
      "Chawal ka paani nikaal kar belan ya blender mein coarsely pees lein. Dane raw sand ki tarah hone chahiyen, aata nahi banana.",
      "In a thick-bottomed steel pan, bring whole milk to an active boil. Turn down to medium-low, drop in the cracked rice, and whisk continuously for 3 minutes to avoid starches clumping at the bottom.",
      "Let the rice pudding bubble along gently, stirring every 3-4 minutes. Scrape down all dense milk solids that gather at the sides of the pan and fold them back into the boiling core.",
      "Cook for 35-40 minutes until the rice granules are thoroughly soft and have fully integrated with the reduced, creamy milk base.",
      "Stir in the infused golden saffron milk, crushed green cardamom seeds, raw sugar, and half of the slivered nuts. Stir on low heat for 10 minutes until sugar has catalyzed and thickened.",
      "Turn off heating, blend in the rose water, and portion into traditional clay pots or individual glass bowls. Chill in the refrigerator for 2 hours to set beautifully before serving."
    ],
    chefTricksUrdu: [
      "کربھی بھی کسٹارڈ یا کارن فلور مت ڈالیں۔ کھیر کا اصل زائقہ دودھ اور چاول کو دھیمی آنچ پر پکانے سے بنتا ہے۔",
      "چینی کو بالکل آخر میں ڈالنے سے چاول آسانی سے گلتے ہیں اور کھیر نیچے نہیں لگتی۔"
    ],
    chefTricksRoman: [
      "Asli khier mein kabhi starch ya custard mat dalein. Khier ki asli lazzat chawal ke starches se hi banti hai.",
      "Cheeni ko aakhir mein dalne se chawal aasani se galte hain aur kheer niche lagti nahi."
    ]
  },
  "rec_5": {
    recipeNameUrdu: "گرما گرم تندوری لیمب چانپیں",
    recipeNameRoman: "Sizzling Tandoori Lamb Chops",
    descriptionUrdu: "نہایت لذیذ لیمب چانپیں جو گاڑھے دہی، گرم مسالے اور کچے پپیتے کے ساتھ میرینیٹ کر کے توے پر تندوری اسٹائل میں تیار کی جاتی ہے۔",
    descriptionRoman: "Zabardast baby lamb chops jo dahi, garam masalay, adrak-lehsan aur kachay papitay ke sath marinate kar ke lohay ke pan par seki jati hain.",
    ingredientsUrdu: [
      "چھ عدد لیمب یا بکرے کی چانپیں، صاف کی ہوئی",
      "ایک کپ گاڑھا دہی، چھنا ہوا",
      "ایک کھانے کا چمچ کچے پپیتے کا پیسٹ، چھلکے سمیت پسا ہوا",
      "ایک کھانے کا چمچ کشمیری سرخ مرچ",
      "ایک چائے کا چمچ امچور پاؤڈر",
      "ایک کھانے کا چمچ ادرک لہسن پیسٹ",
      "ایک چائے کا چمچ کالا نمک",
      "ایک لیموں کا رس",
      "دو کھانے کے چمچ پگھلا ہوا گھی، بھوننے کے لیے"
    ],
    ingredientsRoman: [
      "6 Lamb chops, properly cleaned",
      "1 cup Thick Greek Yogurt, hung dry",
      "1 tbsp Raw Papaya paste, freshly ground with skin",
      "1 tbsp Kashmiri Chili powder",
      "1 tsp Amchoor",
      "1 tbsp Ground Ginger-Garlic paste",
      "1 tsp Kala Namak",
      "1 Lembu, juiced",
      "2 tbsp Clarified butter (ghee), melted for basting"
    ],
    stepsUrdu: [
      "چانپوں کو صاف کریں، ان پر کچے پپیتے کا پیسٹ اور آدھا چمچ نمک رگڑیں، اور ایک گھنٹے کے لیے فریج میں گلنے کے لیے چھوڑ دیں ۔",
      "ایک پیالے میں سوکھا دہی، ادرک لہسن پیسٹ، کشمیری مرچ، امچور اور کالا نمک ملا کر مصالحہ تیار کریں۔",
      "اس مصالحے کو چانپوں پر اچھی طرح لگائیں اور چار گھنٹے فریج میں رکھ دیں، رات بھر رکھنا سب سے بہتر ہے۔",
      "بھاری توے پر گھی ڈالیں اور تیز آنچ پر بہت گرم کر لیں تاکہ تندور جیسی حرارت بنے۔",
      "چانپوں کو تھوڑے فاصلے پر رکھ کر پانچ منٹ تک ایک طرف سے سیکیں، پھر پلٹ کر مکھن لگائیں اور دوسری طرف سے بھی پانچ منٹ سیکیں۔",
      "اب چانپوں کی چربی والی سائیڈ کھڑی کر کے دو منٹ پکائیں، آخری پانچ منٹ فائل میں ڈھانپ کر دم دیں اور پیش کریں۔"
    ],
    stepsRoman: [
      "Lamb chops ko saaf karein, in par kache papitay ka paste aur adha chammach namak ragrein, aur ek ghantay ke liye fridge mein tender hone dein.",
      "Ek bowl mein sukha dahi, adrak-lehsan paste, kashmiri chili, lehsan-adrak, amchoor aur kala namak mila kar marinade taiyar karein.",
      "Is marinade ko chanpon par achi tarah lagayein aur chaar ghantay fridge mein rukh dein, overnight rakhna sab se behtareen hai.",
      "Heavy taway par ghee dalen aur high heat par bohat garam kar lein taake tandoor jaisi aag banay.",
      "Chanpon ko thoray faslay par rukh kar paanch minute tak ek side se sekein, phir flip kar ke makkhan lagayein aur dusri side se bhi paanch minute sekein.",
      "Ab chanpon ke fat edges ko do minute taway par khara kar ke pakaen, aakhri paanch minute foil mein dhaanp kar rest dein aur pesh karein."
    ],
    chefTricksUrdu: [
      "کچے پپیتے میں قدرتی خامرے ہوتے ہیں جو گوشت کو مکھن کی طرح نرم اور ملائم بنا دیتے ہیں۔",
      "بھونتے وقت اوپر مکھن لگانے سے چانپوں پر ایک خوبصورت سنہری لذیذ رنگت بنتی ہے۔"
    ],
    chefTricksRoman: [
      "Kachay papitay mein natural enzymes hote hain jo gosht ko makhan ki tarah naram aur tender bana dete hain.",
      "Searing ke doran makkhan lagane se gosht ke upar ek lazeez sunehri parat ban jati hai."
    ]
  },
  "rec_6": {
    recipeNameUrdu: "شیف کے ہاتھ کا تیار کردہ مکھنی نان",
    recipeNameRoman: "Chef's Artisanal Butter Naan",
    descriptionUrdu: "یہ ایک نہایت ہی نرم، خمیر سے بنی ہوئی نان ہے، جسے ہم الٹے لوہے کے توے پر پکا کر تندور کی طرح سیکنے کا مزہ پیدا کرتے ہیں، اور آخر میں اس پر مکھن لگاتے ہیں۔",
    descriptionRoman: "Yeh ek nihayat hi narm, khameer se bani hui naan hai, jise hum ulte lohay ke taway par paka kar tandoor ki tarah seknay ka maza paida karte hain, aur aakhir mein is par makkhan lagate hain.",
    ingredientsUrdu: [
      "تین کپ اعلیٰ کوالٹی کا میدہ",
      "ایک چائے کا چمچ خشک خمیر",
      "ایک چائے کا چمچ گنے کی قدرتی چینی",
      "ایک چائے کا چمچ سمندری نمک",
      "ایک چوتھائی کپ نیم گرم پانی",
      "آدھا کپ پھینٹا ہوا یونانی دہی",
      "دو کھانے کے چمچ خالص گائے کا گھی",
      "نیم گرم دودھ، آٹا گوندھنے کے لیے حسبِ ضرورت",
      "ایک چائے کا چمچ کلونجی، نان کے اوپر لگانے کے لیے",
      "آدھا کپ پگھلا ہوا مکھن، نان پر لگانے کے لیے",
      "ایک چوتھائی کپ باریک کٹا ہوا ہرا دھنیا"
    ],
    ingredientsRoman: [
      "3 cups Premium Maida / All-Purpose Flour",
      "1 tsp Active Instant Dry Yeast (Khameer)",
      "1 tbsp Raw Cane Sugar (Cheeni)",
      "1 tsp Sea salt (Namak)",
      "1/4 cup Lukewarm Water (Paani)",
      "1/2 cup Whisked Greek Yogurt (Dahi)",
      "2 tbsp Milk-clarified Cow Ghee",
      "Warm Whole Milk, darmayani consistency ke liye",
      "1 tsp Nigella seeds (Kalonji), upar lagane ke liye",
      "1/2 cup Melted Salted Butter, makkhan lagane ke liye",
      "1/4 cup Chop hara dhaniya (Coriander)"
    ],
    stepsUrdu: [
      "سب سے پہلے، نیم گرم پانی میں تھوڑی چینی اور خشک خمیر ملائیں۔ اسے آٹھ منٹ کے لیے چھوڑ دیں، جب تک کہ اس کے اوپر جھاگ دار خمیر نہ بن جائے۔",
      "اب ایک بڑے باؤل میں چھنا ہوا میدہ اور نمک ملائیں۔ دو چمچ گھی شامل کر کے انگلیوں سے ملائیں۔ پھر دہی اور خمیر ملا کر، ہلکا ہلکا دودھ ڈالتے ہوئے نرم آٹا گوندھ لیں۔",
      "اب آٹا کاؤنٹر پر رکھ کر آٹھ سے دس منٹ اچھی طرح گوندھیں جب تک نرم اور غیر چپکاہٹ والا نہ ہو جائے۔ ایک باؤل میں تھوڑا تیل لگا کر آٹے کو اس میں رکھیں، گیلے کپڑے سے ڈھانپ کر ڈیڑھ گھنٹے کے لیے کسی اندھیری جگہ پر رکھ دیں۔",
      "اب آٹے کی ہوا نکال کر اس کے چھ برابر حصے کر لیں۔ ان کے گول پیڑے بنا کر آخری پندرہ منٹ کے لیے مزید پھولنے کے لیے رکھ دیں۔",
      "اب ہر پیڑے کو لمبوترے آنسو کی شکل میں بیلیں۔ بیلنے کے بعد، نان کی پچھلی سائیڈ پر پانی کا ہاتھ اچھی طرح لگائیں، تاکہ یہ توے پر چپکنے کے لیے گوند کا کام کرے۔",
      "اب گیلی سائیڈ کو تیز گرم اور دھوئیں دار لوہے کے توے پر ڈالیں۔ جب بڑے بلبلے اٹھنے لگیں، تو توا الٹا کر کے آگ کے اوپر دو انچ فاصلے پر نان کو سیکیں۔ سیکنے کے بعد مکھن، کلونجی اور ہرا دھنیا لگائیں۔"
    ],
    stepsRoman: [
      "Sub se pehle, neem-garam paani mein thori cheeni aur dry yeast milaein. Isey aath minute ke liye chorh dein, jab tak ke is ke upar jhaag daar khameer na ban jaye.",
      "Ab ek bare bowl mein chhina hua maida aur namak milaein. Do chammach ghee shamil kar ke ungliyon se milaen. Phir dahi aur khameer mila kar, halka halka doodh daltay hue narm aata goondh lein.",
      "Ab aata counter par rakh kar aath se das minute achi tarah goondhein jab tak narm aur gair-chipkahaat wala na hojaye. Ek bowl mein thora tel laga kar aatay ko us mein rakhein, geele kapre se dhaanp kar dedh ghantay ke liye kisi andheri jagah par rakh dein.",
      "Ab aatay ki hawa nikaal kar is ke chay barabar hissay kar lein. In ke gol peray bana kar aakhri pandrah minute ke liye mazeed phoolnay ke liye rakh dein.",
      "Ab har peray ko lambootray tear-drop ki shakal mein belen. Belnay ke baad, naan ki peechli side par paani ka hath achi tarah lagaen, taake yeh taway par chipakne ke liye gond ka kaam kare.",
      "Ab gilli side ko tez garam aur dhuayen dar lohay ke taway par daalien. Jab bare bubbles uthne lagein, to tawa ulta kar ke aag ke upar do inch faslay par naan ko sekien. Sikanay ke baad makkhan, kalonji aur hara dhaniya lgaen."
    ],
    chefTricksUrdu: [
      "نان اسٹک توے کا استعمال بالکل مت کریں، کیونکہ توا الٹا کرتے ہی نان سیدھا آگ پر گر جائے گا۔",
      "نان کے پیچھے پانی لگانا سب سے اہم ہے تاکہ یہ لوہے سے چپکا رہے۔ اس بھاپ سے نان نرم اور پھولا ہوا بنتا ہے۔"
    ],
    chefTricksRoman: [
      "Non-stick taway ka istemal bilkul mat karein, kyun ke tawa ulta karte hi naan sidha aag par gir jayega.",
      "Naan ke peeche pani lagana sab se ahem hai taake yeh lohay se chipka rahe. Is bhaap se naan narm aur fula hua banta hai."
    ]
  }
};

// DYNAMIC PROCEDURAL URDU/ROMAN TRANSLATION ENGINE FOR AI-GENERATED CUSTOM RECIPES
// Translates nouns, variables and structures on the fly with warm chef expressions.
const translateProcedural = (text: string, toUrduScript: boolean): string => {
  let output = text;
  
  const dict: Record<string, { ur: string; ro: string }> = {
    "flour": { ur: "میدہ", ro: "maida" },
    "yeast": { ur: "خمیر", ro: "khameer" },
    "sugar": { ur: "چینی", ro: "cheeni" },
    "salt": { ur: "نمک", ro: "namak" },
    "water": { ur: "پانی", ro: "paani" },
    "yogurt": { ur: "دہی", ro: "dahi" },
    "ghee": { ur: "گھی", ro: "ghee" },
    "milk": { ur: "دودھ", ro: "doodh" },
    "nigella seeds": { ur: "کلونجی", ro: "kalonji" },
    "butter": { ur: "مکھن", ro: "makkhan" },
    "chicken": { ur: "چکن / مرغی", ro: "chicken" },
    "garlic": { ur: "لہسن", ro: "lehsan" },
    "ginger": { ur: "ادرک", ro: "adrak" },
    "onion": { ur: "پیاز", ro: "pyaaz" },
    "tomato": { ur: "ٹماٹر", ro: "tamatar" },
    "tomatoes": { ur: "ٹماٹر", ro: "tamatar" },
    "meat": { ur: "گوشت", ro: "gosht" },
    "beef": { ur: "بیف", ro: "beef" },
    "lamb": { ur: "لیمب / گوشت", ro: "lamb" },
    "spices": { ur: "شاہی مصالحے", ro: "shahi masalay" },
    "oil": { ur: "تیل", ro: "tel" },
    "minutes": { ur: "منٹ", ro: "minute" },
    "minute": { ur: "منٹ", ro: "minute" },
    "Mains": { ur: "خاص کھانا", ro: "main course" },
    "Dessert": { ur: "میٹھا", ro: "meetha" },
    "Breads": { ur: "روٹی / نان", ro: "roti aur naan" },
    "Appetizer": { ur: "آغاز", ro: "shuruat" },
    "Easy": { ur: "بہت ہی آسان", ro: "bohat hi aasaan" },
    "Medium": { ur: "درمیانہ بہترین", ro: "ba-sahulat darmiyana" },
    "Hard": { ur: "تھوڑا مشکل اور شاہانہ", ro: "thoda mushkil aur royal" }
  };

  // Perform simple vocabulary replacements
  for (const [key, val] of Object.entries(dict)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    output = output.replace(regex, toUrduScript ? val.ur : val.ro);
  }

  // Dynamic cooking verbs replacement for Roman Urdu
  if (!toUrduScript) {
    output = output
      .replace(/mix/gi, "milaein")
      .replace(/stir/gi, "chamach chalayein")
      .replace(/heat/gi, "garam karein")
      .replace(/pour/gi, "shamil karein")
      .replace(/add/gi, "shamil karein")
      .replace(/bake/gi, "bake karein")
      .replace(/boil/gi, "ubalein")
      .replace(/fry/gi, "sekein aur fry karein")
      .replace(/serve/gi, "pesh karein");
  }

  return output;
};

export default function RecipeNarrator({ recipe, onHighlightUpdate }: RecipeNarratorProps) {
  const [playlist, setPlaylist] = useState<SpeechItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);

  // LANGUAGE SELECTION STATE: 'en' | 'roman_ur' | 'ur'
  const [currentLang, setCurrentLang] = useState<"en" | "roman_ur" | "ur">("roman_ur");

  // References to track synthesis state securely across renders
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<any>(null);

  // Initialize SpeechSynthesis and load voices
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSpeechSupported(false);
      return;
    }

    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
      
      // Auto-select based on target language mode to secure flawless pronunciations
      let preferredVoice: SpeechSynthesisVoice | undefined;
      
      if (currentLang === "ur") {
        // Preferred Native Urdu voice first, Hindi ('hi') second (it sounds identical to native Urdu script narration), or South Asian (en-IN)
        preferredVoice = voices.find(v => v.lang.startsWith("ur") || v.lang.startsWith("hi"));
      } else if (currentLang === "roman_ur") {
        // Roman Urdu reads perfectly with custom South Asian/Hindi rhythms
        preferredVoice = voices.find(v => v.lang.startsWith("hi") || v.lang.startsWith("en-IN") || v.lang.startsWith("ur"));
      } else {
        // English
        preferredVoice = voices.find(v => v.lang.toLowerCase().includes("en-in") || v.name.toLowerCase().includes("rishi") || v.lang.startsWith("en"));
      }

      // Fallback
      const finalVoice = preferredVoice || voices.find(v => v.lang.startsWith("en")) || voices[0];
      if (finalVoice) {
        setSelectedVoiceName(finalVoice.name);
      }
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }

    synth.cancel();

    return () => {
      synth.cancel();
    };
  }, [currentLang]);

  // Generate playlist when recipe or language changes
  useEffect(() => {
    if (!speechSupported) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const newPlaylist: SpeechItem[] = [];
    const recipeId = recipe.id || "";
    const hasTranslation = !!SIGNATURE_TRANSLATIONS[recipeId];
    const trans = SIGNATURE_TRANSLATIONS[recipeId];

    // 1. Introduction item construction
    let introLabel = "";
    let introText = "";

    if (currentLang === "ur") {
      introLabel = hasTranslation ? `جائزہ: ${trans.recipeNameUrdu}` : `جائزہ: ${recipe.recipeName}`;
      const name = hasTranslation ? trans.recipeNameUrdu : translateProcedural(recipe.recipeName, true);
      const desc = hasTranslation ? trans.descriptionUrdu : translateProcedural(recipe.description, true);
      const diff = hasTranslation ? (recipe.difficulty === "Easy" ? "آسان" : recipe.difficulty === "Hard" ? "کافی مہارت والا" : "درمیانہ") : translateProcedural(recipe.difficulty, true);
      
      introText = `السلام علیکم کچن کے ساتھیو! شیف وقاص پیش کرتے ہیں: ${name}۔ ${desc}۔ اسے بنانا ${diff} ہے۔ تیاری میں ${recipe.prepTime} منٹ اور پکانے میں ${recipe.cookTime} منٹ لگیں گے۔ آئیے بسم اللہ کریں۔`;
    } else if (currentLang === "roman_ur") {
      introLabel = hasTranslation ? `Overview: ${trans.recipeNameRoman}` : `Overview: ${recipe.recipeName}`;
      const name = hasTranslation ? trans.recipeNameRoman : translateProcedural(recipe.recipeName, false);
      const desc = hasTranslation ? trans.descriptionRoman : translateProcedural(recipe.description, false);
      const diff = hasTranslation ? (recipe.difficulty === "Easy" ? "aasaan" : recipe.difficulty === "Hard" ? "shahi aur thoda mushkil" : "darmiyana") : translateProcedural(recipe.difficulty, false);

      introText = `Salaam Alaikum mere pyare home-chef dosto! Chef Waqas pesh karte hain: ${name}. ${desc}. Is ko banana ${diff} hai. Tayyari ke liye ${recipe.prepTime} minute aur pakane ke liye ${recipe.cookTime} minute darkaar hain. Aaiye shuru karte hain!`;
    } else {
      introLabel = `Overview of ${recipe.recipeName}`;
      introText = `Chef Waqas presents: ${recipe.recipeName}. ${recipe.description}. Difficulty level is ${recipe.difficulty}. Total preparation time ${recipe.prepTime} minutes, and cooking time ${recipe.cookTime} minutes. Let's make it together!`;
    }

    newPlaylist.push({
      id: "intro",
      section: "info",
      index: 0,
      label: introLabel,
      text: introText
    });

    // 2. Ingredients item construction
    recipe.ingredients.forEach((ing, idx) => {
      let ingLabel = "";
      let ingText = "";

      if (currentLang === "ur") {
        ingLabel = hasTranslation ? `جزو ${idx + 1}: ${trans.ingredientsUrdu[idx] || ing}` : `جزو ${idx + 1}: ${ing}`;
        const translatedIng = hasTranslation && trans.ingredientsUrdu[idx] ? trans.ingredientsUrdu[idx] : translateProcedural(ing, true);
        ingText = idx === 0 
          ? `آئیے اجزاء جمع کریں۔ سب سے پہلے لیں: ${translatedIng}۔`
          : `اس کے بعد ہمیں چاہیے: ${translatedIng}۔`;
      } else if (currentLang === "roman_ur") {
        ingLabel = hasTranslation ? `Ingredient ${idx + 1}: ${trans.ingredientsRoman[idx] || ing}` : `Ingredient ${idx + 1}: ${ing}`;
        const translatedIng = hasTranslation && trans.ingredientsRoman[idx] ? trans.ingredientsRoman[idx] : translateProcedural(ing, false);
        ingText = idx === 0
          ? `Aaiye pehle saaray ajzaa jama karte hain. Sab se pehle shamil karein: ${translatedIng}.`
          : `Agla ajzaa humein chahiye: ${translatedIng}.`;
      } else {
        ingLabel = `Ingredient ${idx + 1}: ${ing}`;
        ingText = idx === 0 
          ? `Let's gather our recipe ingredients. First: ${ing}.` 
          : `Next ingredient: ${ing}.`;
      }

      newPlaylist.push({
        id: `ing-${idx}`,
        section: "ingredients",
        index: idx,
        label: ingLabel,
        text: ingText
      });
    });

    // 3. steps item construction
    recipe.steps.forEach((step, idx) => {
      let stepLabel = "";
      let stepText = "";

      if (currentLang === "ur") {
        stepLabel = `مرحلہ ${idx + 1}`;
        const translatedStep = hasTranslation && trans.stepsUrdu[idx] ? trans.stepsUrdu[idx] : translateProcedural(step, true);
        stepText = `مرحلہ نمبر ${idx + 1}۔ ${translatedStep}`;
      } else if (currentLang === "roman_ur") {
        stepLabel = `Stage ${idx + 1}`;
        const translatedStep = hasTranslation && trans.stepsRoman[idx] ? trans.stepsRoman[idx] : translateProcedural(step, false);
        stepText = `Marhala number ${idx + 1}. ${translatedStep}`;
      } else {
        stepLabel = `Stage ${idx + 1}`;
        stepText = `Active Stage ${idx + 1}. ${step}`;
      }

      newPlaylist.push({
        id: `step-${idx}`,
        section: "steps",
        index: idx,
        label: stepLabel,
        text: stepText
      });
    });

    // 4. Chef's Secret Tricks item construction
    if (recipe.chefTricks && recipe.chefTricks.length > 0) {
      recipe.chefTricks.forEach((trick, idx) => {
        let trickLabel = "";
        let trickText = "";

        if (currentLang === "ur") {
          trickLabel = `خفیہ راز ${idx + 1}`;
          const translatedTrick = hasTranslation && trans.chefTricksUrdu[idx] ? trans.chefTricksUrdu[idx] : translateProcedural(trick, true);
          trickText = idx === 0 
            ? `اور اب، شیف وقاص کا خاص ترین باریک راز۔ سنیں: ${translatedTrick}`
            : `ایک اور اہم راز: ${translatedTrick}`;
        } else if (currentLang === "roman_ur") {
          trickLabel = `Chef's Secret ${idx + 1}`;
          const translatedTrick = hasTranslation && trans.chefTricksRoman[idx] ? trans.chefTricksRoman[idx] : translateProcedural(trick, false);
          trickText = idx === 0
            ? `Aur ab, Chef Waqas ki diary se ek khas khufia raaz. Gaur se suniye: ${translatedTrick}`
            : `Ek aur zaroori nuskha: ${translatedTrick}`;
        } else {
          trickLabel = `Chef Waqas' Secret Trick ${idx + 1}`;
          trickText = idx === 0 
            ? `And here is Chef Waqas' custom culinary secret. First: ${trick}`
            : `Another vital tip: ${trick}`;
        }

        newPlaylist.push({
          id: `trick-${idx}`,
          section: "tricks",
          index: idx,
          label: trickLabel,
          text: trickText
        });
      });
    }

    setPlaylist(newPlaylist);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setIsPaused(false);

    return () => {
      synth.cancel();
      onHighlightUpdate(null, null);
    };
  }, [recipe, currentLang]);

  // Execute speaking a specific item
  const speakPlaylistItem = (indexToSpeak: number) => {
    if (!speechSupported || indexToSpeak < 0 || indexToSpeak >= playlist.length) {
      handleStop();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    setCurrentIndex(indexToSpeak);
    setIsPlaying(true);
    setIsPaused(false);

    const item = playlist[indexToSpeak];
    onHighlightUpdate(item.section, item.index);

    const utterance = new SpeechSynthesisUtterance(item.text);

    // Apply voice settings dynamically based on voice options
    if (selectedVoiceName) {
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) utterance.voice = voice;
    } else {
      // Automatic fallback selection if voice was list-updated
      let fallbackVoice: SpeechSynthesisVoice | undefined;
      if (currentLang === "ur") {
        fallbackVoice = availableVoices.find(v => v.lang.startsWith("ur") || v.lang.startsWith("hi"));
      } else if (currentLang === "roman_ur") {
        fallbackVoice = availableVoices.find(v => v.lang.startsWith("hi") || v.lang.startsWith("en-IN"));
      }
      if (fallbackVoice) utterance.voice = fallbackVoice;
    }

    utterance.rate = speakingRate * (currentLang === "ur" ? 0.9 : 1.0); // Slightly slower for crisp Urdu script
    utterance.pitch = currentLang === "ur" ? 0.95 : 1.05; // Grounded tone for Urdu/Hindi script

    utterance.onend = () => {
      timerRef.current = setTimeout(() => {
        if (indexToSpeak + 1 < playlist.length) {
          speakPlaylistItem(indexToSpeak + 1);
        } else {
          handleStop();
        }
      }, 1500); // 1.5s natural pause between kitchen guidelines
    };

    utterance.onerror = (e) => {
      console.warn("Speech Synthesis failed or canceled:", e);
    };

    currentUtteranceRef.current = utterance;
    synth.speak(utterance);
  };

  const handlePlayPause = () => {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;

    if (isPlaying) {
      if (isPaused) {
        synth.resume();
        setIsPaused(false);
      } else {
        synth.pause();
        setIsPaused(true);
      }
    } else {
      const nextIndex = currentIndex === -1 ? 0 : currentIndex;
      speakPlaylistItem(nextIndex);
    }
  };

  const handleStop = () => {
    if (!speechSupported) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    
    window.speechSynthesis.cancel();
    setCurrentIndex(-1);
    setIsPlaying(false);
    setIsPaused(false);
    onHighlightUpdate(null, null);
  };

  const handleNext = () => {
    if (currentIndex + 1 < playlist.length) {
      speakPlaylistItem(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      speakPlaylistItem(currentIndex - 1);
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeakingRate(newRate);
    if (isPlaying && !isPaused && currentIndex !== -1) {
      speakPlaylistItem(currentIndex);
    }
  };

  if (!speechSupported) {
    return (
      <div className="bg-stone-50 border border-stone-200 text-stone-600 rounded-2xl p-4 flex items-center gap-3 text-xs">
        <AlertCircle className="w-4 h-4 text-stone-400" />
        <span>Text-to-Speech is not supported in this environment. Please open in a new tab!</span>
      </div>
    );
  }

  return (
    <div id="recipe-tts-narrator" className="bg-stone-50 border border-stone-200 rounded-2.5xl p-4.5 shadow-3xs flex flex-col gap-4 select-none">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-xl">
            {isPlaying && !isPaused ? (
              <Volume2 className="w-5 h-5 animate-pulse" />
            ) : (
              <VolumeX className="w-5 h-5 text-stone-400" />
            )}
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-stone-900 uppercase tracking-widest leading-none flex items-center gap-1.5 font-sans">
              Chef Waqas' Vocal Guide
              {isPlaying && !isPaused && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 animate-pulse border border-amber-200">
                  {currentLang === "ur" ? "بول رہے ہیں..." : "SPEAKING..."}
                </span>
              )}
            </h4>
            <p className="text-[10px] text-stone-500 mt-1">
              Select your language to hear cooking instructions and kitchen tips out loud!
            </p>
          </div>
        </div>

        {/* CONTROLS BAR: LANGUAGE & SPEEDS */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* LANGUAGE TOGGLE SELECTOR */}
          <div className="flex items-center bg-stone-200/60 rounded-xl p-0.5 border border-stone-200 text-xs font-extrabold text-stone-700">
            <button
              onClick={() => {
                handleStop();
                setCurrentLang("en");
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentLang === "en" 
                  ? "bg-white text-stone-950 shadow-2xs" 
                  : "hover:text-stone-900"
              }`}
            >
              🇺🇸 English
            </button>
            <button
              onClick={() => {
                handleStop();
                setCurrentLang("roman_ur");
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentLang === "roman_ur" 
                  ? "bg-white text-stone-950 shadow-2xs" 
                  : "hover:text-stone-900"
              }`}
            >
              🇵🇰 Roman Urdu
            </button>
            <button
              onClick={() => {
                handleStop();
                setCurrentLang("ur");
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                currentLang === "ur" 
                  ? "bg-white text-stone-950 shadow-2xs" 
                  : "hover:text-stone-900"
              }`}
            >
              🇵🇰 اردو (Voice)
            </button>
          </div>

          {/* Speed settings multiplier */}
          <div className="flex items-center bg-stone-200/40 rounded-lg p-0.5 text-[10px] font-bold text-stone-600 border border-stone-150">
            {([0.8, 1.0, 1.25] as const).map((rate) => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`px-2 py-0.5 rounded transition ${
                  speakingRate === rate ? "bg-stone-500 text-white" : "hover:text-stone-900"
                }`}
              >
                {rate === 1.0 ? "1x" : `${rate}x`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AUDIO STATUS BLOCK */}
      <div className="bg-white border border-stone-150 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isPlaying && currentIndex !== -1 ? (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black text-amber-700 tracking-wider">
                {currentLang === "ur" ? "ابھی آواز" : "CURRENTLY SPEAKING"}
              </span>
              <span className="font-extrabold text-stone-900 text-xs truncate max-w-[280px]">
                {playlist[currentIndex]?.label}
              </span>
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black text-stone-400 tracking-wider">
                {currentLang === "ur" ? "ہینڈز فری کچن گائیڈ" : "HANDS-FREE COOKING SYSTEM"}
              </span>
              <span className="font-extrabold text-stone-600 text-xs">
                {currentLang === "ur" 
                  ? "شور والے کچن میں بغیر فون دیکھے کام کریں" 
                  : "Never look at your phone screen while cooking!"
                }
              </span>
            </div>
          )}
        </div>

        {/* Audio buttons configuration */}
        <div id="recipe-audio-controls-tray" className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrev}
            disabled={!isPlaying || currentIndex <= 0}
            className="p-2 text-stone-400 hover:text-stone-950 bg-stone-50 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-stone-50 border border-stone-150 rounded-xl transition-all"
            title="Previous item"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-stone-950 font-black tracking-wider uppercase text-[10px] rounded-xl flex items-center gap-1.5 transition-all shadow-3xs"
            title={isPlaying && !isPaused ? "Pause" : "Listen"}
          >
            {isPlaying && !isPaused ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-stone-950" />
                <span>{currentLang === "ur" ? "روکیں" : "Pause"}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-stone-950" />
                <span>
                  {currentLang === "ur" 
                    ? (currentIndex !== -1 ? "جاری کریں" : "سنیں") 
                    : (currentIndex !== -1 ? "Resume" : "Listen")
                  }
                </span>
              </>
            )}
          </button>

          {isPlaying && (
            <button
              onClick={handleStop}
              className="p-2.5 text-rose-600 hover:text-rose-750 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-all"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-rose-600" />
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={!isPlaying || currentIndex >= playlist.length - 1}
            className="p-2 text-stone-400 hover:text-stone-950 bg-stone-50 hover:bg-stone-100 disabled:opacity-30 disabled:hover:bg-stone-50 border border-stone-150 rounded-xl transition-all"
            title="Next item"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
