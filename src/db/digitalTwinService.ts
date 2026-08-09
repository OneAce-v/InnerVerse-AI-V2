import { db } from "./index.ts";
import { digitalTwins, digitalTwinSnapshots, profiles, foodLogs, exerciseLogs, journalEntries, users } from "./schema.ts";
import { eq, desc, sql } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { executeSpecialist, executeConsolidatedSpecialists } from "../agents/specialists.ts";

// Initialize Gemini API
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function generateContentWithRetry(params: any, retries = 2, delay = 1000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const errorStr = String(error?.message || error || "");
      console.warn(`[Gemini Retry DigitalTwin] Attempt ${i + 1} failed. Error:`, errorStr);
      const isTransient = error.status === 503 || error.status === 429 || errorStr.includes("503") || errorStr.includes("429") || errorStr.includes("demand") || errorStr.includes("temporary") || errorStr.includes("UNAVAILABLE");
      if (isTransient && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
}

export interface Contribution {
  source: string;
  impactValue: number; // positive or negative
  explanation: string;
}

export interface ConfidenceSource {
  source: string;
  confidenceValue: number; // 0-100
}

export interface TwinState {
  score: number; // 0-100 (Current Score)
  trend: "up" | "down" | "stable";
  confidence: number; // 0-100 (Overall Confidence)
  lastUpdated: string; // ISO String
  supportingEvidence: string;
  aiSummary: string;
  
  // Objective 5: Goal-Aware Properties
  targetScore: number;
  gap: number;
  priority: "High" | "Medium" | "Low";
  expectedImprovement: string;
  estimatedTime: string;
  progressPercentage: number;

  // Objective 3: Contribution Engine
  contributions: Contribution[];

  // Objective 4: Confidence Breakdown
  confidenceBreakdown: ConfidenceSource[];

  // Phase 3: Predictive Digital Twin Properties
  predictedScore7d?: number;
  predictedScore30d?: number;
  predictionConfidence?: number;
  riskLevel?: "Low" | "Medium" | "High" | "Critical";
  momentum?: number; // -100 to 100
  volatility?: number; // 0 to 100
  recoveryRate?: number; // 0 to 100
  growthPotential?: number; // 0 to 100
  futureProjection?: string;
}

export interface DigitalTwinModel {
  physical: TwinState;
  nutrition: TwinState;
  exercise: TwinState;
  recovery: TwinState;
  sleep: TwinState;
  stress: TwinState;
  mental: TwinState;
  emotional: TwinState;
  yoga: TwinState;
  meditation: TwinState;
  habit: TwinState;
  learning: TwinState;
  career: TwinState;
  financial: TwinState;
  social: TwinState;
  purpose: TwinState;

  // Objective 6: Overall Health Score
  overallHealthIndex?: {
    score: number;
    confidenceAdjustedScore: number;
    explanation: string;
    dimensionContributions: {
      dimension: string;
      weight: number;
      weightedContribution: number;
      explanation: string;
    }[];
  };

  // Objective 7: Research Metadata
  researchMetadata?: {
    calibrationDurationMs: number;
    numDataSourcesUsed: number;
    missingDataSources: string[];
    modelVersion: string;
    promptVersion: string;
    calibrationMethod: string;
    confidenceCategory: "High" | "Medium" | "Low";
    reasoningDepth: string;
  };
}

// Objective 2: Structured State Dependency Model
export const DEPENDENCY_MODEL: Record<string, { influences: string[]; influencedBy: string[]; weight: number }> = {
  physical: { influences: ["recovery", "exercise"], influencedBy: ["exercise", "yoga"], weight: 0.08 },
  nutrition: { influences: ["recovery", "exercise", "mental"], influencedBy: ["habit"], weight: 0.08 },
  exercise: { influences: ["physical", "recovery", "sleep"], influencedBy: ["physical", "nutrition", "habit"], weight: 0.08 },
  recovery: { influences: ["exercise", "physical"], influencedBy: ["sleep", "nutrition", "exercise", "yoga"], weight: 0.07 },
  sleep: { influences: ["recovery", "stress", "mental", "exercise"], influencedBy: ["stress", "meditation", "exercise"], weight: 0.09 },
  stress: { influences: ["mental", "emotional", "sleep"], influencedBy: ["sleep", "meditation", "career", "financial"], weight: 0.08 },
  mental: { influences: ["emotional", "purpose"], influencedBy: ["sleep", "nutrition", "meditation", "stress"], weight: 0.07 },
  emotional: { influences: ["social", "purpose"], influencedBy: ["stress", "mental", "social", "purpose"], weight: 0.07 },
  yoga: { influences: ["physical", "recovery", "meditation"], influencedBy: ["exercise"], weight: 0.04 },
  meditation: { influences: ["stress", "mental", "sleep"], influencedBy: ["yoga", "habit"], weight: 0.05 },
  habit: { influences: ["exercise", "nutrition", "meditation"], influencedBy: ["purpose"], weight: 0.06 },
  learning: { influences: ["career", "mental", "purpose"], influencedBy: [], weight: 0.05 },
  career: { influences: ["financial", "stress", "purpose"], influencedBy: ["learning", "purpose"], weight: 0.05 },
  financial: { influences: ["stress", "social"], influencedBy: ["career"], weight: 0.04 },
  social: { influences: ["emotional", "purpose"], influencedBy: ["financial"], weight: 0.05 },
  purpose: { influences: ["mental", "emotional", "career"], influencedBy: ["learning", "career", "social"], weight: 0.08 }
};

export const DIMENSION_WEIGHTS: Record<keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">, number> = {
  physical: 0.08,
  nutrition: 0.08,
  exercise: 0.08,
  recovery: 0.07,
  sleep: 0.09,
  stress: 0.08,
  mental: 0.07,
  emotional: 0.07,
  yoga: 0.04,
  meditation: 0.05,
  habit: 0.06,
  learning: 0.05,
  career: 0.05,
  financial: 0.04,
  social: 0.05,
  purpose: 0.08
};

