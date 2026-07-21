import * as mockDb from "./mockDb";
import * as supabaseDb from "./supabaseDb";

// Toggle de fuente de datos: DATA_SOURCE=mock|supabase (solo servidor).
const db = process.env.DATA_SOURCE === "supabase" ? supabaseDb : mockDb;

export const {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
} = db;
