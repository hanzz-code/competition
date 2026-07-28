import { createClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase-browser";

// Database clients for specific games (Realtime shards)
const axiomSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_AXIOM;
const axiomSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_AXIOM;

export const axiomSupabase = 
  axiomSupabaseUrl && axiomSupabaseKey 
    ? createClient(axiomSupabaseUrl, axiomSupabaseKey)
    : null;

const gfsSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_URL_Gameforsmart;
const gfsSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_REALTIME_ANON_KEY_Gameforsmart;

export const gfsSupabase = 
  gfsSupabaseUrl && gfsSupabaseKey 
    ? createClient(gfsSupabaseUrl, gfsSupabaseKey)
    : null;

// The data passed to the registry when starting a game
export interface GameSessionContext {
  quizId?: string;
  groupId?: string;
  competitionId?: string;
  allowedUserIds?: string[];
  roundIndex?: number;
  groupName?: string;
  generatedSessionId?: string; 
  gamePin?: string; // The 6-digit room code
  hostId?: string; 
  settings?: {
    durationMinutes: number;
    questionCount: number;
    sound: boolean;
    difficulty: string;
  };
}

// Interface for each game's integration config
export interface GameIntegration {
  name: string;
  initializeSession?: (context: GameSessionContext) => Promise<{ success: boolean; data?: any; error?: any }>;
  getRedirectUrl: (context: GameSessionContext) => string;
}

// Helper to fetch and shuffle quiz questions
async function fetchQuizQuestions(quizId?: string, limit?: number): Promise<any[]> {
  if (!quizId) return [];
  try {
    const { data: quizData } = await supabaseBrowser
      .from("quizzes")
      .select("questions")
      .eq("id", quizId)
      .single();
      
    if (quizData && quizData.questions) {
      let questionsList = typeof quizData.questions === 'string'
        ? JSON.parse(quizData.questions)
        : quizData.questions;
        
      if (Array.isArray(questionsList)) {
        const shuffled = [...questionsList].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit || 5);
      }
    }
  } catch (e) {
    console.warn("Could not fetch quiz details from DB:", e);
  }
  return [];
}

const gfsIntegration: GameIntegration = {
  name: "Quiz V2 (GameForSmart Main)",
  initializeSession: async (context) => {
    if (!gfsSupabase) {
      return { success: false, error: "GameForSmart Supabase environment variables missing." };
    }
    
    const payload = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      total_time_minutes: context.settings?.durationMinutes || 5,
      game_end_mode: "first_finish",
      allow_join_after_start: false,
      question_limit: String(context.settings?.questionCount || 5),
      application: "Quiz V2",
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };
    
    const { data, error } = await gfsSupabase.from('game_sessions_rt').insert(payload);
    if (error) {
      console.error("GameForSmart DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    return `https://app.gameforsmart.com/host/${context.generatedSessionId}/lobby`;
  }
};

const zigmaSupabaseUrl = process.env.NEXT_PUBLIC_B_SUPABASE_URL_ZIGMA;
const zigmaSupabaseKey = process.env.NEXT_PUBLIC_B_SUPABASE_ANON_KEY_ZIGMA;

export const zigmaSupabase = 
  zigmaSupabaseUrl && zigmaSupabaseKey 
    ? createClient(zigmaSupabaseUrl, zigmaSupabaseKey)
    : null;

const zigmaIntegration: GameIntegration = {
  name: "Zigma",
  initializeSession: async (context) => {
    if (!zigmaSupabase) {
      return { success: false, error: "Zigma Supabase env missing." };
    }

    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);

    const payload: any = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
      question_limit: context.settings?.questionCount || 5,
      total_time_minutes: context.settings?.durationMinutes || 5,
      current_questions: questionsToUse,
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };

    const { data, error } = await zigmaSupabase.from('sessions').insert(payload);
    if (error) {
      console.error("Zigma DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const queryParts = [
      context.quizId ? `quizId=${encodeURIComponent(context.quizId)}` : null,
      `gamePin=${encodeURIComponent(targetPin)}`,
      context.generatedSessionId ? `sessionId=${encodeURIComponent(context.generatedSessionId)}` : null,
      context.hostId ? `hostId=${encodeURIComponent(context.hostId)}` : null,
    ].filter(Boolean);
    return `https://zigma.gameforsmart.com/host/auto-create?${queryParts.join("&")}`;
  }
};

const nitroSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_NITRO;
const nitroSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_NITRO;

export const nitroSupabase =
  nitroSupabaseUrl && nitroSupabaseKey
    ? createClient(nitroSupabaseUrl, nitroSupabaseKey)
    : null;

const nitroQuizIntegration: GameIntegration = {
  name: "NitroQuiz",
  initializeSession: async (context) => {
    if (!nitroSupabase) {
      return { success: false, error: "NitroQuiz Supabase env missing." };
    }

    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);

    const payload = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
      question_limit: context.settings?.questionCount || 5,
      total_time_minutes: context.settings?.durationMinutes || 5,
      current_questions: questionsToUse,
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };

    const { data, error } = await nitroSupabase.from("sessions").insert(payload);
    if (error) {
      console.error("NitroQuiz DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
    return `https://nitroquiz.gameforsmart.com/host/${targetPin}/lobby${hostParam}`;
  },
};

const crazyraceSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_MINE;
const crazyraceSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_MINE;

export const crazyraceSupabase = 
  crazyraceSupabaseUrl && crazyraceSupabaseKey 
    ? createClient(crazyraceSupabaseUrl, crazyraceSupabaseKey)
    : null;

const crazyRaceIntegration: GameIntegration = {
  name: "CrazyRace",
  initializeSession: async (context) => {
    if (!crazyraceSupabase) {
      return { success: false, error: "CrazyRace Supabase env missing." };
    }
    
    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);
    
    const payload = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
      question_limit: context.settings?.questionCount || 5,
      total_time_minutes: context.settings?.durationMinutes || 5,
      current_questions: questionsToUse,
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };
    
    const { data, error } = await crazyraceSupabase.from('sessions').insert(payload);
    if (error) {
      console.error("CrazyRace DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
    return `https://crazyrace.gameforsmart.com/host/${targetPin}/lobby${hostParam}`;
  }
};

const quizSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_C_URL;
const quizSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_C_ANON_KEY;

export const quizSupabase =
  quizSupabaseUrl && quizSupabaseKey
    ? createClient(quizSupabaseUrl, quizSupabaseKey)
    : null;

const spaceQuizIntegration: GameIntegration = {
  name: "Space Quiz",
  initializeSession: async (context) => {
    if (!quizSupabase) {
      return { success: false, error: "Space Quiz Supabase env missing." };
    }

    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);

    const payload = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
      question_limit: context.settings?.questionCount || 5,
      total_time_minutes: context.settings?.durationMinutes || 5,
      current_questions: questionsToUse,
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };

    const { data, error } = await quizSupabase.from("sessions").insert(payload);
    if (error) {
      console.error("Space Quiz DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
    return `https://spacequiz.gameforsmart.com/host/${targetPin}${hostParam}`;
  },
};

const memorySupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_PLAYERS_URL;
const memorySupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PLAYERS_ANON_KEY;

export const memorySupabase =
  memorySupabaseUrl && memorySupabaseKey
    ? createClient(memorySupabaseUrl, memorySupabaseKey)
    : null;

