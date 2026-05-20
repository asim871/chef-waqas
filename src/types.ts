export interface Recipe {
  id?: string;
  recipeName: string;
  description: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard" | string;
  course: "Mains" | "Dessert" | "Breads" | "Appetizer" | "All" | string;
  ingredients: string[];
  steps: string[];
  chefTricks: string[];
  isCustom?: boolean;
  cookingTimeLevel?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface ActiveKitchenTimer {
  id: string;
  label: string;
  duration: number; // in seconds
  secondsLeft: number;
  isActive: boolean;
  isCompleted: boolean;
  recipeName?: string;
  stepIndex?: number;
}