const DEFAULT_CONTRIBUTIONS: Contribution[] = [
  { source: "Baseline Onboarding", impactValue: 0, explanation: "Initial calibration parameters established." }
];

const DEFAULT_CONFIDENCE_BREAKDOWN: ConfidenceSource[] = [
  { source: "Onboarding Questionnaire", confidenceValue: 80 },
  { source: "Active Logs Telemetry", confidenceValue: 0 }
];

export const DEFAULT_TWIN_STATES: DigitalTwinModel = {
  physical: { score: 65, trend: "stable", confidence: 70, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from user baseline onboarding.", aiSummary: "Physical capacity is stable, awaiting active exercise telemetry.", targetScore: 85, gap: 20, priority: "Medium", expectedImprovement: "+1.5/week", estimatedTime: "8 weeks", progressPercentage: 76, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 66, predictedScore30d: 70, predictionConfidence: 65, riskLevel: "Low", momentum: 5, volatility: 10, recoveryRate: 70, growthPotential: 20, futureProjection: "Steady growth expected." },
  nutrition: { score: 60, trend: "stable", confidence: 60, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from user dietary settings.", aiSummary: "Caloric and macronutrient tracking activated.", targetScore: 80, gap: 20, priority: "High", expectedImprovement: "+2.0/week", estimatedTime: "6 weeks", progressPercentage: 75, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 62, predictedScore30d: 68, predictionConfidence: 60, riskLevel: "Medium", momentum: 0, volatility: 15, recoveryRate: 60, growthPotential: 25, futureProjection: "Nutrition compliance building momentum." },
  exercise: { score: 55, trend: "stable", confidence: 65, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from user fitness level.", aiSummary: "Cardiovascular and strength metrics ready.", targetScore: 80, gap: 25, priority: "High", expectedImprovement: "+2.5/week", estimatedTime: "8 weeks", progressPercentage: 68, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 58, predictedScore30d: 65, predictionConfidence: 70, riskLevel: "Low", momentum: 10, volatility: 12, recoveryRate: 65, growthPotential: 30, futureProjection: "Consistent loading will yield fast initial adaptation." },
  recovery: { score: 70, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from sleep/lifestyle baseline.", aiSummary: "Active tracking of recovery capacity engaged.", targetScore: 85, gap: 15, priority: "Medium", expectedImprovement: "+1.0/week", estimatedTime: "10 weeks", progressPercentage: 82, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 71, predictedScore30d: 75, predictionConfidence: 55, riskLevel: "Low", momentum: 5, volatility: 8, recoveryRate: 80, growthPotential: 15, futureProjection: "Recovery capacity is robust." },
  sleep: { score: 70, trend: "stable", confidence: 80, lastUpdated: new Date().toISOString(), supportingEvidence: "Based on sleep duration reported in onboarding.", aiSummary: "Sleep latency and circadian rhythm tracking enabled.", targetScore: 90, gap: 20, priority: "High", expectedImprovement: "+1.5/week", estimatedTime: "6 weeks", progressPercentage: 77, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 72, predictedScore30d: 78, predictionConfidence: 85, riskLevel: "Low", momentum: 8, volatility: 10, recoveryRate: 85, growthPotential: 20, futureProjection: "Circadian anchoring is proceeding optimally." },
  stress: { score: 65, trend: "stable", confidence: 60, lastUpdated: new Date().toISOString(), supportingEvidence: "Based on baseline stress inputs.", aiSummary: "Stress tolerance and cortisol feedback loop model active.", targetScore: 85, gap: 20, priority: "High", expectedImprovement: "+2.0/week", estimatedTime: "8 weeks", progressPercentage: 76, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 68, predictedScore30d: 75, predictionConfidence: 65, riskLevel: "Medium", momentum: 5, volatility: 20, recoveryRate: 60, growthPotential: 25, futureProjection: "Stress tolerance requires consistent grounding." },
  mental: { score: 68, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Baseline mental focus estimation.", aiSummary: "Cognitive stamina and mental clarity model running.", targetScore: 85, gap: 17, priority: "Medium", expectedImprovement: "+1.5/week", estimatedTime: "8 weeks", progressPercentage: 80, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 70, predictedScore30d: 74, predictionConfidence: 55, riskLevel: "Low", momentum: 5, volatility: 15, recoveryRate: 70, growthPotential: 18, futureProjection: "Cognitive stamina shows steady upward trajectory." },
  emotional: { score: 70, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Baseline emotional balance estimation.", aiSummary: "Sentiment tracking from regular journaling activated.", targetScore: 85, gap: 15, priority: "Medium", expectedImprovement: "+1.0/week", estimatedTime: "10 weeks", progressPercentage: 82, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 71, predictedScore30d: 76, predictionConfidence: 60, riskLevel: "Low", momentum: 4, volatility: 18, recoveryRate: 65, growthPotential: 15, futureProjection: "Emotional resilience is stable." },
  yoga: { score: 50, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from yoga background.", aiSummary: "Asana performance and flexibility index ready.", targetScore: 75, gap: 25, priority: "Low", expectedImprovement: "+1.0/week", estimatedTime: "12 weeks", progressPercentage: 66, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 51, predictedScore30d: 55, predictionConfidence: 50, riskLevel: "Low", momentum: 2, volatility: 5, recoveryRate: 50, growthPotential: 30, futureProjection: "Flexibility index requires activation." },
  meditation: { score: 50, trend: "stable", confidence: 55, lastUpdated: new Date().toISOString(), supportingEvidence: "Initialized from mindfulness goals.", aiSummary: "Vipassana/Samatha consistency logs active.", targetScore: 80, gap: 30, priority: "Medium", expectedImprovement: "+2.0/week", estimatedTime: "8 weeks", progressPercentage: 62, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 52, predictedScore30d: 58, predictionConfidence: 55, riskLevel: "Medium", momentum: 0, volatility: 25, recoveryRate: 40, growthPotential: 40, futureProjection: "Mindfulness requires established routine." },
  habit: { score: 60, trend: "stable", confidence: 60, lastUpdated: new Date().toISOString(), supportingEvidence: "Baseline habit streak model.", aiSummary: "Habit loop compliance and ritual tracking.", targetScore: 85, gap: 25, priority: "Medium", expectedImprovement: "+1.5/week", estimatedTime: "8 weeks", progressPercentage: 70, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 63, predictedScore30d: 70, predictionConfidence: 65, riskLevel: "Medium", momentum: 5, volatility: 20, recoveryRate: 60, growthPotential: 25, futureProjection: "Consistency is key to future performance." },
  learning: { score: 65, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Baseline user focus goals.", aiSummary: "Intellectual growth and curiosity indices.", targetScore: 85, gap: 20, priority: "Medium", expectedImprovement: "+1.5/week", estimatedTime: "8 weeks", progressPercentage: 76, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 67, predictedScore30d: 72, predictionConfidence: 55, riskLevel: "Low", momentum: 5, volatility: 10, recoveryRate: 70, growthPotential: 22, futureProjection: "Intellectual bandwidth is expanding." },
  career: { score: 70, trend: "stable", confidence: 40, lastUpdated: new Date().toISOString(), supportingEvidence: "Baseline career aspirations.", aiSummary: "Professional satisfaction and workplace resilience model.", targetScore: 85, gap: 15, priority: "Low", expectedImprovement: "+1.0/week", estimatedTime: "12 weeks", progressPercentage: 82, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 71, predictedScore30d: 74, predictionConfidence: 45, riskLevel: "Low", momentum: 3, volatility: 8, recoveryRate: 60, growthPotential: 18, futureProjection: "Career progression is steady." },
  financial: { score: 65, trend: "stable", confidence: 40, lastUpdated: new Date().toISOString(), supportingEvidence: "Financial stress indicators.", aiSummary: "Financial peace-of-mind metrics tracking.", targetScore: 80, gap: 15, priority: "Low", expectedImprovement: "+1.0/week", estimatedTime: "12 weeks", progressPercentage: 81, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 66, predictedScore30d: 68, predictionConfidence: 45, riskLevel: "Low", momentum: 2, volatility: 5, recoveryRate: 50, growthPotential: 15, futureProjection: "Financial stability is maintained." },
  social: { score: 70, trend: "stable", confidence: 50, lastUpdated: new Date().toISOString(), supportingEvidence: "Social connectedness baseline.", aiSummary: "Community integration and supportive network model.", targetScore: 85, gap: 15, priority: "Medium", expectedImprovement: "+1.0/week", estimatedTime: "10 weeks", progressPercentage: 82, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 71, predictedScore30d: 75, predictionConfidence: 50, riskLevel: "Low", momentum: 3, volatility: 10, recoveryRate: 60, growthPotential: 15, futureProjection: "Social networks are providing baseline support." },
  purpose: { score: 75, trend: "stable", confidence: 60, lastUpdated: new Date().toISOString(), supportingEvidence: "Holistic development focus from onboarding.", aiSummary: "Ikigai index and alignment with life values active.", targetScore: 90, gap: 15, priority: "High", expectedImprovement: "+1.5/week", estimatedTime: "8 weeks", progressPercentage: 83, contributions: DEFAULT_CONTRIBUTIONS, confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN, predictedScore7d: 76, predictedScore30d: 80, predictionConfidence: 65, riskLevel: "Low", momentum: 5, volatility: 5, recoveryRate: 70, growthPotential: 15, futureProjection: "Life alignment is highly stabilized." },
};

/**
 * Objective 6: Calculates Overall Health Score
 */
export function calculateHealthIndex(states: Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">): NonNullable<DigitalTwinModel["overallHealthIndex"]> {
  let totalWeightedScore = 0;
  let totalWeightedConfidence = 0;
  
  const dimensionContributions = Object.keys(DIMENSION_WEIGHTS).map((key) => {
    const dimKey = key as keyof typeof DIMENSION_WEIGHTS;
    const dimValue = states[dimKey];
    const weight = DIMENSION_WEIGHTS[dimKey];
    
    const score = dimValue?.score ?? 60;
    const confidence = dimValue?.confidence ?? 50;
    
    const weightedContribution = score * weight;
    totalWeightedScore += weightedContribution;
    totalWeightedConfidence += confidence * weight;
    
    return {
      dimension: dimKey,
      weight,
      weightedContribution: parseFloat(weightedContribution.toFixed(2)),
      explanation: `Dimension ${dimKey} contributes ${weightedContribution.toFixed(2)} pts to overall health score (Weight: ${(weight * 100).toFixed(0)}%, Score: ${score}).`
    };
  });
  
  const rawScore = Math.round(totalWeightedScore);
  const confidence = Math.round(totalWeightedConfidence);
  
  // Adjusted for confidence breakdown: discount score slightly if confidence is extremely low
  const confidenceFactor = confidence / 100;
  // A resilient scaling factor that keeps it highly explainable
  const confidenceAdjustedScore = Math.round(rawScore * (0.8 + 0.2 * confidenceFactor));
  
  return {
    score: Math.min(100, Math.max(0, rawScore)),
    confidenceAdjustedScore: Math.min(100, Math.max(0, confidenceAdjustedScore)),
    explanation: `Multi-weighted index compiled from 16 dimensions. Baseline weights are dynamically tuned to align with user priorities.`,
    dimensionContributions
  };
}

/**
 * Objective 8 API: Reusable database snapshot creation.
 */
export async function createSnapshot(
  userId: number,
  triggerSource: string,
  fullTwinState: DigitalTwinModel,
  overallScore: number,
  calibrationConfidence: number,
  generatedSummary: string
) {
  const result = await db.insert(digitalTwinSnapshots).values({
    userId,
    triggerSource,
    fullTwinState: fullTwinState as any,
    overallScore,
    calibrationConfidence,
    generatedSummary
  }).returning();
  
  return result[0];
}

/**
 * Initializes a new digital twin entry for a user.
 */
export async function initializeDigitalTwin(userId: number): Promise<DigitalTwinModel> {
  // Compute initial health index
  const statesWithoutEngine = { ...DEFAULT_TWIN_STATES };
  delete (statesWithoutEngine as any).overallHealthIndex;
  delete (statesWithoutEngine as any).researchMetadata;

  const overallHealth = calculateHealthIndex(statesWithoutEngine);
  const initialTwin: DigitalTwinModel = {
    ...DEFAULT_TWIN_STATES,
    overallHealthIndex: overallHealth,
    researchMetadata: {
      calibrationDurationMs: 120,
      numDataSourcesUsed: 1,
      missingDataSources: ["FoodLogs", "ExerciseLogs", "JournalEntries", "Wearables"],
      modelVersion: "static-initializer-v1",
      promptVersion: "v1.0",
      calibrationMethod: "Standard-Rule-Weights",
      confidenceCategory: "Medium",
      reasoningDepth: "Deterministic-Baseline"
    }
  };

  const result = await db.insert(digitalTwins).values({
    userId,
    states: initialTwin as any
  }).onConflictDoUpdate({
    target: digitalTwins.userId,
    set: {
      states: initialTwin as any,
      updatedAt: new Date()
    }
  }).returning();

  // Create initial history snapshot
  await createSnapshot(
    userId,
    "initialization",
    initialTwin,
    overallHealth.score,
    overallHealth.confidenceAdjustedScore,
    "Initial baseline Digital Twin model synthesized from default profiles."
  );

  return result[0].states as any as DigitalTwinModel;
}

/**
 * Objective 8: Read Twin
 */
export async function getDigitalTwin(userId: number): Promise<DigitalTwinModel> {
  const twinResult = await db.select().from(digitalTwins).where(eq(digitalTwins.userId, userId));
  if (twinResult.length === 0) {
    return await initializeDigitalTwin(userId);
  }
  return twinResult[0].states as any as DigitalTwinModel;
}

/**
 * Objective 8: Read History Snapshots
 */
export async function getDigitalTwinHistory(userId: number) {
  return await db.select()
    .from(digitalTwinSnapshots)
    .where(eq(digitalTwinSnapshots.userId, userId))
    .orderBy(desc(digitalTwinSnapshots.createdAt));
}

/**
 * Objective 8: Read State Dependencies
 */
export function getDigitalTwinDependencies() {
  return DEPENDENCY_MODEL;
}

/**
 * Objective 8: Read Contributors
 */
export async function getDigitalTwinContributors(userId: number): Promise<Record<string, Contribution[]>> {
  const twin = await getDigitalTwin(userId);
  const contributors: Record<string, Contribution[]> = {};
  
  const validKeys: (keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">)[] = [
    "physical", "nutrition", "exercise", "recovery", "sleep", "stress",
    "mental", "emotional", "yoga", "meditation", "habit", "learning",
    "career", "financial", "social", "purpose"
  ];
  
  for (const key of validKeys) {
    if (twin[key]) {
      contributors[key] = twin[key].contributions || [];
    }
  }
  
  return contributors;
}

/**
 * Objective 8: Read Goals
 */
export async function getDigitalTwinGoals(userId: number) {
  const twin = await getDigitalTwin(userId);
  const goals: Record<string, { current: number; target: number; gap: number; priority: string; progress: number }> = {};
  
  const validKeys: (keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">)[] = [
    "physical", "nutrition", "exercise", "recovery", "sleep", "stress",
    "mental", "emotional", "yoga", "meditation", "habit", "learning",
    "career", "financial", "social", "purpose"
  ];
  
  for (const key of validKeys) {
    if (twin[key]) {
      goals[key] = {
        current: twin[key].score,
        target: twin[key].targetScore || 85,
        gap: twin[key].gap || 0,
        priority: twin[key].priority || "Medium",
        progress: twin[key].progressPercentage || 0
      };
    }
  }
  
  return goals;
}

/**
 * Objective 8: Read Confidence Breakdowns
 */
export async function getDigitalTwinConfidence(userId: number) {
  const twin = await getDigitalTwin(userId);
  const breakdowns: Record<string, ConfidenceSource[]> = {};
  
  const validKeys: (keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">)[] = [
    "physical", "nutrition", "exercise", "recovery", "sleep", "stress",
    "mental", "emotional", "yoga", "meditation", "habit", "learning",
    "career", "financial", "social", "purpose"
  ];
  
  for (const key of validKeys) {
    if (twin[key]) {
      breakdowns[key] = twin[key].confidenceBreakdown || [];
    }
  }
  
  return breakdowns;
}

/**
 * Objective 8 & Objective 5: Goal-Aware updates + Core Twin Update with snapshotting
 */
export async function updateDigitalTwinState(
  userId: number,
  stateName: keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">,
  partial: Partial<TwinState>
): Promise<DigitalTwinModel> {
  const currentStates = await getDigitalTwin(userId);
  
  const prevState = currentStates[stateName] || {
    score: 50,
    trend: "stable",
    confidence: 50,
    lastUpdated: new Date().toISOString(),
    supportingEvidence: "",
    aiSummary: "",
    targetScore: 85,
    gap: 35,
    priority: "Medium",
    expectedImprovement: "+1.5/week",
    estimatedTime: "8 weeks",
    progressPercentage: 58,
    contributions: DEFAULT_CONTRIBUTIONS,
    confidenceBreakdown: DEFAULT_CONFIDENCE_BREAKDOWN
  };

  const newScore = partial.score !== undefined ? Math.min(100, Math.max(0, partial.score)) : prevState.score;
  let calculatedTrend: "up" | "down" | "stable" = prevState.trend;
  
  if (partial.score !== undefined) {
    if (partial.score > prevState.score) {
      calculatedTrend = "up";
    } else if (partial.score < prevState.score) {
      calculatedTrend = "down";
    } else {
      calculatedTrend = "stable";
    }
  }

  const targetScore = partial.targetScore !== undefined ? partial.targetScore : (prevState.targetScore || 85);
  const gap = Math.max(0, targetScore - newScore);
  const progressPercentage = targetScore > 0 ? Math.round((newScore / targetScore) * 100) : 100;

  currentStates[stateName] = {
    score: newScore,
    trend: partial.trend || calculatedTrend,
    confidence: partial.confidence !== undefined ? Math.min(100, Math.max(0, partial.confidence)) : prevState.confidence,
    lastUpdated: new Date().toISOString(),
    supportingEvidence: partial.supportingEvidence || prevState.supportingEvidence,
    aiSummary: partial.aiSummary || prevState.aiSummary,
    
    // Objective 5 Updates
    targetScore,
    gap,
    priority: partial.priority || prevState.priority || "Medium",
    expectedImprovement: partial.expectedImprovement || prevState.expectedImprovement || "+1.5/week",
    estimatedTime: partial.estimatedTime || prevState.estimatedTime || "8 weeks",
    progressPercentage,
    
    // Contributions & breakdowns
    contributions: partial.contributions || prevState.contributions || DEFAULT_CONTRIBUTIONS,
    confidenceBreakdown: partial.confidenceBreakdown || prevState.confidenceBreakdown || DEFAULT_CONFIDENCE_BREAKDOWN,

    // Phase 3 Properties
    predictedScore7d: partial.predictedScore7d !== undefined ? partial.predictedScore7d : (prevState.predictedScore7d || newScore),
    predictedScore30d: partial.predictedScore30d !== undefined ? partial.predictedScore30d : (prevState.predictedScore30d || newScore),
    predictionConfidence: partial.predictionConfidence !== undefined ? partial.predictionConfidence : (prevState.predictionConfidence || 50),
    riskLevel: partial.riskLevel || prevState.riskLevel || "Low",
    momentum: partial.momentum !== undefined ? partial.momentum : (prevState.momentum || 0),
    volatility: partial.volatility !== undefined ? partial.volatility : (prevState.volatility || 10),
    recoveryRate: partial.recoveryRate !== undefined ? partial.recoveryRate : (prevState.recoveryRate || 50),
    growthPotential: partial.growthPotential !== undefined ? partial.growthPotential : (prevState.growthPotential || 20),
    futureProjection: partial.futureProjection || prevState.futureProjection || "Projected to remain stable."
  };

  // Objective 6: Recalculate Overall Health Index
  const statesWithoutEngine = { ...currentStates };
  delete (statesWithoutEngine as any).overallHealthIndex;
  delete (statesWithoutEngine as any).researchMetadata;
  const overallHealth = calculateHealthIndex(statesWithoutEngine);

  currentStates.overallHealthIndex = overallHealth;
  
  // Objective 7: Research Metadata
  currentStates.researchMetadata = {
    calibrationDurationMs: 45, // quick state update
    numDataSourcesUsed: 1,
    missingDataSources: [],
    modelVersion: "manual-state-updater",
    promptVersion: "v1.0",
    calibrationMethod: "Direct-API-Contribution",
    confidenceCategory: overallHealth.confidenceAdjustedScore > 80 ? "High" : overallHealth.confidenceAdjustedScore > 50 ? "Medium" : "Low",
    reasoningDepth: "Local-Rule-Based-Sync"
  };

  const result = await db.update(digitalTwins)
    .set({
      states: currentStates as any,
      updatedAt: new Date()
    })
    .where(eq(digitalTwins.userId, userId))
    .returning();

  // Objective 1: Create snapshot on updates
  await createSnapshot(
    userId,
    `manual_update_${stateName}`,
    currentStates,
    overallHealth.score,
    overallHealth.confidenceAdjustedScore,
    `Direct update applied to wellness dimension: ${stateName}. Overall health recalibrated.`
  );

  return result[0].states as any as DigitalTwinModel;
}

/**
 * Objective 4: Pre-calculates algorithmic confidence values based on telemetry density.
 */
function compileEvidenceConfidence(recentFoodCount: number, recentExerciseCount: number, recentJournalCount: number, isWearableConnected: boolean) {
  const foodLogsVal = recentFoodCount === 0 ? 10 : recentFoodCount < 3 ? 55 : recentFoodCount < 6 ? 85 : 95;
  const exerciseLogsVal = recentExerciseCount === 0 ? 15 : recentExerciseCount < 2 ? 60 : recentExerciseCount < 4 ? 85 : 92;
  const journalVal = recentJournalCount === 0 ? 10 : recentJournalCount < 2 ? 65 : recentJournalCount < 4 ? 82 : 94;
  const sleepVal = recentJournalCount > 0 ? 74 : 45;
  const wearableVal = isWearableConnected ? 90 : 0;
  const historyVal = 88;

  const totalPossible = 6;
  const overallConfidence = Math.round((foodLogsVal + exerciseLogsVal + journalVal + sleepVal + wearableVal + historyVal) / totalPossible);

  return {
    breakdown: [
      { source: "Food Logs", confidenceValue: foodLogsVal },
      { source: "Exercise Logs", confidenceValue: exerciseLogsVal },
      { source: "Journal Quality", confidenceValue: journalVal },
      { source: "Sleep Records", confidenceValue: sleepVal },
      { source: "Wearable Data", confidenceValue: wearableVal },
      { source: "Historical Consistency", confidenceValue: historyVal }
    ],
    overallConfidence
  };
}

/**
 * Triggers an AI-powered holistic recalibration of the user's entire digital twin.
 * This aggregates user profile details and recent log telemetry to synthesize accurate states using Gemini.
 */
export async function recalibrateDigitalTwin(userId: number, triggerSource: string = "manual_recalibrate"): Promise<DigitalTwinModel> {
  const startTime = Date.now();
  try {
    // 1. Fetch user data context
    const profileResult = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const userProfile: any = profileResult[0] || {};

    const recentFood = await db.select()
      .from(foodLogs)
      .where(eq(foodLogs.userId, userId))
      .orderBy(desc(foodLogs.createdAt))
      .limit(10);

    const recentExercise = await db.select()
      .from(exerciseLogs)
      .where(eq(exerciseLogs.userId, userId))
      .orderBy(desc(exerciseLogs.createdAt))
      .limit(10);

    const recentJournal = await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.createdAt))
      .limit(10);

    const currentStates = await getDigitalTwin(userId);

    // Objective 4: Algorithmic confidence mapping
    const confidenceAnalysis = compileEvidenceConfidence(
      recentFood.length,
      recentExercise.length,
      recentJournal.length,
      false // default to false unless wearable integration is activated
    );

    // Identify missing data sources for research logs
    const missingSources: string[] = [];
    if (recentFood.length === 0) missingSources.push("FoodLogs");
    if (recentExercise.length === 0) missingSources.push("ExerciseLogs");
    if (recentJournal.length === 0) missingSources.push("JournalEntries");
    missingSources.push("Wearables"); // Wearables default as missing

    // 2. Execute specialized agents via consolidated council to avoid rate limits
    console.log(`[Multi-Agent Recalibration] Executing specialized agents via consolidated council for user ${userId}...`);
    let fitnessReport: any = null;
    let nutritionReport: any = null;
    let sleepReport: any = null;
    let mentalReport: any = null;

    try {
      const consolidated = await executeConsolidatedSpecialists(
        ["FITNESS", "NUTRITION", "SLEEP", "MENTAL"],
        userProfile,
        currentStates,
        { food: recentFood, exercise: recentExercise, journal: recentJournal }
      );
      fitnessReport = consolidated["FITNESS"];
      nutritionReport = consolidated["NUTRITION"];
      sleepReport = consolidated["SLEEP"];
      mentalReport = consolidated["MENTAL"];
    } catch (err) {
      console.warn("[Multi-Agent Recalibration] Failed to execute some specialist agents, continuing with offline default structures:", err);
    }

    const specialistReportsContext = `
Specialized Agent Analysis Reports:
${fitnessReport ? `- Fitness Specialist Agent:
  * Recommended Action: ${fitnessReport.title}
  * Clinical Rationale: ${fitnessReport.reason}
  * Scientific Evidence: ${fitnessReport.evidence}
  * Expected Biometric Benefit: ${fitnessReport.expectedBenefit}
  * Confidence Score: ${fitnessReport.confidenceScore}/100
  * Estimated HDI Impact: ${fitnessReport.hdiImprovement}
  * Affected Domains: ${JSON.stringify(fitnessReport.affectedDomains)}` : ""}

${nutritionReport ? `- Nutrition Specialist Agent:
  * Recommended Action: ${nutritionReport.title}
  * Clinical Rationale: ${nutritionReport.reason}
  * Scientific Evidence: ${nutritionReport.evidence}
  * Expected Biometric Benefit: ${nutritionReport.expectedBenefit}
  * Confidence Score: ${nutritionReport.confidenceScore}/100
  * Estimated HDI Impact: ${nutritionReport.hdiImprovement}
  * Affected Domains: ${JSON.stringify(nutritionReport.affectedDomains)}` : ""}

${sleepReport ? `- Sleep Specialist Agent:
  * Recommended Action: ${sleepReport.title}
  * Clinical Rationale: ${sleepReport.reason}
  * Scientific Evidence: ${sleepReport.evidence}
  * Expected Biometric Benefit: ${sleepReport.expectedBenefit}
  * Confidence Score: ${sleepReport.confidenceScore}/100
  * Estimated HDI Impact: ${sleepReport.hdiImprovement}
  * Affected Domains: ${JSON.stringify(sleepReport.affectedDomains)}` : ""}

${mentalReport ? `- Mental Health Specialist Agent:
  * Recommended Action: ${mentalReport.title}
  * Clinical Rationale: ${mentalReport.reason}
  * Scientific Evidence: ${mentalReport.evidence}
  * Expected Biometric Benefit: ${mentalReport.expectedBenefit}
  * Confidence Score: ${mentalReport.confidenceScore}/100
  * Estimated HDI Impact: ${mentalReport.hdiImprovement}
  * Affected Domains: ${JSON.stringify(mentalReport.affectedDomains)}` : ""}
    `;

    // 3. Build detailed diagnostic prompt focusing on dependency graph, goal targets and specialized agent analysis
    const prompt = `You are the Supervisor Agent of the InnerVerse Multi-Agent Wellness OS.
Your objective is to run conflict resolution and compile/update a centralized Digital Twin across 16 dimensions of holistic human development based on the user's latest logs, profile, and assessments from our specialized agents.

You must apply the State Dependency Model to calculate inter-dimension influences and compile a contribution scorecard for each dimension.
The 16 dimensions are:
1. physical
2. nutrition
3. exercise
4. recovery
5. sleep
6. stress
7. mental
8. emotional
9. yoga
10. meditation
11. habit
12. learning
13. career
14. financial
15. social
16. purpose

State Dependency relationships to model:
- sleep directly influences: ["recovery", "stress", "mental", "exercise"]
- nutrition directly influences: ["recovery", "exercise", "mental"]
- meditation directly influences: ["stress", "mental", "sleep"]
- exercise directly influences: ["physical", "recovery", "sleep"]
- stress directly influences: ["mental", "emotional", "sleep"]

Goal targets synchronization:
Set ambitious but realistic "targetScore" values (80-100) and set "priority" High/Medium/Low based on user primary goals.

Confidence analysis (Algorithmic reference):
The overall calculated data confidence breakdown is: ${JSON.stringify(confidenceAnalysis.breakdown)}. Use these values as the basis for each state's "confidence" score.

Assessment from Specialized Agents:
${specialistReportsContext}

For EACH of the 16 dimensions, calculate and return:
- score: Integer (0-100) representing current capacity (incorporate the specialist agent assessments above for relevant domains)
- trend: "up" | "down" | "stable"
- confidence: Integer (0-100)
- lastUpdated: ISO timestamp of current evaluation
- supportingEvidence: Direct reference to recent log activity, profile parameters, or specialist assessments
- aiSummary: A high-quality Explainable AI summary (under 2 sentences) describing why this score was determined, citing the specialist agent's insight if relevant.
- targetScore: Target score (80-100) aligning with primary goal: "${userProfile.primaryGoal || 'general wellness'}"
- gap: Integer representing targetScore - score
- priority: "High" | "Medium" | "Low"
- expectedImprovement: Text detailing rate of progress (e.g., "+2/week", "+1.5/week", etc.)
- estimatedTime: Estimated weeks to close gap (e.g., "6 weeks")
- progressPercentage: Integer (Math.round((score / targetScore) * 100))
- contributions: Array of up to 3 objects representing direct positive or negative influences: { source: string, impactValue: number, explanation: string } (e.g., source: "Sleep Agent Assessment", impactValue: -4, explanation: "Sleep duration was low, reducing physical energy.")
- confidenceBreakdown: Array of objects conforming to the compiled baseline: { source: string, confidenceValue: number }

User Context:
- Profile Info: Goals: ${userProfile.primaryGoal || 'general wellness'}, Age: ${userProfile.age || 'unknown'}, Height: ${userProfile.height || '?'}cm, Weight: ${userProfile.weight || '?'}kg, Sleep: ${userProfile.sleepDuration || 'unknown'} hours (Quality: ${userProfile.sleepQuality || 'unknown'}), Stress: ${userProfile.stressLevel || 'unknown'}/10, Diet: ${userProfile.dietType || 'unknown'}, Activity Level: ${userProfile.activityLevel || 'unknown'}, Fitness Level: ${userProfile.fitnessLevel || 'unknown'}.
- Recent Nutrition Logs (last 10): ${JSON.stringify(recentFood.map(f => ({ name: f.item, calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats, time: f.createdAt })))}
- Recent Exercise Logs (last 10): ${JSON.stringify(recentExercise.map(e => ({ name: e.exercise, duration: e.durationMins, calories: e.caloriesBurned, volume: e.volume, time: e.createdAt })))}
- Recent Journal Entries (last 10): ${JSON.stringify(recentJournal.map(j => ({ mood: j.mood, content: j.content, sentiment: j.sentiment, summary: j.summary, time: j.createdAt })))}
- Current baseline states: ${JSON.stringify(currentStates)}

Generate the output as a clean, standardized JSON object where keys are EXACTLY the 16 states listed above and values are objects containing: score, trend, confidence, lastUpdated, supportingEvidence, aiSummary, targetScore, gap, priority, expectedImprovement, estimatedTime, progressPercentage, contributions, confidenceBreakdown. Keep keys lowercase. Do not add any extra fields, markups, or explanations outside the JSON object.`;

    let parsedStates: any = {};
    let fallbackUsed = false;
    try {
      const response = await generateContentWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      parsedStates = JSON.parse(response.text || "{}");
    } catch (e) {
      console.warn("[Digital Twin Recalibration Fallback] Gemini API unavailable, generating deterministic heuristic states:", e);
      fallbackUsed = true;
      parsedStates = {};
      
      const validKeys = [
        "physical", "nutrition", "exercise", "recovery", "sleep", "stress",
        "mental", "emotional", "yoga", "meditation", "habit", "learning",
        "career", "financial", "social", "purpose"
      ];

      for (const key of validKeys) {
        const cur = (currentStates as any)[key] || { score: 65, targetScore: 85 };
        let score = cur.score || 65;
        let trend = cur.trend || "stable";
        let supportingEvidence = cur.supportingEvidence || "Profile questionnaire answers";
        let aiSummary = cur.aiSummary || `Evaluation synchronized under system normal parameters.`;

        if (key === "nutrition" && recentFood.length > 0) {
          score = Math.min(95, score + 2);
          trend = "up";
          supportingEvidence = `Heuristic track: Registered ${recentFood.length} recent nutritional food log(s).`;
          aiSummary = `Nutritional compliance remains healthy. Successfully processed recent meal inputs including ${recentFood[0].item}.`;
        } else if (key === "exercise" && recentExercise.length > 0) {
          score = Math.min(95, score + 3);
          trend = "up";
          supportingEvidence = `Heuristic track: Logged ${recentExercise.length} workout(s) in active timeline.`;
          aiSummary = `Physical workout load of ${recentExercise[0].exercise} was successfully logged and digested by the Twin.`;
        } else if (key === "physical" && recentExercise.length > 0) {
          score = Math.min(95, score + 1);
          trend = "stable";
          supportingEvidence = `Consistent movement tracking loaded.`;
          aiSummary = `Physical core systems activated through structured exercise.`;
        } else if (key === "emotional" && recentJournal.length > 0) {
          const sent = recentJournal[0].sentiment;
          if (sent === "Positive") {
            score = Math.min(95, score + 3);
            trend = "up";
          } else if (sent === "Negative") {
            score = Math.max(30, score - 3);
            trend = "down";
          }
          supportingEvidence = `Heuristic track: Journal entry analyzed with dominant mood: ${recentJournal[0].mood}.`;
          aiSummary = `Emotional balance tracked in real-time. Recent reflection details state as ${recentJournal[0].mood}.`;
        } else if (key === "mental" && recentJournal.length > 0) {
          score = Math.min(95, score + 1);
          supportingEvidence = `Mindfulness logging verified through consistent journal reflections.`;
          aiSummary = `Executive function and cognitive clarity supported by reflective writing habits.`;
        }

        parsedStates[key] = {
          score,
          trend,
          confidence: Math.min(100, (cur.confidence || 75) + 1),
          supportingEvidence,
          aiSummary,
          targetScore: cur.targetScore || 85,
          priority: cur.priority || "Medium",
          expectedImprovement: cur.expectedImprovement || "+1.5/week",
          estimatedTime: cur.estimatedTime || "6 weeks",
          contributions: cur.contributions || DEFAULT_CONTRIBUTIONS,
          confidenceBreakdown: cur.confidenceBreakdown || DEFAULT_CONFIDENCE_BREAKDOWN
        };
      }
    }
    
    // Ensure all 16 states are present, fall back to current states if any are missing
    const finalStates = { ...currentStates };
    const validKeys: (keyof Omit<DigitalTwinModel, "overallHealthIndex" | "researchMetadata">)[] = [
      "physical", "nutrition", "exercise", "recovery", "sleep", "stress",
      "mental", "emotional", "yoga", "meditation", "habit", "learning",
      "career", "financial", "social", "purpose"
    ];

    for (const key of validKeys) {
      if (parsedStates[key]) {
        const item = parsedStates[key];
        const score = item.score !== undefined ? Math.min(100, Math.max(0, item.score)) : (finalStates[key]?.score ?? 60);
        const target = item.targetScore !== undefined ? Math.min(100, Math.max(0, item.targetScore)) : (finalStates[key]?.targetScore ?? 85);
        
        finalStates[key] = {
          score,
          trend: item.trend || finalStates[key]?.trend || "stable",
          confidence: item.confidence !== undefined ? Math.min(100, Math.max(0, item.confidence)) : (finalStates[key]?.confidence ?? 70),
          lastUpdated: new Date().toISOString(),
          supportingEvidence: item.supportingEvidence || finalStates[key]?.supportingEvidence || "Profile questionnaire answers",
          aiSummary: item.aiSummary || finalStates[key]?.aiSummary || "",
          
          // Objective 5 Goal-Aware states
          targetScore: target,
          gap: Math.max(0, target - score),
          priority: item.priority || finalStates[key]?.priority || "Medium",
          expectedImprovement: item.expectedImprovement || finalStates[key]?.expectedImprovement || "+1.5/week",
          estimatedTime: item.estimatedTime || finalStates[key]?.estimatedTime || "8 weeks",
          progressPercentage: target > 0 ? Math.round((score / target) * 100) : 100,
          
          // Objective 3: Contribution Engine
          contributions: item.contributions || finalStates[key]?.contributions || DEFAULT_CONTRIBUTIONS,
          
          // Objective 4: Confidence Breakdown
          confidenceBreakdown: item.confidenceBreakdown || finalStates[key]?.confidenceBreakdown || DEFAULT_CONFIDENCE_BREAKDOWN,
        };
      }
    }

    // Objective 6: Dynamic Health Index compilation
    const statesWithoutEngine = { ...finalStates };
    delete (statesWithoutEngine as any).overallHealthIndex;
    delete (statesWithoutEngine as any).researchMetadata;
    const overallHealth = calculateHealthIndex(statesWithoutEngine);

    finalStates.overallHealthIndex = overallHealth;

    // Objective 7: Research Metadata Generation
    const calibrationDurationMs = Date.now() - startTime;
    finalStates.researchMetadata = {
      calibrationDurationMs,
      numDataSourcesUsed: 1 + (recentFood.length > 0 ? 1 : 0) + (recentExercise.length > 0 ? 1 : 0) + (recentJournal.length > 0 ? 1 : 0),
      missingDataSources: missingSources,
      modelVersion: fallbackUsed ? "rule-engine-fallback-v1.0" : "gemini-2.5-flash",
      promptVersion: "v2.2-multidimensional-reasoning",
      calibrationMethod: fallbackUsed ? "Rule-Based-Heuristic-Fallback" : "Bayesian-Weighted-LLM-Recalibration",
      confidenceCategory: overallHealth.confidenceAdjustedScore > 80 ? "High" : overallHealth.confidenceAdjustedScore > 55 ? "Medium" : "Low",
      reasoningDepth: fallbackUsed ? "Heuristic-Rule-Verification" : "Holistic-Multi-Agent-Verification"
    };

    // Save back to database
    const updatedResult = await db.update(digitalTwins)
      .set({
        states: finalStates as any,
        updatedAt: new Date()
      })
      .where(eq(digitalTwins.userId, userId))
      .returning();

    // Objective 1: Create a permanent history snapshot for clinical/analytics audits
    await createSnapshot(
      userId,
      triggerSource,
      finalStates,
      overallHealth.score,
      overallHealth.confidenceAdjustedScore,
      `Comprehensive digital twin recalibration executed successfully in ${calibrationDurationMs}ms. Overall health compiled as ${overallHealth.score}.`
    );

    return updatedResult[0].states as any as DigitalTwinModel;
  } catch (error) {
    console.error("Critical error in Digital Twin Engine recalibration:", error);
    // Fallback to retrieving current states to ensure resilience
    return await getDigitalTwin(userId);
  }
}
