// Cycles open to the public. Everything else (primaire, collège, supérieur/concours) is "Bientôt disponible":
// listed in the catalogue, but its levels, lessons and QCM are refused for everyone except admins.
// Override with OPEN_CYCLES=lycee,college in server/.env.
export const OPEN_CYCLES = (process.env.OPEN_CYCLES || "lycee").split(",").map((s) => s.trim()).filter(Boolean);
export const COMING_SOON = "Bientôt disponible";

export const isComingSoon = (cycleSlug: string | undefined | null) => !!cycleSlug && !OPEN_CYCLES.includes(cycleSlug);
