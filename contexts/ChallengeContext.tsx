import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  rules: string[];
  participants: number;
  maxParticipants: number;
  location: string;
  time: string;
  image: string | null;
  created_at: string;
}

export interface ChallengeContextType {
  challenges: Challenge[];
  addChallenge: (challenge: Omit<Challenge, 'id' | 'created_at' | 'participants'>) => void;
  updateChallenge: (id: string, updates: Partial<Challenge>) => void;
  joinChallenge: (id: string) => void;
  leaveChallenge: (id: string) => void;
  deleteChallenge: (id: string) => void;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const ChallengeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const addChallenge = (challengeData: Omit<Challenge, 'id' | 'created_at' | 'participants'>) => {
    const newChallenge: Challenge = {
      ...challengeData,
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      participants: 0,
      created_at: new Date().toISOString(),
    };
    setChallenges(prev => [newChallenge, ...prev]);
    return newChallenge.id;
  };

  const updateChallenge = (id: string, updates: Partial<Challenge>) => {
    setChallenges(prev =>
      prev.map(challenge =>
        challenge.id === id ? { ...challenge, ...updates } : challenge
      )
    );
  };

  const joinChallenge = (id: string) => {
    setChallenges(prev =>
      prev.map(challenge => {
        if (challenge.id === id && challenge.participants < challenge.maxParticipants) {
          return { ...challenge, participants: challenge.participants + 1 };
        }
        return challenge;
      })
    );
  };

  const leaveChallenge = (id: string) => {
    setChallenges(prev =>
      prev.map(challenge => {
        if (challenge.id === id && challenge.participants > 0) {
          return { ...challenge, participants: challenge.participants - 1 };
        }
        return challenge;
      })
    );
  };

  const deleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(challenge => challenge.id !== id));
  };

  return (
    <ChallengeContext.Provider
      value={{
        challenges,
        addChallenge,
        updateChallenge,
        joinChallenge,
        leaveChallenge,
        deleteChallenge,
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
};

export const useChallenges = () => {
  const context = useContext(ChallengeContext);
  if (context === undefined) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return context;
};