// The API flags cycles that are not open yet (`comingSoon`) and answers 423 "Bientôt disponible" for their content.
export const COMING_SOON_LABEL = "Bientôt disponible";
export const isComingSoonError = (error: string | null | undefined) => error === COMING_SOON_LABEL;
