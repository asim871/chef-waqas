import { Recipe } from "../types";

export interface CalendarEventDetails {
  recipe: Recipe;
  dateTime: string; // ISO 8601 string, e.g., 2026-05-20T19:00
  timezone: string;
  guests?: string; // Comma-separated list of invitation emails
}

export interface GoogleCalendarEventResponse {
  id: string;
  htmlLink: string;
  summary: string;
}

/**
 * Creates a beautiful, detailed culinary event on the user's Google Calendar.
 */
export async function scheduleMealOnGoogleCalendar(
  details: CalendarEventDetails,
  accessToken: string
): Promise<GoogleCalendarEventResponse> {
  const { recipe, dateTime, timezone, guests } = details;

  // Build a warm and descriptive event body for Google Calendar
  const summary = `🍳 Cook: ${recipe.recipeName} with Chef Waqas`;

  const totalTime = Number(recipe.prepTime || 0) + Number(recipe.cookTime || 0);

  // Parse emails
  const attendees = guests
    ? guests
        .split(",")
        .map((email) => email.trim())
        .filter((email) => email.length > 0 && email.includes("@"))
        .map((email) => ({ email }))
    : [];

  // Description body in rich first-person storytelling style of Chef Waqas
  let description = `Assalamu Alaikum!\n\nYou have planned to cook "${recipe.recipeName}" using Chef Waqas' Heirloom Recipes.\n\n`;
  description += `🌟 Narrative:\n"${recipe.description}"\n\n`;
  description += `⏱️ Timeline:\n• Prep Time: ${recipe.prepTime} Mins\n• Cook Time: ${recipe.cookTime} Mins\n• Difficulty: ${recipe.difficulty}\n• Portions: Serves ${recipe.servings} Plate(s)\n\n`;
  
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    description += `🛒 Ingredients needed:\n`;
    recipe.ingredients.forEach((ing) => {
      description += `- ${ing}\n`;
    });
    description += `\n`;
  }

  if (recipe.chefTricks && recipe.chefTricks.length > 0) {
    description += `💡 Chef Waqas' Royal Kitchen Secrets:\n`;
    recipe.chefTricks.forEach((trick) => {
      description += `✨ ${trick}\n`;
    });
    description += `\n`;
  }

  description += `Let's make some magic in the kitchen together!\nCreated via Chef Waqas Heirloom Cook App.`;

  // Start & End details
  const startDate = new Date(dateTime);
  if (isNaN(startDate.getTime())) {
    throw new Error("Invalid start date/time selected.");
  }

  // Event length is matching prepTime + cookTime, minimum of 60 minutes
  const durationMinutes = Math.max(totalTime, 60);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  const eventPayload = {
    summary,
    description,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: timezone,
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: timezone,
    },
    attendees,
    reminders: {
      useDefault: true,
    },
  };

  try {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Google Calendar API Error details:", errorData);
      
      if (response.status === 401) {
        throw new Error("Your login credentials have expired. Please re-authenticate (Log In again) to authorize Google Calendar access.");
      }
      
      throw new Error(
        errorData.error?.message || `Google Calendar returned status ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      id: data.id,
      htmlLink: data.htmlLink,
      summary: data.summary,
    };
  } catch (error: any) {
    console.error("Failed to schedule on Google Calendar:", error);
    throw error;
  }
}
