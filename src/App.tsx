import React, { useState, useEffect, useRef } from "react";
import { Recipe, ChatMessage, ActiveKitchenTimer } from "./types";
import {
  Search,
  Sparkles,
  Utensils,
  ChefHat,
  Clock,
  Users,
  Flame,
  Heart,
  RotateCcw,
  Play,
  Pause,
  X,
  Check,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Info,
  BookOpen,
  Filter,
  CheckSquare,
  HelpCircle,
  AlertCircle,
  Cloud,
  CloudOff,
  LogIn,
  LogOut,
  RefreshCw,
  Calendar
} from "lucide-react";
import RecipeCard from "./components/RecipeCard";
import RecipeNarrator from "./components/RecipeNarrator";
import CookAlong from "./components/CookAlong";

import flourImg from "./assets/images/flour.png";
import yeastImg from "./assets/images/yeast.png";
import sugarImg from "./assets/images/sugar.png";
import saltImg from "./assets/images/salt.png";
import waterImg from "./assets/images/water.png";
import yogurtImg from "./assets/images/yogurt.png";
import gheeImg from "./assets/images/ghee.png";
import milkImg from "./assets/images/milk.png";
import nigellaImg from "./assets/images/nigella_seeds.png";
import butterImg from "./assets/images/butter.png";
import chefWaqasImg from "./assets/images/chef_waqas_1779297988068.png";

