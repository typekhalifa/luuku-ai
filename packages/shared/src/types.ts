// packages/shared/src/types.ts

export interface Prospect {
  id: string;
  name: string;
  industry: string;
  painPoints: string[];
  opportunityScore: number; // 0-100
  outreachReady: boolean;
  suggestedOffer: string;
  decisionMaker?: string;
  pilotShape?: string;
  researchLogs: ResearchLog[];
}

export interface ResearchLog {
  id: string;
  prospectId: string;
  timestamp: Date;
  summary: string;
  tags: string[];
  confidence: "low" | "medium" | "high";
}

export interface DailyPlan {
  date: string;
  priorities: Task[];
  carryover: Task[];
  blocked: Task[];
}

export interface Task {
  id: string;
  title: string;
  status: "todo" | "done" | "carry" | "blocked" | "dropped";
  blockerNote?: string;
  strategic: boolean;
}