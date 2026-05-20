import React from "react";
import { Recipe } from "../types";
import { Clock, ChefHat, Users, Heart, Sparkles, BookOpen } from "lucide-react";

interface RecipeCardProps {
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  isFavorited: boolean;
  onToggleFavorite: (e: React.MouseEvent, recipe: Recipe) => void;
}

export default function RecipeCard({ recipe, onView, isFavorited, onToggleFavorite }: RecipeCardProps) {
  const isAiGenerated = recipe.id?.startsWith("ai_");

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "hard":
        return "bg-rose-50 text-rose-700 border-rose-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getCourseBadgeColor = (course: string) => {
    switch (course.toLowerCase()) {
      case "mains":
        return "bg-stone-100 text-stone-800 border-stone-200";
      case "dessert":
        return "bg-yellow-50 text-yellow-800 border-yellow-200";
      case "breads":
        return "bg-orange-50 text-orange-800 border-orange-200";
      case "appetizer":
        return "bg-sky-50 text-sky-800 border-sky-300";
      default:
        return "bg-stone-50 text-stone-700 border-stone-200";
    }
  };

  return (
    <div
      id={`recipe-card-${recipe.recipeName.replace(/\s+/g, '-').toLowerCase()}`}
      className="group relative flex flex-col bg-white rounded-2xl border border-stone-100 shadow-xs hover:shadow-lg hover:border-stone-200 transition-all duration-300 overflow-hidden cursor-pointer h-full"
      onClick={() => onView(recipe)}
    >
      {/* Visual Header / Accent */}
      <div className="h-3 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 w-full" />

      {/* Card Content */}
      <div className="p-6 flex flex-col flex-grow">
        {/* Badges container */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCourseBadgeColor(recipe.course)}`}>
              {recipe.course}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getDifficultyColor(recipe.difficulty)}`}>
              {recipe.difficulty}
            </span>
          </div>
          
          <button
            id={`fav-btn-${recipe.recipeName.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={(e) => onToggleFavorite(e, recipe)}
            className={`p-2 rounded-full border transition-all duration-200 ${
              isFavorited
                ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                : "bg-stone-50 border-stone-200 text-stone-400 hover:text-rose-600 hover:bg-stone-100"
            }`}
            title={isFavorited ? "Remove from bookmarks" : "Save as bookmark"}
          >
            <Heart className={`w-4 h-4 ${isFavorited ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>

        {/* Recipe Title & Subtitle */}
        <div className="mb-3 flex-grow">
          <h3 className="text-xl font-bold text-stone-900 group-hover:text-amber-800 transition-colors duration-200 line-clamp-2 leading-snug">
            {recipe.recipeName}
          </h3>
          
          {isAiGenerated && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
              <Sparkles className="w-3 h-3 fill-amber-500 text-amber-500" />
              Chef Waqas AI Custom
            </span>
          )}

          <p className="text-sm text-stone-500 mt-2 line-clamp-3 leading-relaxed">
            {recipe.description}
          </p>
        </div>

        {/* Nutritional or basic specs */}
        <div className="grid grid-cols-3 gap-2 py-3.5 border-t border-stone-100 text-stone-600 text-[13px] font-medium mt-auto">
          <div className="flex items-center gap-1.5 justify-center border-r border-stone-100">
            <Clock className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
            <span>{recipe.prepTime + recipe.cookTime}m</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center border-r border-stone-100">
            <ChefHat className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
            <span>{recipe.cookingTimeLevel || recipe.difficulty}</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center">
            <Users className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors duration-300" />
            <span>{recipe.servings} Servings</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-4 border-t border-stone-50 flex items-center justify-between text-xs font-semibold text-amber-800 bg-amber-50/20 -mx-6 -mb-6 px-6 py-4 hover:bg-amber-500/10 transition-colors duration-200 rounded-b-2xl">
          <span className="flex items-center gap-1.5 font-bold">
            <BookOpen className="w-4 h-4 text-amber-700" />
            View Full Recipe
          </span>
          <span className="text-stone-400 group-hover:translate-x-1 transition-transform duration-200">
            &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}
