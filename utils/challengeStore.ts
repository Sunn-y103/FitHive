/**
 * Challenge Store (Frontend-only, In-Memory)
 * 
 * Simple in-memory store for challenges created from CreateChallengeScreen.
 * Used for demo and hackathon purposes only.
 */

// ChallengeData interface (matches CommunityScreen)
export interface ChallengeData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  numberOfPeople?: number; // Optional: number of people participating
  location?: string; // Optional: challenge location
  image?: string | null; // Optional: challenge image URL
}

// Re-export for convenience
export type { ChallengeData };

// In-memory store for newly created challenges
let pendingChallenge: ChallengeData | null = null;

/**
 * Set a newly created challenge to be added to the list
 */
export function setPendingChallenge(challenge: ChallengeData): void {
  pendingChallenge = challenge;
}

/**
 * Get and clear the pending challenge
 * Returns null if no pending challenge
 */
export function getAndClearPendingChallenge(): ChallengeData | null {
  const challenge = pendingChallenge;
  pendingChallenge = null; // Clear after reading
  return challenge;
}

/**
 * Check if there's a pending challenge
 */
export function hasPendingChallenge(): boolean {
  return pendingChallenge !== null;
}