const memoryQuizIntegration: GameIntegration = {
  name: "Memory Quiz",
  initializeSession: async (context) => {
    if (!memorySupabase) {
      return { success: false, error: "Memory Quiz Supabase env missing." };
    }

    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);

    const payload = {
      id: context.generatedSessionId,
      game_pin: context.gamePin,
      quiz_id: context.quizId || "",
      status: "waiting",
      host_id: context.hostId || "",
      difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
      question_limit: context.settings?.questionCount || 10,
      total_time_minutes: context.settings?.durationMinutes || 5,
      current_questions: questionsToUse,
      max_players: 1000,
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };

    const { data, error } = await memorySupabase.from("sessions").insert(payload);
    if (error) {
      console.error("Memory Quiz DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
    return `https://memoryquiz.gameforsmart.com/host/${targetPin}/lobby${hostParam}`;
  },
};

const zombieSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_ZOMBIE;
const zombieSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_ZOMBIE;

export const zombieSupabase =
  zombieSupabaseUrl && zombieSupabaseKey
    ? createClient(zombieSupabaseUrl, zombieSupabaseKey)
    : null;

const zombieRawrIntegration: GameIntegration = {
  name: "Zombie Rawr",
  initializeSession: async (context) => {
    if (!zombieSupabase) {
      return { success: false, error: "Zombie Rawr Supabase env missing." };
    }

    const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);

    const payload = {
      id: context.generatedSessionId,
      quiz_id: context.quizId || "",
      host_id: context.hostId || "",
      game_pin: context.gamePin,
      total_time_minutes: context.settings?.durationMinutes || 5,
      question_limit: context.settings?.questionCount || 5,
      difficulty: context.settings?.difficulty ? `zombie:${context.settings.difficulty.toLowerCase()}` : "zombie:medium",
      current_questions: questionsToUse,
      status: "waiting",
      competition_id: context.competitionId || null,
      allowed_user_ids: context.allowedUserIds || null,
    };

    const { data, error } = await zombieSupabase.from("sessions").insert(payload);
    if (error) {
      console.error("Zombie Rawr DB Insert Error:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },
  getRedirectUrl: (context) => {
    const targetPin = context.gamePin || "INVALID_PIN";
    const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
    return `https://quizrush.gameforsmart.com/host/${targetPin}/lobby${hostParam}`;
  },
};

export const GameRegistry: Record<string, GameIntegration> = {
  "axiom": {
    name: "Axiom (Astro Learn)",
    initializeSession: async (context) => {
      if (!axiomSupabase) {
        return { success: false, error: "Axiom Supabase environment variables missing." };
      }
      
      const questionsToUse = await fetchQuizQuestions(context.quizId, context.settings?.questionCount);
      
      const payload = {
        id: context.generatedSessionId,
        game_pin: context.gamePin,
        quiz_id: context.quizId || "",
        status: "waiting",
        host_id: context.hostId || "",
        difficulty: context.settings?.difficulty?.toLowerCase() || "easy",
        question_limit: context.settings?.questionCount || 5,
        total_time_minutes: context.settings?.durationMinutes || 5,
        current_questions: questionsToUse,
        competition_id: context.competitionId || null,
        allowed_user_ids: context.allowedUserIds || null,
      };
      
      const { data, error } = await axiomSupabase.from('sessions').insert(payload);
      if (error) {
        console.error("Axiom DB Insert Error:", error);
        return { success: false, error: error.message };
      }
      return { success: true, data };
    },
    getRedirectUrl: (context) => {
      const targetPin = context.gamePin || "INVALID_PIN";
      const hostParam = context.hostId ? `?hostId=${context.hostId}` : "";
      return `https://axiom.gameforsmart.com/host/${targetPin}/lobby${hostParam}`;
    }
  },
  "quiz v2":        gfsIntegration,
  "quiz_v2":        gfsIntegration,
  "gameforsmart":   gfsIntegration,
  "zigma":          zigmaIntegration,
  "zigma quiz":     zigmaIntegration,
  "nitroquiz":      nitroQuizIntegration,
  "nitro quiz":     nitroQuizIntegration,
  "nitro":          nitroQuizIntegration,
  "crazyrace":      crazyRaceIntegration,
  "crazy race":     crazyRaceIntegration,
  "spacequiz":      spaceQuizIntegration,
  "space quiz":     spaceQuizIntegration,
  "space-quiz":     spaceQuizIntegration,
  "space_quiz":     spaceQuizIntegration,
  "quiz-game-v2":   spaceQuizIntegration,
  "quiz game v2":   spaceQuizIntegration,
  "quizrush":       zombieRawrIntegration,
  "quiz rush":      zombieRawrIntegration,
  "zombierawr":     zombieRawrIntegration,
  "zombie-rawr":    zombieRawrIntegration,
  "zombie rawr":    zombieRawrIntegration,
  "zombie_rawr":    zombieRawrIntegration,
  "memoryquiz":     memoryQuizIntegration,
  "memory quiz":    memoryQuizIntegration,
  "memory-game":    memoryQuizIntegration,
  "memory game":    memoryQuizIntegration,
};
