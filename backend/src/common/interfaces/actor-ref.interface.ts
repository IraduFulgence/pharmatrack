/**
 * Who performed an action, as known from the JWT.
 * A plain string is treated as the user's email (older call sites and tests).
 */
export type ActorRef = string | { email?: string; pharmacyUserId?: number };