// Import Firebase Client APIs and Helpers
import { 
  auth, 
  db, 
  signInWithGoogle, 
  logoutUser, 
  handleFirestoreError, 
  OperationType,
  getAccessToken
} from "./firebase";
import { scheduleMealOnGoogleCalendar } from "./utils/calendar";
import { 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  getDocFromServer,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

const getIngredientImage = (ingredientText: string): string | undefined => {
  const text = ingredientText.toLowerCase();
  if (text.includes("flour")) return flourImg;
  if (text.includes("yeast")) return yeastImg;
  if (text.includes("sugar")) return sugarImg;
  if (text.includes("salt")) return saltImg;
  if (text.includes("water")) return waterImg;
  if (text.includes("yogurt")) return yogurtImg;
  if (text.includes("ghee")) return gheeImg;
  if (text.includes("milk")) return milkImg;
  if (text.includes("nigella") || text.includes("kalonji")) return nigellaImg;
  if (text.includes("butter")) return butterImg;
  return undefined;
};

export default function App() {
  // --- STATE ---
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Firebase Authentication & Cloud State Sync
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [syncingCloud, setSyncingCloud] = useState<boolean>(false);

  // Filter settings
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("All");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");
  const [showOnlyBookmarks, setShowOnlyBookmarks] = useState<boolean>(false);

  // Favorites (Bookmarks)
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("chef_waqas_bookmarks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom AI recipes
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>(() => {
    try {
      const saved = localStorage.getItem("chef_waqas_custom_recipes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected recipe detail modal
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [cookAlongActive, setCookAlongActive] = useState<boolean>(false);
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Practical active kitchen timer state
  const [timerDuration, setTimerDuration] = useState<number>(300); // Default to 5 minutes (300s)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(300);
  const [timerIsActive, setTimerIsActive] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>("5");
  const [timerCompletedAlert, setTimerCompletedAlert] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Modern concurrent timers and notification configurations
  const [cookTimers, setCookTimers] = useState<ActiveKitchenTimer[]>(() => {
    try {
      const saved = localStorage.getItem("chef_waqas_running_timers");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customTimerLabel, setCustomTimerLabel] = useState<string>("");
  const [customTimerMinutes, setCustomTimerMinutes] = useState<string>("5");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });


  // Spoken narration highlights
  const [narratingSection, setNarratingSection] = useState<"info" | "ingredients" | "steps" | "tricks" | null>(null);
  const [narratingIndex, setNarratingIndex] = useState<number | null>(null);

  // AI Recipe Generator state
  const [inventoryIngredients, setInventoryIngredients] = useState<string[]>(["Chicken", "Garlic", "Tomatoes"]);
  const [currentIngredientInput, setCurrentIngredientInput] = useState<string>("");
  const [generatorDiet, setGeneratorDiet] = useState<string>("None");
  const [generatorDifficulty, setGeneratorDifficulty] = useState<string>("Medium");
  const [generatorTime, setGeneratorTime] = useState<string>("30");
  const [generatorPrompt, setGeneratorPrompt] = useState<string>("");
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState<boolean>(false);
  const [generationStepMessage, setGenerationStepMessage] = useState<string>("");

  // Chef Chat state
  const [chatOpen, setChatOpen] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("chef_waqas_chat_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "msg_init",
        role: "model",
        content: "Assalamu Alaikum! Welcome to my dynamic kitchen, my friend. I am Chef Waqas. Ask me any culinary question—from proper rice hydration to tempering royal spices, or replacing a rare ingredient. What's on your stove cooked with love today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });
  const [chatInput, setChatInput] = useState<string>("");
  const [isChefThinking, setIsChefThinking] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Google Calendar scheduling state
  const [calendarDateTime, setCalendarDateTime] = useState<string>("");
  const [calendarGuests, setCalendarGuests] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState<boolean>(false);
  const [calendarSuccessEvent, setCalendarSuccessEvent] = useState<{ htmlLink: string; summary: string } | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // Suggested questions list
  const suggestedQuestions = [
    "What is the secret to a soft Tandoori Naan?",
    "How to smoke a biryani with charcoal properly?",
    "Can you suggest a substitute for Mustard Oil?",
    "What core spices go into authentic Garam Masala?"
  ];

  // Quick prepopulated selection of ingredients
  const popularIngredients = [
    "Beef", "Chicken", "Seabass", "Rice", "Yogurt", "Ginger", "Garlic", "Tomatoes", "Onions", "Cardamom", "Saffron", "Mustard Oil", "Spinach", "Paneer", "Butter", "Green Chilies"
  ];

  // Validate Connection to Firestore on boot (Required by Guideline Part 1)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
      } catch (error) {
        if (error instanceof Error && error.message.includes("offline")) {
          console.warn("Please check your Firebase configuration or network status.");
        }
      }
    }
    testConnection();
  }, []);

  // Set default calendar date-time (1 hour in the future) when opening a recipe details modal
  useEffect(() => {
    if (selectedRecipe) {
      const date = new Date();
      date.setHours(date.getHours() + 1);
      date.setMinutes(0);
      const tzOffset = date.getTimezoneOffset() * 60000; // offset in ms
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      setCalendarDateTime(localISOTime);
      setCalendarGuests("");
      setCalendarSuccessEvent(null);
      setCalendarError(null);
    }
  }, [selectedRecipe]);

  // Listen to Auth State and synchronize state with Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setSyncingCloud(true);
        try {
          // 1. Fetch Cloud Bookmarks
          const bmPath = `users/${currentUser.uid}/bookmarks`;
          const bmSnap = await getDocs(collection(db, bmPath)).catch(err => {
            handleFirestoreError(err, OperationType.GET, bmPath);
          });
          const cloudBookmarks = bmSnap ? bmSnap.docs.map(doc => doc.data().recipeId as string) : [];

          // Merge local bookmarks
          const mergedBookmarks = Array.from(new Set([...bookmarks, ...cloudBookmarks]));
          setBookmarks(mergedBookmarks);

          // Save any new merged bookmarks back to cloud
          const batch = writeBatch(db);
          let hasNew = false;
          for (const bId of bookmarks) {
            if (!cloudBookmarks.includes(bId)) {
              const bDocRef = doc(db, `users/${currentUser.uid}/bookmarks`, bId);
              batch.set(bDocRef, {
                recipeId: bId,
                savedAt: serverTimestamp()
              });
              hasNew = true;
            }
          }
          if (hasNew) {
            await batch.commit().catch(err => console.error("Error committing local bookmarks to cloud:", err));
          }

          // 2. Fetch Cloud Custom Recipes
          const rcPath = `users/${currentUser.uid}/custom_recipes`;
          const rcSnap = await getDocs(collection(db, rcPath)).catch(err => {
            handleFirestoreError(err, OperationType.GET, rcPath);
          });
          const cloudRecipes = rcSnap ? rcSnap.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              recipeName: d.recipeName,
              description: d.description,
              prepTime: d.prepTime,
              cookTime: d.cookTime,
              servings: d.servings,
              difficulty: d.difficulty,
              course: d.course,
              ingredients: d.ingredients || [],
              steps: d.steps || [],
              chefTricks: d.chefTricks || [],
              isCustom: d.isCustom
            } as Recipe;
          }) : [];

          // Merge local custom recipes
          const customRecipesMap = new Map<string, Recipe>();
          customRecipes.forEach(r => { if (r.id) customRecipesMap.set(r.id, r); });
          cloudRecipes.forEach(r => { if (r.id) customRecipesMap.set(r.id, r); });
          const mergedRecipes = Array.from(customRecipesMap.values());
          setCustomRecipes(mergedRecipes);

          // Save any new locally generated recipes to Cloud
          const recipeBatch = writeBatch(db);
          let hasNewRecipe = false;
          const cloudRecipeIds = cloudRecipes.map(r => r.id);
          for (const r of customRecipes) {
            if (r.id && !cloudRecipeIds.includes(r.id)) {
              const rDocRef = doc(db, `users/${currentUser.uid}/custom_recipes`, r.id);
              recipeBatch.set(rDocRef, {
                recipeName: r.recipeName,
                description: r.description,
                prepTime: r.prepTime,
                cookTime: r.cookTime,
                servings: r.servings || 2,
                difficulty: r.difficulty || "Medium",
                course: r.course || "Mains",
                ingredients: r.ingredients || [],
                steps: r.steps || [],
                chefTricks: r.chefTricks || [],
                isCustom: true,
                savedAt: serverTimestamp()
              });
              hasNewRecipe = true;
            }
          }
          if (hasNewRecipe) {
            await recipeBatch.commit().catch(err => console.error("Error syncing local custom recipes to cloud:", err));
          }

          // 3. Fetch Cloud Chat Message Logs
          const chatPath = `users/${currentUser.uid}/chat_history`;
          const chatQuery = query(collection(db, chatPath), orderBy("createdAt", "asc"));
          const chatSnap = await getDocs(chatQuery).catch(err => {
            return getDocs(collection(db, chatPath));
          });

          if (chatSnap && !chatSnap.empty) {
            const cloudMsgs = chatSnap.docs.map(doc => {
              const d = doc.data();
              return {
                id: d.id,
                role: d.role,
                content: d.content,
                timestamp: d.timestamp
              } as ChatMessage;
            });
            setChatMessages(cloudMsgs);
          } else {
            // Sync local messages to Cloud
            const chatBatch = writeBatch(db);
            let index = 0;
            for (const m of chatMessages) {
              const mDocRef = doc(db, `users/${currentUser.uid}/chat_history`, m.id || `msg_${Date.now()}_${index}`);
              chatBatch.set(mDocRef, {
                id: m.id || `msg_${Date.now()}_${index}`,
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                createdAt: serverTimestamp()
              });
              index++;
            }
            if (chatMessages.length > 0) {
              await chatBatch.commit().catch(err => console.error("Error syncing chat history:", err));
            }
          }

          // 4. Update core profile doc
          const profPath = `users/${currentUser.uid}/private/info`;
          await setDoc(doc(db, profPath), {
            uid: currentUser.uid,
            email: currentUser.email || "",
            displayName: currentUser.displayName || "",
            photoURL: currentUser.photoURL || "",
            createdAt: serverTimestamp()
          }, { merge: true }).catch(err => {
            console.error("Non-blocking profile info update failed:", err);
          });

        } catch (syncErr) {
          console.error("Complete state cloud synchronization failed:", syncErr);
        } finally {
          setSyncingCloud(false);
        }
      } else {
        // Signed out: Revert to local storage state
        try {
          const localBm = localStorage.getItem("chef_waqas_bookmarks");
          setBookmarks(localBm ? JSON.parse(localBm) : []);

          const localCr = localStorage.getItem("chef_waqas_custom_recipes");
          setCustomRecipes(localCr ? JSON.parse(localCr) : []);

          const localCh = localStorage.getItem("chef_waqas_chat_history");
          if (localCh) {
            setChatMessages(JSON.parse(localCh));
          } else {
            setChatMessages([
              {
                id: "msg_init",
                role: "model",
                content: "Assalamu Alaikum! Welcome to my dynamic kitchen, my friend. I am Chef Waqas. Ask me any culinary question—from proper rice hydration to tempering royal spices, or replacing a rare ingredient. What's on your stove cooked with love today?",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        } catch (e) {
          console.error("Error restoring local state:", e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load baseline recipes from API
  useEffect(() => {
    async function fetchBaselineRecipes() {
      try {
        setLoading(true);
        const response = await fetch("/api/recipes/signature");
        const data = await response.json();
        if (data.success && data.recipes) {
          setRecipes(data.recipes);
        } else {
          setError("Failed to download Chef Waqas' proprietary recipes.");
        }
      } catch (err: any) {
        console.error("Fetch baseline recipes error:", err);
        setError("Chef Waqas' server could not be reached. Checking local stoves.");
      } finally {
        setLoading(false);
      }
    }
    fetchBaselineRecipes();
  }, []);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem("chef_waqas_bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Save custom recipes to localStorage
  useEffect(() => {
    localStorage.setItem("chef_waqas_custom_recipes", JSON.stringify(customRecipes));
  }, [customRecipes]);

  // Save chat history to localStorage
  useEffect(() => {
    localStorage.setItem("chef_waqas_chat_history", JSON.stringify(chatMessages));
    // Scroll chat bottom
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Web Audio chime generator
  const PlayAmbientKitchenChime = () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      
      // Gorgeous 2-chord acoustic major third chime
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain1.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 1.2);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.15); // C#6 (Major third harmonizer)
      gain2.gain.setValueAtTime(0.10, audioCtx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(audioCtx.currentTime + 0.15);
      osc2.stop(audioCtx.currentTime + 1.5);
    } catch (e) {
      console.warn("Audio Context playback constrained/ignored:", e);
    }
  };

  const DispatchCulinaryNotification = (title: string, bodyText: string) => {
    // Play synthesized warm chime
    PlayAmbientKitchenChime();

    // Browser level desktop push API
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: bodyText,
            icon: "./src/assets/images/chef_waqas_1779297988068.png",
            tag: "chef-waqas-kitchen-alert"
          });
        } catch (err) {
          console.warn("Desktop Notification dispatch ignored by host sandbox:", err);
        }
      }
    }
  };

  // Save running timers state to localStorage
  useEffect(() => {
    localStorage.setItem("chef_waqas_running_timers", JSON.stringify(cookTimers));
  }, [cookTimers]);

  // Handle countdown for ALL timers (manual primary timer AND multiple named concurrent timers)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const hasActiveMultiTimers = cookTimers.some(t => t.isActive);
    const hasAnyActivity = timerIsActive || hasActiveMultiTimers;

    if (hasAnyActivity) {
      interval = setInterval(() => {
        // 1. Tick the main primary timer
        if (timerIsActive) {
          setTimerSecondsLeft((prev) => {
            if (prev <= 1) {
              setTimerIsActive(false);
              setTimerCompletedAlert(true);
              DispatchCulinaryNotification(
                selectedRecipe ? `Chef Waqas: ${selectedRecipe.recipeName}` : "Active Kitchen Timer",
                "Your main recipe timer is complete! Time to inspect the food."
              );
              return 0;
            }
            return prev - 1;
          });
        }

        // 2. Tick each of the custom concurrent timers
        setCookTimers((prevTimers) => {
          let modified = false;
          const nextTimers = prevTimers.map((timer) => {
            if (timer.isActive && timer.secondsLeft > 0) {
              modified = true;
              const nextLeft = timer.secondsLeft - 1;
              const isDone = nextLeft <= 0;
              const nextActive = !isDone;

              if (isDone) {
                // Completed! Raise notification
                DispatchCulinaryNotification(
                  `Culinary Step Done: ${timer.label}`,
                  "Your active cooking interval has finished. Acknowledge soon!"
                );
              }

              return {
                ...timer,
                secondsLeft: nextLeft,
                isActive: nextActive,
                isCompleted: isDone ? true : timer.isCompleted
              };
            }
            return timer;
          });
          return modified ? nextTimers : prevTimers;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsActive, cookTimers, selectedRecipe]);

  // Rotation of gourmet loading messages in generator to make it engaging!
  useEffect(() => {
    if (!isGeneratingRecipe) return;

    const messages = [
      "Chef Waqas is grinding premium black pepper & whole cardamoms...",
      "Preheating our virtual tawa griddle to blazing hot temperatures...",
      "Simmering tender meat inside an iron kadai with organic ghee...",
      "Gathering our royal saffron milk infusion and fresh mint herbs...",
      "Slowly steaming the dynamic base layers on mild hickory coal...",
      "Applying final touches in the recipe script book..."
    ];

    setGenerationStepMessage(messages[0]);
    let index = 1;
    const interval = setInterval(() => {
      setGenerationStepMessage(messages[index % messages.length]);
      index++;
    }, 4500);

    return () => clearInterval(interval);
  }, [isGeneratingRecipe]);

  // --- ACTIONS ---

  const handleScheduleMeal = async () => {
    if (!selectedRecipe) return;
    if (!calendarDateTime) {
      setCalendarError("Please select a date and time for your cooking session.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setCalendarError("Authentication token is missing. Please sign in or authorize calendar permission.");
      return;
    }

    setIsScheduling(true);
    setCalendarError(null);
    setCalendarSuccessEvent(null);

    try {
      const response = await scheduleMealOnGoogleCalendar({
        recipe: selectedRecipe,
        dateTime: calendarDateTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        guests: calendarGuests
      }, token);

      setCalendarSuccessEvent(response);
    } catch (err: any) {
      setCalendarError(err.message || "An unexpected error occurred while scheduling.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleToggleBookmark = async (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    const recipeId = recipe.id || recipe.recipeName;
    const isBookmarked = bookmarks.includes(recipeId);
    let updatedBookmarks: string[];

    if (isBookmarked) {
      updatedBookmarks = bookmarks.filter((id) => id !== recipeId);
    } else {
      updatedBookmarks = [...bookmarks, recipeId];
    }

    setBookmarks(updatedBookmarks);

    if (user) {
      const docPath = `users/${user.uid}/bookmarks/${recipeId}`;
      try {
        if (isBookmarked) {
          await deleteDoc(doc(db, docPath));
        } else {
          await setDoc(doc(db, docPath), {
            recipeId: recipeId,
            savedAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, isBookmarked ? OperationType.DELETE : OperationType.WRITE, docPath);
      }
    }
  };

  const handleOpenRecipeDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setCheckedIngredients({});
    setCompletedSteps({});
    setTimerCompletedAlert(false);

    // Auto load total cooking time into the kitchen timer configuration
    const totalTime = recipe.prepTime + recipe.cookTime;
    const seconds = totalTime * 60;
    setTimerDuration(seconds);
    setTimerSecondsLeft(seconds);
    setTimerIsActive(false);
    setCustomMinutesInput(String(totalTime));
  };

  const handleStartPresetCookingTimer = (minutes: number) => {
    const seconds = minutes * 60;
    setTimerDuration(seconds);
    setTimerSecondsLeft(seconds);
    setTimerCompletedAlert(false);
    setTimerIsActive(true);
  };

  const handleCustomTimerAssign = () => {
    const mins = parseFloat(customMinutesInput);
    if (!isNaN(mins) && mins > 0) {
      const seconds = Math.floor(mins * 60);
      setTimerDuration(seconds);
      setTimerSecondsLeft(seconds);
      setTimerCompletedAlert(false);
      setTimerIsActive(true);
    }
  };

  const toggleTimerState = () => {
    setTimerIsActive(!timerIsActive);
  };

  const resetTimerState = () => {
    setTimerIsActive(false);
    setTimerSecondsLeft(timerDuration);
    setTimerCompletedAlert(false);
  };

  // Helper to request notification permission
  const handleRequestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationPermission(res);
      } catch (err) {
        console.warn("Could not retrieve notification permissions:", err);
      }
    }
  };

  // Helper to extract duration mentions from a step's text
  const parseMinutesFromStepText = (stepText: string): number | null => {
    // Check for "X to Y minutes", "X-Y min", "X minutes", "X min"
    const regexRange = /(\d+)\s*(?:-|to)\s*(\d+)\s*(?:min|minute)s?/i;
    const matchRange = stepText.match(regexRange);
    if (matchRange) {
      const maxMins = parseInt(matchRange[2], 10);
      return !isNaN(maxMins) && maxMins > 0 ? maxMins : null;
    }

    const regexSingle = /(\d+)\s*(?:min|minute)s?/i;
    const matchSingle = stepText.match(regexSingle);
    if (matchSingle) {
      const mins = parseInt(matchSingle[1], 10);
      return !isNaN(mins) && mins > 0 ? mins : null;
    }

    return null;
  };

  // Create a custom running timer
  const handleCreateCustomTimer = (label: string, minutes: number, stepIndex?: number) => {
    if (!label.trim()) {
      label = "Custom Kitchen Interval";
    }
    const secs = Math.floor(minutes * 60);
    if (secs <= 0) return;

    const newTimer: ActiveKitchenTimer = {
      id: `${Date.now()}-${Math.random()}`,
      label: label.trim(),
      duration: secs,
      secondsLeft: secs,
      isActive: true,
      isCompleted: false,
      recipeName: selectedRecipe?.recipeName,
      stepIndex
    };

    setCookTimers((prev) => [newTimer, ...prev]);
  };

  // Toggle active/paused status of a specific custom timer
  const handleToggleCustomTimer = (id: string) => {
    setCookTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isActive: !t.isActive } : t))
    );
  };

  // Reset a custom timer back to its initial duration
  const handleResetCustomTimer = (id: string) => {
    setCookTimers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, secondsLeft: t.duration, isActive: false, isCompleted: false } : t
      )
    );
  };

  // Remove a custom timer
  const handleDeleteCustomTimer = (id: string) => {
    setCookTimers((prev) => prev.filter((t) => t.id !== id));
  };


  // Ingredient list handlers for generator
  const handleAddIngredient = () => {
    const clean = currentIngredientInput.trim();
    if (clean && !inventoryIngredients.some(i => i.toLowerCase() === clean.toLowerCase())) {
      setInventoryIngredients([...inventoryIngredients, clean]);
      setCurrentIngredientInput("");
    }
  };

  const handleTogglePopularIngredient = (ingredient: string) => {
    if (inventoryIngredients.some(i => i.toLowerCase() === ingredient.toLowerCase())) {
      setInventoryIngredients(inventoryIngredients.filter(i => i.toLowerCase() !== ingredient.toLowerCase()));
    } else {
      setInventoryIngredients([...inventoryIngredients, ingredient]);
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setInventoryIngredients(inventoryIngredients.filter((_, idx) => idx !== index));
  };

  // Generate Recipe via API
  const handleGenerateRecipe = async () => {
    if (inventoryIngredients.length === 0) {
      alert("Please add or select at least one ingredient before cooking!");
      return;
    }

    try {
      setIsGeneratingRecipe(true);
      setError(null);

      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: inventoryIngredients,
          dietType: generatorDiet === "None" ? "" : generatorDiet,
          cookingTime: generatorTime,
          difficulty: generatorDifficulty,
          customPrompt: generatorPrompt
        })
      });

      const data = await response.json();
      if (data.success && data.recipe) {
        const uniqueId = `ai_${Date.now()}`;
        const finalRecipe: Recipe = {
          ...data.recipe,
          id: uniqueId,
          isCustom: true
        };

        // Add to our list & custom list
        setCustomRecipes(prev => [finalRecipe, ...prev]);

        // Sync to Firestore if authenticated
        if (user) {
          const docPath = `users/${user.uid}/custom_recipes/${uniqueId}`;
          try {
            await setDoc(doc(db, docPath), {
              recipeName: finalRecipe.recipeName,
              description: finalRecipe.description,
              prepTime: finalRecipe.prepTime,
              cookTime: finalRecipe.cookTime,
              servings: finalRecipe.servings || 2,
              difficulty: finalRecipe.difficulty || "Medium",
              course: finalRecipe.course || "Mains",
              ingredients: finalRecipe.ingredients || [],
              steps: finalRecipe.steps || [],
              chefTricks: finalRecipe.chefTricks || [],
              isCustom: true,
              savedAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, docPath);
          }
        }
        
        // Auto open this magnificent recipe!
        handleOpenRecipeDetails(finalRecipe);
        
        // Clear draft inputs
        setGeneratorPrompt("");
      } else {
        throw new Error(data.error || "Generation error.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Chef Waqas had to briefly adjust the flame. Please try generating again!");
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  // Chat with Chef Waqas
  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend) return;

    if (!presetText) {
      setChatInput("");
    }

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const currentContext = [...chatMessages, userMsg];
    setChatMessages(currentContext);
    setIsChefThinking(true);

    // Sync User Message to Firestore
    if (user) {
      const userMsgPath = `users/${user.uid}/chat_history/${userMsg.id}`;
      try {
        await setDoc(doc(db, userMsgPath), {
          id: userMsg.id,
          role: userMsg.role,
          content: userMsg.content,
          timestamp: userMsg.timestamp,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userMsgPath);
      }
    }

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Simplify messages history to role/content pairs for the backend
          messages: currentContext.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();
      if (data.success && data.response) {
        const chefMsg: ChatMessage = {
          id: `msg_chef_${Date.now()}`,
          role: "model",
          content: data.response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, chefMsg]);

        // Sync Chef Message to Firestore
        if (user) {
          const chefMsgPath = `users/${user.uid}/chat_history/${chefMsg.id}`;
          try {
            await setDoc(doc(db, chefMsgPath), {
              id: chefMsg.id,
              role: chefMsg.role,
              content: chefMsg.content,
              timestamp: chefMsg.timestamp,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, chefMsgPath);
          }
        }
      } else {
        throw new Error(data.error || "Chef is highly occupied with the hot tandoor.");
      }
    } catch (err: any) {
      console.error("Chef Chat Error:", err);
      const errMsg: ChatMessage = {
        id: `msg_chef_err_${Date.now()}`,
        role: "model",
        content: "Oh, forgive me, my friend! I was rotating the skewers over the intense coals and lost track. Could you say that again? I am listening closely.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, errMsg]);

      // Sync Error Message to Firestore so sync matches
      if (user) {
        const errMsgPath = `users/${user.uid}/chat_history/${errMsg.id}`;
        try {
          await setDoc(doc(db, errMsgPath), {
            id: errMsg.id,
            role: errMsg.role,
            content: errMsg.content,
            timestamp: errMsg.timestamp,
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          handleFirestoreError(dbErr, OperationType.WRITE, errMsgPath);
        }
      }
    } finally {
      setIsChefThinking(false);
    }
  };

  const handleDeleteCustomRecipe = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to discard this custom AI recipe from your book?")) {
      setCustomRecipes(customRecipes.filter(r => r.id !== recipeId));
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
      }

      // Sync deletion to Firestore
      if (user) {
        const docPath = `users/${user.uid}/custom_recipes/${recipeId}`;
        try {
          await deleteDoc(doc(db, docPath));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, docPath);
        }
      }
    }
  };

  const handleClearAllChatHistory = async () => {
    if (confirm("Would you like to clear our culinary conversation history?")) {
      const initialMsg: ChatMessage = {
        id: "msg_init",
        role: "model",
        content: "Assalamu Alaikum! My stove is warm and ready. What shall we simmer up together today, home chef?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([initialMsg]);

      // Clear from Firestore
      if (user) {
        const chatPath = `users/${user.uid}/chat_history`;
        try {
          const snap = await getDocs(collection(db, chatPath));
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            batch.delete(d.ref);
          });

          // re-insert default message
          const mDocRef = doc(db, chatPath, initialMsg.id);
          batch.set(mDocRef, {
            id: initialMsg.id,
            role: initialMsg.role,
            content: initialMsg.content,
            timestamp: initialMsg.timestamp,
            createdAt: serverTimestamp()
          });

          await batch.commit();
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, chatPath);
        }
      }
    }
  };

  // --- QUERY PROCESSING ---
  // Combine native signature recipes and custom generated ones
  const allAvailableRecipes = [...customRecipes, ...recipes];

  const processedRecipes = allAvailableRecipes.filter((recipe) => {
    const matchesSearch =
      recipe.recipeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some((ing) => ing.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCourse =
      selectedCourse === "All" || recipe.course.toLowerCase() === selectedCourse.toLowerCase();

    const matchesDifficulty =
      selectedDifficulty === "All" || recipe.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();

    const matchesBookmark =
      !showOnlyBookmarks || bookmarks.includes(recipe.id || recipe.recipeName);

    return matchesSearch && matchesCourse && matchesDifficulty && matchesBookmark;
  });

  // Time formatting helper
  const formatTimerLabel = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="chef-waqas-app" className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col relative antialiased selection:bg-amber-100 selection:text-amber-900">
      
      {/* BACKGROUND GRAPHIC ACCENTS */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-stone-200/50 via-stone-50/20 to-transparent pointer-events-none" />

      {/* TOP HEADER PLATFORM */}
      <header className="sticky top-0 z-40 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Brand Column */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl border border-amber-400/60 overflow-hidden shadow-md">
              <img 
                src={chefWaqasImg} 
                className="w-full h-full object-cover" 
                alt="Chef Waqas Logo"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border border-stone-950 shadow-xs" title="Chef Waqas is active online!" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight font-serif text-white">
                  Chef Waqas
                </h1>
                <span className="hidden sm:inline-block text-[11px] uppercase tracking-wider font-extrabold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                  Royal Recipes
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium">Authentic Mughlai & East-West Fusion Cooking</p>
            </div>
          </div>

          {/* Quick Stats or Chat Button */}
          <div className="flex items-center gap-3">
            
            {/* Firebase Custom Authentication Portal */}
            <div className="flex items-center border border-stone-800 bg-stone-950/40 rounded-2xl p-1 gap-2">
              {authLoading ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-xs text-stone-400 font-bold hidden md:inline">Loading Pantry...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-2 px-2 py-1">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || "User Avatar"} 
                      className="w-7 h-7 rounded-lg border border-amber-400/40 object-cover shadow-xs"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-amber-500/10 text-amber-300 font-bold text-xs ring-1 ring-amber-400/20 rounded-lg flex items-center justify-center">
                      {(user.displayName || user.email || "C").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden md:flex flex-col">
                    <span className="text-[11px] font-bold text-white max-w-[100px] truncate leading-tight">
                      {user.displayName || "Home Artisan"}
                    </span>
                    <span className="text-[9px] font-semibold text-amber-300 flex items-center gap-0.5">
                      {syncingCloud ? (
                        <>
                          <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-400 shrink-0" />
                          Syncing
                        </>
                      ) : (
                        <>
                          <Cloud className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                          Cloud Synced
                        </>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={logoutUser}
                    className="ml-1 p-1 bg-stone-900 border border-stone-800 text-stone-400 hover:text-rose-400 hover:border-rose-950/20 hover:bg-rose-950/20 rounded-lg transition-all"
                    title="Logout from Pantry Sync"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-amber-400/10 hover:text-amber-300 rounded-xl text-xs font-bold text-stone-300 transition-all group"
                  title="Enable cloud sync for bookmarks and custom recipes"
                >
                  <Cloud className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-400" />
                  <span className="hidden sm:inline">Cloud Backup</span>
                </button>
              )}
            </div>

            <button
              id="chat-toggle-btn"
              onClick={() => setChatOpen(!chatOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 ${
                chatOpen 
                  ? "bg-amber-500 text-stone-950 shadow-inner scale-95" 
                  : "bg-stone-800 border border-stone-700 text-stone-200 hover:bg-stone-700 hover:border-stone-600"
              }`}
            >
              <div className="relative">
                <MessageSquare className="w-4 h-4" />
                {!chatOpen && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                )}
              </div>
              <span className="hidden sm:inline">Consult Chef</span>
              <span className="inline sm:hidden">Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE WEB CONTENT AREA */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: FILTERS, AI LAB AND RECIPES (70% width) */}
        <div className="flex-grow lg:w-2/3 flex flex-col gap-8">
          
          {/* BANNER PROMO */}
          <section className="bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 rounded-3xl p-6 sm:p-8 text-stone-200 border border-stone-800 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500 via-stone-900 to-transparent" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="max-w-2xl flex-grow">
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-400/10 font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border border-amber-400/20 mb-3.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  THE ROYAL SPICE DIARIES
                </span>
                <h2 className="text-2xl sm:text-3.5xl font-black font-serif text-white tracking-tight leading-tight">
                  "Spices represent stories; cooking is absolute devotion."
                </h2>
                <p className="text-stone-400 text-sm mt-3 leading-relaxed">
                  Welcome, home artisan. Here I present my heirloom culinary formulas, paired with my state-of-the-art **AI Magic Kitchen**. Put whatever is in your drawers into the lab below, and I will instantly design custom royal recipes for you!
                </p>
                {!user && !authLoading && (
                  <button
                    onClick={signInWithGoogle}
                    className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black tracking-wide uppercase px-4.5 py-2.5 rounded-xl transition-all hover:scale-102 hover:shadow-lg active:scale-98 duration-150 cursor-pointer"
                  >
                    <Cloud className="w-4 h-4 fill-stone-950" />
                    Connect Cloud & Sync Your Recipes
                  </button>
                )}
              </div>
              
              {/* Chef Waqas Welcome Screen Picture */}
              <div className="relative w-32 h-32 md:w-36 md:h-36 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-lg bg-stone-900">
                <img 
                  src={chefWaqasImg} 
                  alt="Chef Waqas Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-stone-950/90 px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-[9px] font-black text-emerald-400 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                  LIVE
                </div>
              </div>
            </div>
          </section>

          {/* CHOPPING BOARD DIRECTORY: THE AI RECIPE GENERATOR LAB */}
          <section id="ai-generator-lab" className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-8 relative">
            <div className="absolute top-0 left-6 right-6 h-1.5 bg-amber-500 rounded-b-md" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 font-serif flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-spin-slow" />
                  Mughlai AI Recipe Lab
                </h2>
                <p className="text-xs text-stone-500 font-medium">Input your current ingredients for unique, masterfully customized recipes</p>
              </div>
              <div className="text-xs font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full self-start">
                Powered by Gemini-3.5-Flash
              </div>
            </div>

            {/* Error banner inside Lab */}
            {error && error.includes("flame") && (
              <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl flex items-start gap-2.5 text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            <div className="space-y-6">
              
              {/* Ingredient Selector & Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 tracking-wider uppercase mb-2">
                  My Available Ingredients Or Proteins <span className="text-rose-500">*</span>
                </label>
                
                {/* Visual Pill List */}
                <div className="flex flex-wrap gap-2 mb-3 bg-stone-50 p-4 border border-stone-200/65 rounded-2xl min-h-[50px]">
                  {inventoryIngredients.length === 0 ? (
                    <span className="text-xs text-stone-400 italic">No ingredients added yet. Set your stock below!</span>
                  ) : (
                    inventoryIngredients.map((ing, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 text-amber-900 px-3 py-1 rounded-full text-xs font-bold shadow-2xs hover:bg-rose-50 hover:border-rose-200 hover:text-rose-800 transition-colors duration-150 group">
                        {ing}
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="text-stone-400 group-hover:text-rose-600 font-bold transition-colors"
                          title="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Adding Tool */}
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <input
                      type="text"
                      placeholder="Add raw ingredient (e.g., mutton, okra, fennel, paneer)..."
                      className="w-full bg-stone-50 text-stone-900 border border-stone-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-stone-400"
                      value={currentIngredientInput}
                      onChange={(e) => setCurrentIngredientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddIngredient();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-4 rounded-xl text-sm flex items-center gap-1.5 border border-stone-950 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {/* Pre-populated standard items for quick addition */}
                <div className="mt-3">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest block mb-1.5">Chef's Suggested Base Ingredients:</span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                    {popularIngredients.map((item) => {
                      const isSelected = inventoryIngredients.some(i => i.toLowerCase() === item.toLowerCase());
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleTogglePopularIngredient(item)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-all duration-150 font-medium ${
                            isSelected
                              ? "bg-amber-500 border-amber-600 text-stone-950 font-semibold"
                              : "bg-stone-50 text-stone-600 hover:bg-stone-100 hover:text-stone-900 border-stone-250"
                          }`}
                        >
                          {isSelected ? `✓ ${item}` : `+ ${item}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Grid of Advanced Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Diet Preferences */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 tracking-wider uppercase mb-1.5">
                    Dietary Requirements
                  </label>
                  <select
                    className="w-full bg-stone-50 text-stone-900 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    value={generatorDiet}
                    onChange={(e) => setGeneratorDiet(e.target.value)}
                  >
                    <option value="None">No Restrictive Plan</option>
                    <option value="Halal">Halal Verified</option>
                    <option value="Vegetarian">Strict Vegetarian</option>
                    <option value="Gluten-Free">Gluten-Free Flour / Grains</option>
                    <option value="Vegan">Vegan (Plant-Based)</option>
                  </select>
                </div>

                {/* Recipe Cooking Difficulty */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 tracking-wider uppercase mb-1.5">
                    Target Difficulty
                  </label>
                  <div className="flex gap-1 h-9.5">
                    {["Easy", "Medium", "Hard"].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setGeneratorDifficulty(diff)}
                        className={`flex-1 text-xs font-bold rounded-xl border transition-all duration-150 ${
                          generatorDifficulty === diff
                            ? "bg-stone-900 border-stone-950 text-white shadow-xs"
                            : "bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ready Time limitation */}
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 tracking-wider uppercase mb-1.5">
                    Maximum Ready Time
                  </label>
                  <select
                    className="w-full bg-stone-50 text-stone-900 border border-stone-300 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    value={generatorTime}
                    onChange={(e) => setGeneratorTime(e.target.value)}
                  >
                    <option value="15">Under 15 Minutes</option>
                    <option value="30">Under 30 Minutes</option>
                    <option value="60">Under 60 Minutes</option>
                    <option value="120">Slow Cook (120+ Mins)</option>
                  </select>
                </div>
              </div>

              {/* Custom Wishes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 tracking-wider uppercase mb-1.5">
                  Chef's Styling Request (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Incredibly spicy, lots of cardamoms, fusion taco format, make it sweet, etc..."
                  className="w-full bg-stone-50 text-stone-900 border border-stone-300 rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none transition-all placeholder:text-stone-400"
                  value={generatorPrompt}
                  onChange={(e) => setGeneratorPrompt(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                id="generate-recipe-submit-btn"
                onClick={handleGenerateRecipe}
                disabled={isGeneratingRecipe}
                className="w-full h-14 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-stone-950 font-black tracking-wide rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              >
                {isGeneratingRecipe ? (
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
                    <span>{generationStepMessage}</span>
                  </span>
                ) : (
                  <>
                    <Flame className="w-5 h-5 fill-stone-950" />
                    <span>Simmer Chef Waqas' Custom Formula</span>
                  </>
                )}
              </button>
            </div>
          </section>

          {/* MAIN BROWSER / FILTER SECTION */}
          <div id="recipe-browser-section" className="space-y-6">
            
            {/* Filter Hub Toolbar */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 flex flex-col gap-4">
              
              {/* Row 1: Search & Bookmarks checkbox */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Search by name, spices, or main ingredients..."
                    className="w-full bg-stone-50 text-stone-900 border border-stone-300 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="bookmark-only-filter-btn"
                    onClick={() => setShowOnlyBookmarks(!showOnlyBookmarks)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                      showOnlyBookmarks
                        ? "bg-rose-50 border-rose-200 text-rose-800"
                        : "bg-stone-50 border-stone-300 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${showOnlyBookmarks ? "fill-rose-600 text-rose-600" : ""}`} />
                    <span>Bookmarks ({bookmarks.length})</span>
                  </button>

                  {(searchQuery || selectedCourse !== "All" || selectedDifficulty !== "All" || showOnlyBookmarks) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCourse("All");
                        setSelectedDifficulty("All");
                        setShowOnlyBookmarks(false);
                      }}
                      className="text-stone-400 hover:text-amber-800 text-xs font-bold px-2 py-1 transition-colors"
                      title="Reset all search parameters"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Row 2: Course categories pills */}
              <div className="flex flex-col gap-2 pt-2 border-t border-stone-100">
                <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">Culinary Course</span>
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Mains", "Appetizer", "Breads", "Dessert"].map((course) => (
                    <button
                      key={course}
                      onClick={() => setSelectedCourse(course)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        selectedCourse === course
                          ? "bg-amber-500 text-stone-950 shadow-sm"
                          : "bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-250"
                      }`}
                    >
                      {course}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Difficulty categories pills */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase">Cooking Level</span>
                <div className="flex flex-wrap gap-1.5">
                  {["All", "Easy", "Medium", "Hard"].map((difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => setSelectedDifficulty(difficulty)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedDifficulty === difficulty
                          ? "bg-stone-900 text-white"
                          : "bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200"
                      }`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recipes Grid */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-4 px-1">
                <h3 className="text-sm font-bold text-stone-500 uppercase tracking-widest">
                  Showing {processedRecipes.length} Authentic Recipes
                </h3>
                {customRecipes.length > 0 && (
                  <span className="text-xs font-semibold text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-100">
                    Includes {customRecipes.length} Custom Selections
                  </span>
                )}
              </div>

              {loading ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
                  <span className="text-stone-500 text-sm font-medium">Downloading Chief Waqas' grand index recipe file...</span>
                </div>
              ) : processedRecipes.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">
                  <Utensils className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-800 font-bold">No recipes matched your search criteria.</p>
                  <p className="text-xs text-stone-500 mt-2">Try adjusting your filters, searching for simple spices, or trigger Chef Waqas' AI customized generator above!</p>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCourse("All");
                      setSelectedDifficulty("All");
                      setShowOnlyBookmarks(false);
                    }}
                    className="mt-4 px-4 py-2 bg-stone-900 text-white font-bold text-xs rounded-xl"
                  >
                    Reset Active Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {processedRecipes.map((recipe) => (
                    <div key={recipe.id || recipe.recipeName} className="relative">
                      
                      {/* Delete option for custom AI generated recipes */}
                      {recipe.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustomRecipe(e, recipe.id!)}
                          className="absolute top-14 right-3 z-20 p-1.5 bg-white border border-stone-200 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 rounded-lg text-stone-400 shadow-sm transition-colors"
                          title="Discard recipe from book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <RecipeCard
                        recipe={recipe}
                        onView={handleOpenRecipeDetails}
                        isFavorited={bookmarks.includes(recipe.id || recipe.recipeName)}
                        onToggleFavorite={handleToggleBookmark}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PERSISTENT CHEF COMPANION CHAT ON LARGE SCREENS (30% width) */}
        {/* On smaller screens, the user can toggle this with floating button/header */}
        <div className={`lg:w-1/3 shrink-0 lg:block ${chatOpen ? "block fixed inset-0 lg:sticky lg:top-24 lg:h-[calc(100vh-130px)] z-50 bg-stone-900/50 backdrop-blur-xs flex justify-end" : "hidden"}`}>
          
          {/* Chat Container Box */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md lg:max-w-none h-full bg-white border-l border-stone-200 lg:border border-stone-200 lg:rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="bg-stone-900 p-4 border-b border-stone-800 flex items-center justify-between text-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-500/50 shadow-xs">
                  <img 
                    src={chefWaqasImg} 
                    alt="Chef Waqas Companion" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Chef Waqas Companion</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Kitchen Advisor</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearAllChatHistory}
                  className="p-1 px-2 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs rounded transition-colors"
                  title="Clear conversation history"
                >
                  Reset
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="lg:hidden p-1 hover:bg-stone-800 text-stone-400 rounded transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-stone-50">
              
              <div className="bg-amber-500/10 border border-amber-500/20 text-stone-800 p-3.5 rounded-2xl text-xs flex gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 animate-pulse" />
                <p>
                  Need gourmet guidelines? Ask me about cooking temperatures, substitute properties, deep spices, or how to rescue a flat broth!
                </p>
              </div>

              {chatMessages.map((msg) => {
                const isChef = msg.role === "model";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2 rounded-xl p-0.5 ${isChef ? "flex-row" : "flex-row-reverse"} items-start`}
                  >
                    {isChef ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/50 shrink-0 shadow-xs mt-1 bg-stone-100">
                        <img 
                          src={chefWaqasImg} 
                          alt="Chef Waqas Profile" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-300 border border-stone-200 flex items-center justify-center font-bold text-[10px] text-stone-700 uppercase tracking-wider shrink-0 mt-1">
                        Me
                      </div>
                    )}

                    <div className="flex-grow flex flex-col space-y-1">
                      {/* Speaker name */}
                      <span className={`text-[10px] font-bold text-stone-400 tracking-wider ${isChef ? "text-left" : "text-right"}`}>
                        {isChef ? "CHEF WAQAS" : "YOU"} &bull; {msg.timestamp}
                      </span>
                      
                      {/* Message Bubble */}
                      <div
                        className={`max-w-[90%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                          isChef
                            ? "bg-white text-stone-900 border border-stone-250 rounded-tl-none shadow-xs self-start"
                            : "bg-amber-500 text-stone-950 font-medium rounded-tr-none shadow-xs ml-auto"
                        }`}
                      >
                        {/* Formatted inline markdown replacement */}
                        <p className="whitespace-pre-line break-words">
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isChefThinking && (
                <div className="flex gap-2 items-start">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-500/50 shrink-0 shadow-xs mt-1 bg-stone-100">
                    <img 
                      src={chefWaqasImg} 
                      alt="Chef Waqas Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-grow flex flex-col space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 tracking-wider">CHEF WAQAS is typing...</span>
                    <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center gap-1.5 self-start">
                      <span className="w-2.5 h-2.5 bg-stone-400 rounded-full animate-bounce" />
                      <span className="w-2.5 h-2.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2.5 h-2.5 bg-stone-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestions Buttons */}
            <div className="p-3 bg-white border-t border-stone-100 flex flex-col gap-1 shrink-0">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pl-1.5 mb-1">Quick Cook topics:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(q)}
                    disabled={isChefThinking}
                    className="text-xs bg-stone-50 hover:bg-amber-50 text-stone-700 hover:text-amber-900 hover:border-amber-300 font-semibold border border-stone-200 py-1.5 px-3.5 rounded-full transition-all shrink-0 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="p-4 bg-white border-t border-stone-200 flex gap-2 shrink-0 items-center"
            >
              <input
                type="text"
                placeholder="Ask Chef Waqas..."
                className="flex-grow bg-stone-50 text-stone-950 border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChefThinking}
              />
              <button
                type="submit"
                disabled={isChefThinking || !chatInput.trim()}
                className="w-10 h-10 bg-stone-900 hover:bg-stone-800 text-white rounded-xl flex items-center justify-center transition-all shrink-0 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* DETAILED RECIPE OVERVIEW DIALOG (MODAL) */}
      {selectedRecipe && (
        <div id="recipe-detail-dialog-overlay" className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div
            id="recipe-detail-dialog"
            className="bg-white text-stone-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual top border */}
            <div className="h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 block shrink-0" />

            {/* Modal Navigation/Stats header bar */}
            <div className="bg-stone-55 p-5 border-b border-stone-100 flex items-center justify-between shrink-0">
              <span className="text-[11px] font-black uppercase text-amber-800 tracking-widest bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-100 flex items-center gap-1">
                {selectedRecipe.isCustom ? <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> : <Flame className="w-3.5 h-3.5 text-amber-600" />}
                {selectedRecipe.course} RECIPE
              </span>
              <button
                id="recipe-dialog-close-btn"
                onClick={() => setSelectedRecipe(null)}
                className="p-1 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 hover:text-stone-950 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-stone-200"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-8">
              
              {/* Recipe Intro Header layout */}
              <div>
                <h2 className="text-2.5xl sm:text-3.5xl font-serif font-black text-stone-950 leading-tight">
                  {selectedRecipe.recipeName}
                </h2>
                <p className={`italic text-sm mt-3 border-l-3 pl-4 leading-relaxed transition-all duration-300 ${
                  narratingSection === "info"
                    ? "border-amber-500 bg-amber-50/70 text-amber-950 py-2 pr-2 rounded-r-2xl shadow-3xs scale-[1.01]"
                    : "text-stone-600 border-amber-400"
                }`}>
                  "{selectedRecipe.description}"
                </p>
                
                {/* Stats cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider">Prep Time</span>
                    <span className="text-base font-black text-stone-900">{selectedRecipe.prepTime} Mins</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider">Cook Time</span>
                    <span className="text-base font-black text-stone-900">{selectedRecipe.cookTime} Mins</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider">Difficulty</span>
                    <span className="text-base font-black text-stone-900">{selectedRecipe.difficulty}</span>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                    <span className="block text-[10px] uppercase font-bold text-stone-500 tracking-wider">Portion Serves</span>
                    <span className="text-base font-black text-stone-900">{selectedRecipe.servings} Plate(s)</span>
                  </div>
                </div>

                {/* COOK-ALONG ACCESS spotlight */}
                <div id="cook-along-spotlight" className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-amber-600/10 border border-amber-500/20 rounded-2.5xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-amber-500 text-stone-950 rounded-2xl shadow-md shrink-0">
                      <Flame className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-serif font-black text-stone-950 text-base flex items-center gap-1.5 leading-snug">
                        Ready to Cook? Live Guide Active!
                        <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded tracking-wider">NEW</span>
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed mt-0.5">Let me guide you step-by-step with automated check-lists & live vocal counts!</p>
                    </div>
                  </div>
                  <button
                    id="start-cook-along-btn"
                    onClick={() => setCookAlongActive(true)}
                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black text-xs uppercase tracking-widest rounded-xl transition duration-150 hover:scale-102 hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-stone-950" />
                    Start Cook-Along
                  </button>
                </div>
              </div>

              {/* VOCAL TEXT-TO-SPEECH RECIPE NARRATOR */}
              <RecipeNarrator 
                recipe={selectedRecipe} 
                onHighlightUpdate={(section, index) => {
                  setNarratingSection(section);
                  setNarratingIndex(index);
                }} 
              />

              {/* GOOGLE CALENDAR SCHEDULING WIDGET */}
              <div id="google-calendar-scheduler" className="bg-stone-50 border border-stone-200/80 rounded-2.5xl p-5 sm:p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                    <Calendar className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-serif font-black text-stone-900 text-base leading-snug">
                      Schedule cooking with Chef Waqas
                    </h4>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Sync this recipe directly to your Google Calendar as a detailed cooking session, including ingredient shopping lists and secret tips!
                    </p>
                  </div>
                </div>

                {calendarSuccessEvent ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 space-y-3 animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">✓</div>
                      <div>
                        <h5 className="font-bold text-stone-900 text-sm">Heirloom Recipe Scheduled Successfully!</h5>
                        <p className="text-xs text-stone-600 mt-1">
                          "<strong>{calendarSuccessEvent.summary}</strong>" is now synced with your main Google Calendar.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <a
                        href={calendarSuccessEvent.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition duration-150 cursor-pointer shadow-3xs"
                      >
                        Open Google Calendar ↗
                      </a>
                      <button
                        onClick={() => {
                          setCalendarSuccessEvent(null);
                        }}
                        className="px-3 py-2 bg-stone-200/80 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition duration-150 cursor-pointer"
                      >
                        Schedule Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {calendarError && (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-800 font-medium leading-relaxed flex items-start gap-2 animate-fade-in">
                        <span className="shrink-0 text-base select-none leading-none">&#9888;</span>
                        <div className="space-y-1">
                          <p className="font-bold">Culinary sync error</p>
                          <p>{calendarError}</p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Date Time Picker */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs uppercase font-extrabold text-stone-500 tracking-wider">
                          Select Cooking Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={calendarDateTime}
                          onChange={(e) => setCalendarDateTime(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-200 hover:border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-800 text-sm rounded-xl outline-hidden font-medium transition duration-150"
                        />
                      </div>

                      {/* Guest Invites */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] sm:text-xs uppercase font-extrabold text-stone-500 tracking-wider">
                          Invite Guests (Emails, comma separated)
                        </label>
                        <input
                          type="text"
                          value={calendarGuests}
                          onChange={(e) => setCalendarGuests(e.target.value)}
                          placeholder="spouse@google.com, friend@example.com"
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-200 hover:border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-stone-800 text-sm rounded-xl outline-hidden transition duration-150"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
                      {!user ? (
                        <>
                          <p className="text-xs text-stone-500 font-medium leading-relaxed text-center sm:text-left">
                            Please log in with Google to authorize calendar access and schedule your meals.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setCalendarError(null);
                                await signInWithGoogle();
                              } catch (err: any) {
                                setCalendarError(err.message || "Google Authentication failed.");
                              }
                            }}
                            className="w-full sm:w-auto px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            Sign In with Google
                          </button>
                        </>
                      ) : !getAccessToken() ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse inline-block shrink-0" />
                            <p className="text-xs text-stone-600 font-medium leading-relaxed">
                              Calendar syncing requires refreshing permissions. Please authorize below.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                setCalendarError(null);
                                await signInWithGoogle();
                              } catch (err: any) {
                                setCalendarError(err.message || "Google Authentication failed.");
                              }
                            }}
                            className="w-full sm:w-auto px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
                          >
                            Authorize Calendar
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-stone-600 text-xs font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            <span>Authenticated as {user.email}</span>
                          </div>
                          <button
                            type="button"
                            disabled={isScheduling}
                            onClick={handleScheduleMeal}
                            className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                          >
                            {isScheduling ? "Scheduling Session..." : "Schedule Session"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* INTEGRATED ACTIVE KITCHEN TIMER DISPLAY PANEL */}
              <div id="kitchen-timer-panel" className="bg-stone-900 text-white rounded-2.5xl p-5 border border-stone-800 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 bottom-0 top-0 w-1/4 opacity-10 bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-amber-500 via-stone-900 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-stone-800 text-amber-400 rounded-2xl border border-stone-700">
                      <Clock className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-wide text-amber-400 uppercase">Chef's Active Kitchen Timer</h4>
                      <p className="text-xs text-stone-400">Keep track of crucial Dum steam & Searing intervals during cooking</p>
                    </div>
                  </div>

                  {/* Digital Clock Display */}
                  <div className="flex flex-col items-center">
                    <span className={`font-mono text-3.5xl font-black ${timerCompletedAlert ? "text-rose-500 animate-bounce" : "text-white"}`}>
                      {formatTimerLabel(timerSecondsLeft)}
                    </span>
                    {timerCompletedAlert && (
                      <span className="text-[10px] uppercase font-extrabold text-red-400 tracking-widest bg-red-950/70 border border-red-500 px-2 py-0.5 mt-1 rounded">
                        ⌛ TIME COMPLETED!
                      </span>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={toggleTimerState}
                      className={`px-4 py-2 rounded-xl text-xs font-black tracking-wider uppercase flex items-center gap-1.5 transition ${
                        timerIsActive 
                          ? "bg-amber-500 text-stone-950 hover:bg-amber-600" 
                          : "bg-white hover:bg-stone-100 text-stone-950"
                      }`}
                    >
                      {timerIsActive ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-stone-950" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-stone-950" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={resetTimerState}
                      className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-xl text-xs font-bold border border-stone-700 transition"
                      title="Reset countdown back to duration"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Tiny dropdown to assign custom quick minutes for testing */}
                    <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl px-2 py-1 gap-1">
                      <input 
                        type="number"
                        className="w-8 bg-transparent text-white text-xs align-middle font-bold focus:outline-none text-center"
                        value={customMinutesInput}
                        onChange={(e) => setCustomMinutesInput(e.target.value)}
                        min="1"
                        max="180"
                      />
                      <span className="text-[10px] text-stone-400 uppercase font-black tracking-wide">m</span>
                      <button 
                        onClick={handleCustomTimerAssign}
                        className="bg-stone-700 hover:bg-stone-600 text-white font-extrabold px-1.5 py-0.5 rounded text-[10px]"
                        title="Set custom countdown minutes"
                      >
                        Set
                      </button>
                    </div>
                  </div>
                </div>

                {/* Quick select presets based on current recipe stages */}
                <div className="mt-4 pt-3 border-t border-stone-800/80 flex flex-wrap items-center gap-2 text-stone-300">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-stone-400">Quick Prep Presets:</span>
                  <button 
                    onClick={() => handleStartPresetCookingTimer(selectedRecipe.prepTime)} 
                    className="bg-stone-800 hover:bg-stone-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-stone-700 transition"
                  >
                    🔪 Prep ({selectedRecipe.prepTime}m)
                  </button>
                  <button 
                    onClick={() => handleStartPresetCookingTimer(selectedRecipe.cookTime)} 
                    className="bg-stone-800 hover:bg-stone-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg border border-stone-700 transition"
                  >
                    🔥 Cook ({selectedRecipe.cookTime}m)
                  </button>
                  <button 
                    onClick={() => handleStartPresetCookingTimer(10)} 
                    className="bg-stone-800 hover:bg-stone-700 text-xs text-amber-300 font-bold text-[10px] px-2.5 py-1 rounded-lg border border-stone-700 transition"
                  >
                    💨 Quick Steam (10m)
                  </button>
                </div>

                {/* Concurrent Timers Engine Section */}
                <div className="mt-4 pt-4 border-t border-stone-800/80 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Create Multi-Timer Form & Permission Banner */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400">Create Step/Task Timer</span>
                      
                      {/* Notification permission button */}
                      {notificationPermission === "default" ? (
                        <button
                          onClick={handleRequestNotificationPermission}
                          className="text-[10px] text-stone-300 hover:text-white underline font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          🔔 Enable Desktop Alerts
                        </button>
                      ) : notificationPermission === "granted" ? (
                        <span className="text-[9px] text-emerald-400 font-extrabold tracking-wide uppercase flex items-center gap-1 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded">
                          ● Alerts Synced
                        </span>
                      ) : (
                        <span className="text-[9px] text-amber-500 font-extrabold tracking-wide uppercase bg-stone-950/45 border border-stone-800 px-2 py-0.5 rounded">
                          🔕 Alerts Blocked
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                      <input
                        type="text"
                        placeholder="Name (e.g. Sautéing beef, Dum bubble)"
                        value={customTimerLabel}
                        onChange={(e) => setCustomTimerLabel(e.target.value)}
                        className="flex-grow bg-stone-800 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-stone-800 border border-stone-700 rounded-xl px-2 py-1 gap-1">
                          <input
                            type="number"
                            className="w-10 bg-transparent text-white text-xs font-bold focus:outline-none text-center"
                            value={customTimerMinutes}
                            onChange={(e) => setCustomTimerMinutes(e.target.value)}
                            min="1"
                            max="180"
                          />
                          <span className="text-[10px] text-stone-400 uppercase font-bold">m</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const mins = parseFloat(customTimerMinutes);
                            if (!isNaN(mins) && mins > 0) {
                              handleCreateCustomTimer(customTimerLabel || "Custom Step Interval", mins);
                              setCustomTimerLabel("");
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-4 py-2 uppercase rounded-xl tracking-wider shrink-0 duration-150 cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right: Active Multi-Timers Lists */}
                  <div className="space-y-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-stone-400 block mb-1">
                      Running Cooking Tasks ({cookTimers.length})
                    </span>
                    {cookTimers.length === 0 ? (
                      <div className="text-xs text-stone-500 italic py-2 border border-dashed border-stone-800 rounded-xl text-center">
                        No active item timers running. Initiate custom timers above or in the steps list!
                      </div>
                    ) : (
                      cookTimers.map((timer) => {
                        const percent = Math.max(0, Math.min(100, (timer.secondsLeft / timer.duration) * 100));
                        return (
                          <div key={timer.id} className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition duration-200 ${
                            timer.isCompleted 
                              ? "bg-rose-950/40 border-rose-900 text-rose-200" 
                              : "bg-stone-800/80 border-stone-700 text-stone-200"
                          }`}>
                            <div className="flex items-center justify-between text-xs font-semibold gap-2">
                              <span className="truncate pr-1 block font-medium">
                                {timer.isCompleted ? "⌛ " : "🔥 "} 
                                {timer.label}
                              </span>
                              <div className="flex items-center gap-2 font-mono shrink-0 font-bold">
                                <span className={timer.isCompleted ? "text-rose-400 animate-pulse text-xs animate-bounce" : "text-amber-400"}>
                                  {formatTimerLabel(timer.secondsLeft)}
                                </span>
                                {timer.isCompleted && <span className="text-[9px] bg-red-950/60 text-red-500 px-1 rounded animate-pulse">Done!</span>}
                              </div>
                            </div>

                            {/* Nice horizontal progress bar */}
                            <div className="w-full bg-stone-900 rounded-full h-1 relative overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  timer.isCompleted ? "bg-rose-500" : "bg-amber-400"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            {/* Timer control buttons */}
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-[9.5px] text-stone-400 font-mono scale-95 origin-left">
                                {Math.ceil(timer.duration / 60)}m preset
                              </span>
                              <div className="flex items-center gap-1.5">
                                {!timer.isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCustomTimer(timer.id)}
                                    className="p-1 hover:bg-stone-700 text-stone-300 hover:text-white rounded transition cursor-pointer"
                                    title={timer.isActive ? "Pause timer" : "Play timer"}
                                  >
                                    {timer.isActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleResetCustomTimer(timer.id)}
                                  className="p-1 hover:bg-stone-700 text-stone-300 hover:text-white rounded transition cursor-pointer"
                                  title="Reset to start time"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomTimer(timer.id)}
                                  className="p-1 hover:bg-stone-700 text-stone-300 hover:text-rose-400 rounded transition cursor-pointer"
                                  title="Dismiss timer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Two columns: Ingredients (left) & Cooking steps (right) */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                
                {/* Ingredients column (2/5 size) */}
                <div className="md:col-span-2 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 select-none">
                    <h3 className="font-bold text-stone-900 font-serif text-lg tracking-tight flex items-center gap-1.5">
                      <Utensils className="w-5 h-5 text-amber-500" />
                      Ingredients
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-stone-400">Toggle Checklist</span>
                  </div>
                  
                  <div className="flex flex-col gap-2.5">
                    {selectedRecipe.ingredients.map((ing, idx) => {
                      const isChecked = !!checkedIngredients[ing];
                      const ingImg = getIngredientImage(ing);
                      return (
                        <label
                          key={idx}
                          id={`ing-item-${idx}`}
                          className={`flex items-center gap-3.5 text-sm p-2.5 rounded-xl cursor-pointer transition border duration-300 ${
                            narratingSection === "ingredients" && narratingIndex === idx
                              ? "ring-2 ring-amber-500 bg-amber-50/70 border-amber-300 shadow-xs scale-[1.02] z-10"
                              : isChecked
                              ? "bg-stone-50 border-stone-200/50 text-stone-400 line-through"
                              : "bg-white border hover:border-stone-100 border-transparent hover:bg-stone-50 text-stone-800"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setCheckedIngredients((prev) => ({
                                ...prev,
                                [ing]: !isChecked,
                              }));
                            }}
                            className="accent-amber-500 rounded border-stone-300 pointer-events-none shrink-0"
                          />
                          {ingImg && (
                            <img
                              src={ingImg}
                              alt={ing}
                              className={`w-12 h-12 object-cover rounded-lg border border-stone-200/80 shadow-3xs shrink-0 ${
                                isChecked ? "opacity-35 grayscale" : ""
                              }`}
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span className="font-semibold leading-snug">{ing}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Instructions column (3/5 size) */}
                <div className="md:col-span-3 space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 select-none">
                    <h3 className="font-bold text-stone-900 font-serif text-lg tracking-tight flex items-center gap-1.5">
                      <ChefHat className="w-5 h-5 text-amber-500" />
                      Steps to execute
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-stone-400">Mark Done</span>
                  </div>

                  <div className="space-y-4">
                    {selectedRecipe.steps.map((step, idx) => {
                      const isStepOk = !!completedSteps[idx];
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all duration-300 ${
                            narratingSection === "steps" && narratingIndex === idx
                              ? "ring-2 ring-amber-500 bg-amber-50/70 border-amber-300 shadow-sm z-10 scale-[1.02]"
                              : isStepOk
                              ? "bg-slate-50 border-stone-200/50 text-stone-400 opacity-60"
                              : "bg-white border-stone-150 text-stone-800 shadow-2xs hover:border-stone-200"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setCompletedSteps((prev) => ({
                                ...prev,
                                [idx]: !isStepOk,
                              }));
                            }}
                            className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                              isStepOk
                                ? "bg-amber-500 border-amber-600 text-stone-950"
                                : "bg-stone-50 border-stone-300 hover:border-amber-500 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </button>

                          <div className="space-y-1 flex-grow">
                            <div className="flex flex-wrap items-center justify-between gap-2.5">
                              <span className="text-[11px] font-extrabold uppercase tracking-widest block text-amber-700">Stage {idx + 1}</span>
                              
                              {/* Step Timer Shortcut Trigger */}
                              {(() => {
                                const parsedMins = parseMinutesFromStepText(step);
                                return parsedMins !== null ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCreateCustomTimer(`Stage ${idx + 1}: ${selectedRecipe.recipeName.slice(0, 15)}...`, parsedMins, idx)}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-lg text-[9.5px] font-extrabold transition-all duration-150 flex items-center gap-1 cursor-pointer hover:scale-[1.03] select-none shrink-0"
                                    title={`Instantly spawn a ${parsedMins} minute timer for this stage`}
                                  >
                                    <Clock className="w-2.8 h-2.8 text-amber-700 animate-pulse" />
                                    <span>⏱️ Run {parsedMins}m Timer</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCreateCustomTimer(`Stage ${idx + 1}: ${selectedRecipe.recipeName.slice(0, 15)}...`, 5, idx)}
                                    className="px-2 py-1 bg-stone-100 hover:bg-amber-50 text-stone-600 hover:text-amber-900 border border-stone-200 hover:border-amber-300 rounded-lg text-[9.5px] font-semibold transition-all duration-150 flex items-center gap-1 cursor-pointer select-none shrink-0"
                                    title="Spawn default 5m stage timer"
                                  >
                                    <Clock className="w-2.8 h-2.8 text-stone-400" />
                                    <span>⏱️ Standard 5m</span>
                                  </button>
                                );
                              })()}
                            </div>
                            <p className="text-sm font-medium leading-relaxed">{step}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Chef tricks spotlight */}
              {selectedRecipe.chefTricks && selectedRecipe.chefTricks.length > 0 && (
                <div id="chef-tricks-pot" className="bg-gradient-to-br from-amber-50 to-orange-50/70 border border-amber-200 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2.5 opacity-10 font-bold select-none text-6xl">秘</div>
                  <h4 className="font-serif font-black text-amber-900 border-b border-amber-200 pb-2 mb-3.5 flex items-center gap-1.5 text-base uppercase">
                    <Sparkles className="w-4 h-4 text-amber-600 fill-amber-500" />
                    Chef Waqas' Heirloom Kitchen Secrets
                  </h4>
                  <ul className="space-y-3">
                    {selectedRecipe.chefTricks.map((trick, index) => {
                      const isHighlighted = narratingSection === "tricks" && narratingIndex === index;
                      return (
                        <li 
                          key={index} 
                          className={`text-amber-950 text-xs sm:text-sm leading-relaxed flex items-start gap-1.5 font-medium p-2.5 rounded-xl transition-all duration-300 ${
                            isHighlighted 
                              ? "bg-amber-100/80 ring-2 ring-amber-400 border border-amber-300 shadow-3xs scale-[1.01]" 
                              : "border border-transparent"
                          }`}
                        >
                          <span className="text-amber-500 shrink-0 select-none text-base font-extrabold leading-none">&bull;</span>
                          <span>{trick}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Bottom control bar */}
            <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs font-semibold text-stone-500">
              <div className="flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-stone-400" />
                <span>Cooked with authentic Mughal expertise. Ensure food safety standards.</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleBookmark({ stopPropagation: () => {} } as any, selectedRecipe)}
                className={`px-4 py-2 border rounded-xl flex items-center gap-2 hover:bg-stone-100 transition-colors ${
                  bookmarks.includes(selectedRecipe.id || selectedRecipe.recipeName)
                    ? "bg-rose-50 border-rose-200 text-rose-800 font-bold"
                    : "bg-white border-stone-300 text-stone-600"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${bookmarks.includes(selectedRecipe.id || selectedRecipe.recipeName) ? "fill-rose-600 text-rose-600" : ""}`} />
                <span>
                  {bookmarks.includes(selectedRecipe.id || selectedRecipe.recipeName) ? "Saved in Bookmarks" : "Pin to Bookmarks"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {cookAlongActive && selectedRecipe && (
        <CookAlong
          recipe={selectedRecipe}
          onClose={() => setCookAlongActive(false)}
          getIngredientImage={getIngredientImage}
          chefWaqasImg={chefWaqasImg}
        />
      )}

      {/* FOOTER */}
      <footer id="cooking-footer-bar" className="mt-auto bg-stone-900 border-t border-stone-800 text-stone-400 text-xs py-8 px-4 font-medium text-center space-y-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-stone-300">
            <ChefHat className="w-4 h-4 text-amber-500" />
            <span className="font-serif font-black text-sm text-white">Chef Waqas Recipes &copy; 2026</span>
          </div>
          <div className="text-stone-500">
            Hand-ground premium culinary advice. Powered by Gemini Cloud models.
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span className="text-stone-300 text-[10px] uppercase font-bold tracking-wider">Kitchen online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
