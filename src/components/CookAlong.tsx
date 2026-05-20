import React, { useState, useEffect, useRef } from "react";
import { Recipe } from "../types";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Play, 
  Pause, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  X, 
  Utensils, 
  Award,
  Flame,
  ChevronRight,
  Scale
} from "lucide-react";

interface CookAlongProps {
  recipe: Recipe;
  onClose: () => void;
  getIngredientImage: (ingredientText: string) => string | undefined;
  chefWaqasImg: string;
}

export default function CookAlong({ recipe, onClose, getIngredientImage, chefWaqasImg }: CookAlongProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [completedStepsMap, setCompletedStepsMap] = useState<Record<number, boolean>>({});
  
  // Timer states
  const [timerIsActive, setTimerIsActive] = useState<boolean>(false);
  const [stepDuration, setStepDuration] = useState<number>(60); // default 60s
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(60);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(false);
  
  // Vocal Assist (Text To Speech)
  const [isVocalMuted, setIsVocalMuted] = useState<boolean>(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Auto-set timer length based on steps and custom durations
  useEffect(() => {
    const stepLower = recipe.steps[currentStepIndex]?.toLowerCase() || "";
    // Dynamically estimate cooking duration if mentions of minutes
    let parsedDuration = 60; // default 1 minute
    const matchMin = stepLower.match(/(\d+)\s*(?:minute|min)/);
    if (matchMin && matchMin[1]) {
      parsedDuration = parseInt(matchMin[1], 10) * 60;
    } else {
      const matchSec = stepLower.match(/(\d+)\s*(?:second|sec)/);
      if (matchSec && matchSec[1]) {
        parsedDuration = parseInt(matchSec[1], 10);
      }
    }
    setStepDuration(parsedDuration);
    setTimerSecondsLeft(parsedDuration);
  }, [currentStepIndex, recipe.steps]);

  // Handle countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerIsActive && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && timerIsActive) {
      // Step complete behavior
      setTimerIsActive(false);
      
      // Mark current step as complete
      setCompletedStepsMap(prev => ({ ...prev, [currentStepIndex]: true }));

      if (autoAdvanceEnabled) {
        // Go next if possible, else finish
        if (currentStepIndex < recipe.steps.length - 1) {
          handleNextStep();
        } else {
          setIsCompleted(true);
        }
      } else {
        // Trigger alert system sound / chime if available
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // Note A5
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.15);
        } catch (e) {
          // ignore web audio constraints
        }
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsActive, timerSecondsLeft, autoAdvanceEnabled, currentStepIndex]);

  // Voice narration for current step
  const speakCurrentStep = () => {
    if (isVocalMuted) return;
    
    // Stop any ongoing speech
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn("Speech cancellation failed", e);
    }

    const rawStepText = recipe.steps[currentStepIndex];
    if (!rawStepText) return;

    // Build the beautiful custom spoken phrase in Chef Waqas voice archetype
    const phrase = `Step ${currentStepIndex + 1}. ${rawStepText}`;
    
    const utterance = new SpeechSynthesisUtterance(phrase);
    
    // Choose voice with premium/expressive qualities if possible (like Urdu, South Asian, Hindi English, or standard English)
    const voices = window.speechSynthesis.getVoices();
    const desiredVoice = voices.find(v => 
      v.lang.includes("en-IN") || v.lang.includes("en-GB") || v.name.includes("Google")
    );
    if (desiredVoice) {
      utterance.voice = desiredVoice;
    }
    
    utterance.rate = 0.95; // Slightly slower pacing for premium chef guidance
    utterance.pitch = 1.0;
    
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Speak every time current step changes
  useEffect(() => {
    speakCurrentStep();
    return () => {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    };
  }, [currentStepIndex]);

  const toggleMute = () => {
    if (isVocalMuted) {
      setIsVocalMuted(false);
      // Wait a fraction to enable speaking
      setTimeout(() => {
        speakCurrentStep();
      }, 50);
    } else {
      setIsVocalMuted(true);
      window.speechSynthesis.cancel();
    }
  };

  const handleNextStep = () => {
    // Mark current step as completed automatically
    setCompletedStepsMap(prev => ({ ...prev, [currentStepIndex]: true }));
    
    if (currentStepIndex < recipe.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      setTimerIsActive(false);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setTimerIsActive(false);
    }
  };

  const handleJumpToStep = (index: number) => {
    setCurrentStepIndex(index);
    setTimerIsActive(false);
  };

  // Parsing helper to find which ingredients are needed for the current step
  const matchIngredientsForCurrentStep = () => {
    const currentStepText = recipe.steps[currentStepIndex] || "";
    const stepLower = currentStepText.toLowerCase();
    
    // Clean step text punctuation
    const cleanedStep = stepLower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");

    return recipe.ingredients.filter(ing => {
      const ingLower = ing.toLowerCase();
      
      // Terms we ignore because they are generic measurement units and details
      const skipWords = new Set([
        "cup", "cups", "tablespoon", "tbsp", "teaspoon", "tsp", "g", "ml", "gram", "grams", 
        "spoon", "bade", "chammach", "pinch", "pieces", "sliced", "chopped", "of", "and", 
        "or", "to", "with", "the", "a", "an", "for", "in", "on", "at", "by", "from", "fresh",
        "ground", "whole", "powder", "minced", "diced", "peeled", "water", "salt", "sugar",
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "1/2", "1/4", "3/4", "1.5", "2.5", "tbsp", "spices"
      ]);

      const ingWords = ingLower.split(/[^a-zA-Z]/).filter(w => w.length > 2 && !skipWords.has(w));
      
      if (ingWords.length === 0) {
        // Fallback for simple single-word ingredients like "Water" or "Salt" which were excluded as filter criteria
        const rawWords = ingLower.split(/[^a-zA-Z]/).filter(w => w.length > 2);
        return rawWords.some(word => cleanedStep.includes(word));
      }

      return ingWords.some(word => cleanedStep.includes(word));
    });
  };

  const currentMatchedIngredients = matchIngredientsForCurrentStep();

  // Progress percentage calculation
  const progressPercent = Math.round(((currentStepIndex + 1) / recipe.steps.length) * 100);

  // Time format helper
  const formatTimerLabel = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentStepText = recipe.steps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/95 backdrop-blur-md flex flex-col overflow-hidden text-stone-100 font-sans">
      
      {/* HEADER BAR */}
      <header className="px-6 py-4.5 bg-stone-900 border-b border-stone-850 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/50 shadow-md">
            <img 
              src={chefWaqasImg} 
              alt="Chef Waqas Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded border border-amber-400/20">
                Cook-Along Mode
              </span>
              <span className="text-[10px] text-stone-400 font-bold hidden sm:inline">&bull; Step {currentStepIndex + 1} of {recipe.steps.length}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold font-serif text-white tracking-tight truncate max-w-[250px] sm:max-w-[450px]">
              {recipe.recipeName}
            </h1>
          </div>
        </div>

        {/* Global Controls & Exit */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMute}
            className={`p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
              isVocalMuted 
                ? "bg-stone-800/40 border-stone-800 text-stone-400 hover:text-stone-300" 
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isVocalMuted ? "Unmute vocal directions" : "Mute vocal directions"}
          >
            {isVocalMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
          </button>
          
          <button
            onClick={onClose}
            className="p-2 bg-stone-800 hover:bg-stone-700 hover:text-white border border-stone-700 text-stone-300 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-black uppercase tracking-wider"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Quit Cooking</span>
          </button>
        </div>
      </header>

      {/* STEP PROGRESS TRACKER */}
      <div className="w-full h-1.5 bg-stone-900 shrink-0">
        <div 
          className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <AnimatePresence mode="wait">
        {!isCompleted ? (
          <div key="active-cook-view" className="flex-grow flex flex-col md:flex-row overflow-hidden relative">
            
            {/* ROADMAP ROAD SIDEBAR (1/4 size on large screens) */}
            <aside className="hidden lg:flex w-80 shrink-0 border-r border-stone-850 flex-col bg-stone-900/40 overflow-hidden">
              <div className="p-4 border-b border-stone-850 bg-stone-900/20">
                <h3 className="text-xs font-extrabold text-stone-400 tracking-wider font-mono uppercase flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Recipe Roadmap
                </h3>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-2.5">
                {recipe.steps.map((st, i) => {
                  const isActive = currentStepIndex === i;
                  const isDone = !!completedStepsMap[i];
                  return (
                    <button
                      key={i}
                      onClick={() => handleJumpToStep(i)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 flex gap-3 text-xs leading-relaxed font-medium cursor-pointer ${
                        isActive
                          ? "bg-amber-500/10 border-amber-500/50 text-white font-bold ring-1 ring-amber-500/20"
                          : isDone
                          ? "bg-stone-800/20 border-stone-850 text-stone-400 font-normal grayscale"
                          : "bg-transparent border-transparent hover:border-stone-800 text-stone-300 hover:bg-stone-900/30"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-black ${
                        isActive
                          ? "bg-amber-500 text-stone-950"
                          : isDone
                          ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                          : "bg-stone-800 border border-stone-700 text-stone-400"
                      }`}>
                        {isDone ? <Check className="w-3 h-3 stroke-[2.5px]" /> : i + 1}
                      </div>
                      <span className="line-clamp-2">{st}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* MAIN COMPACT ACTIVE COOKING WORKSPACE */}
            <main className="flex-grow flex flex-col overflow-y-auto p-4 sm:p-8 space-y-6 md:space-y-8 items-center justify-center max-w-4xl mx-auto w-full">
              
              {/* CURRENT STEP CARD */}
              <motion.div 
                key={currentStepIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-gradient-to-tr from-stone-900 via-stone-900 to-stone-850 p-6 sm:p-8 rounded-3xl border border-stone-800 shadow-xl space-y-6 sm:space-y-8 flex flex-col"
              >
                
                {/* Step Marker Badge */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest text-[#f59e0b] bg-amber-500/10 px-3.5 py-1.5 rounded-xl border border-amber-500/20 font-mono uppercase">
                    <Sparkles className="w-4 h-4 fill-[#f59e0b] animate-spin-slow text-[#f59e0b]" />
                    STAGED DIRECTIVE {currentStepIndex + 1}
                  </span>
                  
                  {/* Speech Trigger */}
                  <button
                    onClick={speakCurrentStep}
                    className="flex items-center gap-1.5 text-[11px] font-black uppercase text-amber-300 hover:text-amber-200 bg-stone-800/50 hover:bg-stone-800 px-3 py-1.5 rounded-xl transition cursor-pointer border border-stone-700"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Speak Instruction
                  </button>
                </div>

                {/* STEP TEXT IN HUGE DISPLAY TYPE */}
                <div className="space-y-4">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-black text-white leading-relaxed tracking-wide">
                    {currentStepText}
                  </h2>
                </div>

                {/* CURRENT HIGHLIGHTED INGREDIENTS CONTAINER */}
                <div className="pt-6 border-t border-stone-800/80">
                  <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-500" />
                    Ingredients needed for this step
                  </h4>

                  {currentMatchedIngredients.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentMatchedIngredients.map((ing, k) => {
                        const img = getIngredientImage(ing);
                        return (
                          <div 
                            key={k}
                            className="flex items-center gap-3.5 p-3.5 bg-stone-950/60 border border-stone-850/80 rounded-2xl ring-1 ring-amber-500/10 transition-all shadow-sm"
                          >
                            <div className="w-11 h-11 shrink-0 bg-stone-900 rounded-lg border border-stone-800 overflow-hidden shadow-inner flex items-center justify-center">
                              {img ? (
                                <img 
                                  src={img} 
                                  alt={ing} 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Utensils className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <span className="text-stone-100 text-xs sm:text-sm font-semibold leading-snug">{ing}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs sm:text-sm text-stone-500 italic pb-1">
                      No matching item ingredients are specifically highlighted. Ensure you have standard base stove items handy!
                    </div>
                  )}
                </div>

                {/* INTEGRATED TIMER CONTROLS WITHIN THE STEP CARD */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-stone-800/80 items-center justify-between">
                  
                  {/* Preset information / Dynamic trigger */}
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${timerIsActive ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-stone-800 text-stone-400 border-stone-700"}`}>
                      <Clock className={`w-5 h-5 ${timerIsActive ? "animate-pulse" : ""}`} />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black uppercase text-stone-400 tracking-wider">Step Countdown</span>
                      <span className="text-xs font-bold text-stone-300">Target step timer configuration</span>
                    </div>
                  </div>

                  {/* Circular/Digital Timer Center Stage */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 bg-stone-950 px-4 py-2 rounded-2xl border border-stone-800 shadow-inner">
                      <span className="font-mono text-xl sm:text-2xl font-black text-amber-400">
                        {formatTimerLabel(timerSecondsLeft)}
                      </span>
                      <div className="h-4 w-[1px] bg-stone-800" />
                      <button
                        onClick={() => setTimerIsActive(!timerIsActive)}
                        className={`p-1.5 rounded-lg transition-all text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer ${
                          timerIsActive 
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30" 
                            : "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/35"
                        }`}
                        title={timerIsActive ? "Pause step timer" : "Start step timer"}
                      >
                        {timerIsActive ? <Pause className="w-3.5 h-3.5 fill-rose-400 text-rose-400" /> : <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-300" />}
                      </button>
                    </div>
                  </div>

                  {/* Controls to adjust time & toggle Auto-Advance */}
                  <div className="flex flex-col items-end gap-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setTimerSecondsLeft(prev => Math.max(0, prev - 15))}
                        className="px-2.5 py-1 bg-stone-850 hover:bg-stone-800 border border-stone-750 text-stone-300 rounded-lg text-[10px] font-bold cursor-pointer transition select-none"
                      >
                        -15s
                      </button>
                      <button
                        onClick={() => setTimerSecondsLeft(prev => prev + 15)}
                        className="px-2.5 py-1 bg-stone-850 hover:bg-stone-800 border border-stone-750 text-stone-300 rounded-lg text-[10px] font-bold cursor-pointer transition select-none"
                      >
                        +15s
                      </button>
                      <button
                        onClick={() => setTimerSecondsLeft(stepDuration)}
                        className="p-1 px-2.5 bg-stone-850 hover:bg-stone-800 border border-stone-750 text-stone-300 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                        title="Reset countdown"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    </div>

                    {/* Auto-Advance checkbox toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={autoAdvanceEnabled}
                        onChange={(e) => setAutoAdvanceEnabled(e.target.checked)}
                        className="accent-amber-500 rounded text-stone-900 border-stone-700"
                      />
                      <span className="text-[10px] sm:text-[11px] font-bold text-stone-400 tracking-wider uppercase">Auto-Advance Next Step</span>
                    </label>
                  </div>

                </div>

              </motion.div>

              {/* ACTION COMMAND NAVIGATION PANEL */}
              <div className="flex items-center justify-between w-full pt-2">
                
                {/* Previous Step */}
                <button
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  className={`px-5 py-3.5 sm:px-6 rounded-2xl text-xs font-black tracking-widest uppercase flex items-center gap-2 transition cursor-pointer ${
                    currentStepIndex === 0
                      ? "bg-stone-900 text-stone-600 border border-stone-850 cursor-not-allowed opacity-40"
                      : "bg-stone-900 hover:bg-stone-850 text-stone-300 border border-stone-800 hover:text-white"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Prev Step
                </button>

                {/* DOTS MOBILE WORKSPACE PROGRESS */}
                <div className="flex items-center gap-1.5 max-w-[120px] overflow-hidden justify-center">
                  {recipe.steps.map((_, dotIdx) => (
                    <span 
                      key={dotIdx}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        dotIdx === currentStepIndex 
                          ? "w-4 bg-amber-400" 
                          : completedStepsMap[dotIdx]
                          ? "w-2 bg-emerald-500/60"
                          : "w-2 bg-stone-800"
                      }`}
                    />
                  ))}
                </div>

                {/* Next Step / Complete */}
                <button
                  onClick={handleNextStep}
                  className="px-5 py-3.5 sm:px-7 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 rounded-2xl text-xs font-black tracking-widest uppercase flex items-center gap-2 transition hover:scale-102 hover:shadow-lg active:scale-98 duration-150 cursor-pointer"
                >
                  {currentStepIndex === recipe.steps.length - 1 ? (
                    <>
                      Finish & Feast
                      <CheckCircle className="w-4 h-4 fill-stone-950 text-amber-500" />
                    </>
                  ) : (
                    <>
                      Next Step
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

              </div>

            </main>

          </div>
        ) : (
          /* IMPECCABLE CELEBRATION COMPONENT WRAPPER */
          <motion.div 
            key="success-celebration"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto space-y-7"
          >
            <div className="relative">
              {/* Profile icon with Crown of Royalty */}
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-amber-400 shadow-2xl mx-auto">
                <img 
                  src={chefWaqasImg} 
                  alt="Chef Waqas Profile Happy" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-amber-400 to-amber-600 border-2 border-stone-950 p-2 rounded-full shadow-lg">
                <Award className="w-6 h-6 text-stone-950" />
              </div>
            </div>

            <div className="space-y-3.5">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-widest text-[#f59e0b] bg-amber-500/15 px-3.5 py-1 rounded-full border border-amber-500/25">
                CULINARY MASTERPIECE FINISHED
              </span>
              <h2 className="text-3xl sm:text-4.5xl font-serif font-black text-white leading-tight">
                "Shabash! Cooked with Devotion!"
              </h2>
              <p className="text-stone-300 text-sm leading-relaxed max-w-lg mx-auto">
                Salaam mere pyare home chef! You have fully executed <strong className="text-amber-400 font-bold">{recipe.recipeName}</strong> under my live guidance. Turn off your hot coals, dish out the steaming food, garnish with coriander, and enjoy this masterpiece cooked with true love.
              </p>
            </div>

            {/* Performance card summary */}
            <div className="bg-stone-900 border border-stone-800 p-5 rounded-2.5xl grid grid-cols-3 gap-6 w-full text-center">
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider">Directives Done</span>
                <span className="text-lg font-black text-amber-500 block">{recipe.steps.length} of {recipe.steps.length}</span>
              </div>
              <div className="border-x border-stone-800">
                <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider">Total Est. Duration</span>
                <span className="text-lg font-black text-amber-500 block">{recipe.prepTime + recipe.cookTime} Mins</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-wider">Your Title</span>
                <span className="text-xs font-black text-[#58ad58] uppercase block tracking-wide mt-1">Royal Artisan</span>
              </div>
            </div>

            {/* Return options */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={() => {
                  // Reset cooker step index
                  setCurrentStepIndex(0);
                  setIsCompleted(false);
                  setCompletedStepsMap({});
                }}
                className="w-full sm:w-1/2 py-3.5 bg-stone-900 hover:bg-stone-850 text-white hover:text-amber-300 text-xs font-black tracking-wider uppercase rounded-xl border border-stone-800 cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Cook It Again
              </button>
              
              <button
                onClick={onClose}
                className="w-full sm:w-1/2 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-stone-950 text-xs font-black tracking-wider uppercase rounded-xl hover:shadow-xl hover:scale-101 cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                Return to Recipe Book
                <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
