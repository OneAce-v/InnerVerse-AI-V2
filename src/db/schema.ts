import { relations } from 'drizzle-orm';
import { pgTable, serial, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  fullName: text('full_name'),
  role: text('role').default('user'), // 'user' or 'admin'
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  
  // Personal Info
  age: integer('age'),
  gender: text('gender'),
  height: integer('height'), // in cm
  weight: integer('weight'), // in kg
  
  // Lifestyle & Basic
  occupation: text('occupation'),
  sleepDuration: text('sleep_duration'),
  primaryGoal: text('primary_goal'),
  
  // Extended Questionnaire Fields
  secondaryGoals: jsonb('secondary_goals'), // array
  fitnessLevel: text('fitness_level'),
  activityLevel: text('activity_level'),
  workoutExperience: text('workout_experience'),
  availableEquipment: jsonb('available_equipment'), // array
  exercisePreference: jsonb('exercise_preference'), // array
  workoutLocation: text('workout_location'),
  availableDays: text('available_days'),
  sessionDuration: text('session_duration'),
  preferredWorkoutTime: text('preferred_workout_time'),
  sleepQuality: text('sleep_quality'),
  stressLevel: integer('stress_level'), // 1-10
  dietType: text('diet_type'),
  waterIntake: text('water_intake'),
  mealFrequency: text('meal_frequency'),
  healthRestrictions: jsonb('health_restrictions'), // array

  // AI Generated Archetypes
  fitnessArchetype: text('fitness_archetype'),
  wellnessArchetype: text('wellness_archetype'),
  motivationType: text('motivation_type'),
  recoveryCapacity: text('recovery_capacity'),
  
  // Gamification Fields
  xp: integer('xp').default(0),
  level: integer('level').default(1),
  streakDays: integer('streak_days').default(0),
  coins: integer('coins').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const wellnessScores = pgTable('wellness_scores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  
  overallScore: integer('overall_score'),
  physicalScore: integer('physical_score'),
  mentalScore: integer('mental_score'),
  nutritionScore: integer('nutrition_score'),
  sleepScore: integer('sleep_score'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const recommendations = pgTable('recommendations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  agentType: text('agent_type').notNull(), // 'YOGA', 'MEDITATION', 'FITNESS', 'NUTRITION', 'SLEEP', 'MENTAL'
  title: text('title').notNull(),
  
  // Explainability Fields
  reason: text('reason').notNull(),
  evidence: text('evidence').notNull(),
  confidenceScore: integer('confidence_score').notNull(),
  expectedBenefit: text('expected_benefit').notNull(),
  riskFactors: text('risk_factors').notNull(),
  
  // Specific details
  content: jsonb('content'),
  
  status: text('status').default('active'), // 'active', 'completed', 'dismissed'
  createdAt: timestamp('created_at').defaultNow(),
});

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  
  content: text('content').notNull(),
  
  // AI Insights
  sentiment: text('sentiment'),
  mood: text('mood'),
  summary: text('summary'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// Data tracking tables
export const foodLogs = pgTable('food_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  item: text('item').notNull(),
  calories: integer('calories'),
  protein: integer('protein'),
  carbs: integer('carbs'),
  fats: integer('fats'),
  confidence: integer('confidence'),
  source: text('source'), // e.g. text, camera, barcode
  createdAt: timestamp('created_at').defaultNow(),
});

export const exerciseLogs = pgTable('exercise_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  exercise: text('exercise').notNull(),
  durationMins: integer('duration_mins'),
  caloriesBurned: integer('calories_burned'),
  volume: integer('volume'),
  source: text('source'), // e.g. text, camera, wearable
  createdAt: timestamp('created_at').defaultNow(),
});

export const wearableConnections = pgTable('wearable_connections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  provider: text('provider').notNull(), // e.g. google_fit, apple_health, fitbit, oura, whoop
  connected: boolean('connected').default(true),
  accessToken: text('access_token'), // For actual integrations
  refreshToken: text('refresh_token'),
  lastSync: timestamp('last_sync'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 4: Ambient Intelligence Schema ===

export const ambientContexts = pgTable('ambient_contexts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  locationCategory: text('location_category'), // e.g. Home, Work, Gym, Transit
  weatherConditions: text('weather_conditions'), // e.g. Clear, Rain, Snow
  temperature: integer('temperature'),
  airQualityIndex: integer('aqi'),
  uvIndex: integer('uv_index'),
  batteryState: text('battery_state'), // e.g. charging, low
  deviceUsageState: text('device_usage_state'), // e.g. active, idle
  recentWearableHr: integer('recent_hr'), // Heart Rate
  recentWearableHrv: integer('recent_hrv'), // Heart Rate Variability
  recentWearableStress: integer('recent_stress'),
  activeProductivitySession: boolean('active_productivity_session').default(false),
  timestamp: timestamp('timestamp').defaultNow(),
});

export const calendarEvents = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  isDeepWork: boolean('is_deep_work').default(false),
  isWorkout: boolean('is_workout').default(false),
  isFreeWindow: boolean('is_free_window').default(false), // Identified by AI as a free window
  source: text('source'), // e.g. google_calendar, outlook
  createdAt: timestamp('created_at').defaultNow(),
});

export const timelineEvents = pgTable('timeline_events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  eventType: text('event_type').notNull(), // e.g. 'MEAL', 'EXERCISE', 'ACHIEVEMENT', 'RECOMMENDATION', 'MOOD'
  title: text('title').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'), // e.g. { calories: 500, duration: 30 }
  impactScore: integer('impact_score'), // How much it shifted HDI
  timestamp: timestamp('timestamp').defaultNow(),
});

export const knowledgeGraphNodes = pgTable('knowledge_graph_nodes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  nodeType: text('node_type').notNull(), // 'GOAL', 'HABIT', 'SKILL', 'PROJECT', 'PERSON', 'CONCEPT'
  label: text('label').notNull(),
  attributes: jsonb('attributes'),
  confidence: integer('confidence').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const knowledgeGraphEdges = pgTable('knowledge_graph_edges', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sourceId: integer('source_id').references(() => knowledgeGraphNodes.id).notNull(),
  targetId: integer('target_id').references(() => knowledgeGraphNodes.id).notNull(),
  relationType: text('relation_type').notNull(), // e.g. 'SUPPORTS', 'BLOCKS', 'REQUIRES', 'IMPROVES'
  weight: integer('weight').default(1), // Strength of relationship
  createdAt: timestamp('created_at').defaultNow(),
});

export const memoryBlocks = pgTable('memory_blocks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  memoryType: text('memory_type').notNull(), // 'PREFERENCE', 'INTERVENTION_RESULT', 'RHYTHM', 'AVERSION'
  content: text('content').notNull(), // e.g. "User prefers morning workouts and responds poorly to HIIT when sleep is < 6h"
  confidence: integer('confidence').default(100),
  source: text('source'), // Which agent extracted this memory
  lastRecalled: timestamp('last_recalled'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const ambientNotifications = pgTable('ambient_notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  priority: text('priority').default('low'), // 'low', 'medium', 'high', 'critical'
  contextReasoning: text('context_reasoning').notNull(), // e.g. "Because your calendar is free for 30m and it is raining outside."
  expectedBenefit: text('expected_benefit'),
  estimatedTimeMins: integer('estimated_time_mins'),
  actionLink: text('action_link'),
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 5: Autonomous Orchestration Schema ===

export const lifeMissions = pgTable('life_missions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  description: text('description'),
  vision: text('vision'),
  status: text('status').default('active'), // active, achieved, archived
  alignmentScore: integer('alignment_score').default(100),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const goals = pgTable('goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  missionId: integer('mission_id').references(() => lifeMissions.id),
  parentGoalId: integer('parent_goal_id'),
  title: text('title').notNull(),
  description: text('description'),
  targetDate: timestamp('target_date'),
  status: text('status').default('planning'), // planning, active, blocked, completed, abandoned
  progress: integer('progress').default(0), // 0-100
  priorityScore: integer('priority_score').default(50),
  domain: text('domain'), // Link to Digital Twin domain
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const orchestrationTasks = pgTable('orchestration_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  goalId: integer('goal_id').references(() => goals.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('todo'), // todo, in_progress, done
  dueDate: timestamp('due_date'),
  estimatedMinutes: integer('estimated_minutes'),
  aiGenerated: boolean('ai_generated').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const strategicReviews = pgTable('strategic_reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  reviewType: text('review_type').notNull(), // weekly, monthly, quarterly, yearly
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  content: jsonb('content'), // Insights, goal evolution, behavior analysis
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 6: Human Intelligence Network & Ecosystem Schema ===

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // clinic, gym, corporate, university, mentor_group
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const organizationMembers = pgTable('organization_members', {
  id: serial('id').primaryKey(),
  orgId: integer('org_id').references(() => organizations.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  role: text('role').notNull(), // admin, doctor, coach, user, student
  status: text('status').default('active'),
  joinedAt: timestamp('joined_at').defaultNow(),
});

export const collaborationShares = pgTable('collaboration_shares', {
  id: serial('id').primaryKey(),
  ownerId: integer('owner_id').references(() => users.id).notNull(),
  collaboratorId: integer('collaborator_id').references(() => users.id).notNull(),
  permissions: jsonb('permissions'), // e.g. { "read_metrics": true, "add_goals": true }
  status: text('status').default('active'), // active, revoked
  createdAt: timestamp('created_at').defaultNow(),
});

export const ragDocuments = pgTable('rag_documents', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  documentType: text('document_type'), // research_paper, book, personal_note, lab_report
  content: text('content'),
  // vector embedding column can go here (using pgvector) when fully implemented
  createdAt: timestamp('created_at').defaultNow(),
});

export const biomarkers = pgTable('biomarkers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  markerName: text('marker_name').notNull(), // e.g., HDL, LDL, HbA1c, Cortisol
  value: text('value').notNull(),
  unit: text('unit').notNull(),
  source: text('source'), // lab_report, wearable, manual
  timestamp: timestamp('timestamp').defaultNow(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  orgId: integer('org_id').references(() => organizations.id),
  keyHash: text('key_hash').notNull(),
  scopes: jsonb('scopes'), // e.g. ["read_twin", "write_goals"]
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 7: Cognitive Intelligence & Self-Evolving AI ===

export const cognitiveMemory = pgTable('cognitive_memory', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  memoryType: text('memory_type').notNull(), // working, semantic, procedural, episodic, goal, context
  content: jsonb('content').notNull(),
  consolidationStatus: text('consolidation_status').default('raw'), // raw, consolidated, archived
  importanceScore: integer('importance_score').default(50),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const agentEvaluations = pgTable('agent_evaluations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  agentName: text('agent_name').notNull(),
  taskType: text('task_type').notNull(),
  predictedOutcome: jsonb('predicted_outcome'),
  actualOutcome: jsonb('actual_outcome'),
  accuracyScore: integer('accuracy_score'), // 0-100
  feedback: text('feedback'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const researchExperiments = pgTable('research_experiments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  hypothesis: text('hypothesis').notNull(),
  experimentType: text('experiment_type'), // a_b_test, longitudinal
  status: text('status').default('running'), // planning, running, concluded
  results: jsonb('results'),
  statisticalSignificance: integer('statistical_significance'),
  createdAt: timestamp('created_at').defaultNow(),
  concludedAt: timestamp('concluded_at'),
});

export const twinProjections = pgTable('twin_projections', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  projectionType: text('projection_type').notNull(), // future_forecast, historical_baseline, alternative_path
  timeframeDays: integer('timeframe_days'),
  projectedState: jsonb('projected_state'),
  confidenceScore: integer('confidence_score'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 7b: Research Intelligence & Explainable AI ===

export const researchSessions = pgTable('research_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  objective: text('objective'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recommendationHistory = pgTable('recommendation_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  recommendationId: integer('recommendation_id').references(() => recommendations.id).notNull(),
  originalContext: jsonb('original_context'),
  confidenceScore: integer('confidence_score'),
  uncertaintyScore: integer('uncertainty_score'),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const recommendationEvidence = pgTable('recommendation_evidence', {
  id: serial('id').primaryKey(),
  recommendationId: integer('recommendation_id').references(() => recommendations.id).notNull(),
  dimension: text('dimension').notNull(),
  biologicalReasoning: text('biological_reasoning'),
  psychologicalReasoning: text('psychological_reasoning'),
  nutritionalReasoning: text('nutritional_reasoning'),
  behavioralReasoning: text('behavioral_reasoning'),
  supportingMetrics: jsonb('supporting_metrics'),
  conflictingMetrics: jsonb('conflicting_metrics'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const confidenceBreakdown = pgTable('confidence_breakdown', {
  id: serial('id').primaryKey(),
  predictionId: integer('prediction_id'), // can link to prediction_results
  recommendationId: integer('recommendation_id'), // or recommendation
  dataCompleteness: integer('data_completeness'), // 0-100
  historicalConsistency: integer('historical_consistency'), // 0-100
  missingVariables: jsonb('missing_variables'),
  calculatedConfidence: integer('calculated_confidence'), // 0-100
  createdAt: timestamp('created_at').defaultNow(),
});

export const interventionEffectiveness = pgTable('intervention_effectiveness', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  recommendationId: integer('recommendation_id').references(() => recommendations.id).notNull(),
  baselineScore: integer('baseline_score'),
  postScore: integer('post_score'),
  adherenceRate: integer('adherence_rate'), // 0-100
  successStatus: text('success_status'), // success, neutral, failed
  analysis: text('analysis'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const behaviorPatterns = pgTable('behavior_patterns', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  patternName: text('pattern_name').notNull(),
  patternType: text('pattern_type'), // positive, negative, neutral
  frequency: text('frequency'),
  trigger: text('trigger'),
  impact: text('impact'),
  detectedAt: timestamp('detected_at').defaultNow(),
});

export const predictionResults = pgTable('prediction_results', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  targetDimension: text('target_dimension').notNull(),
  predictedValue: text('predicted_value'),
  timeframe: text('timeframe'), // next_week, 1_month, etc.
  confidence: integer('confidence'),
  uncertainty: integer('uncertainty'),
  actualValue: text('actual_value'),
  validationStatus: text('validation_status').default('pending'), // pending, validated, inaccurate
  createdAt: timestamp('created_at').defaultNow(),
});

export const researchMetrics = pgTable('research_metrics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  metricName: text('metric_name').notNull(),
  value: text('value'),
  methodology: text('methodology'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const scientificSources = pgTable('scientific_sources', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authors: text('authors'),
  publicationYear: integer('publication_year'),
  doi: text('doi'),
  relevanceScore: integer('relevance_score'),
  url: text('url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 8: Autonomous Multi-Agent Intelligence ===

export const agentMemory = pgTable('agent_memory', {
  id: serial('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  contextKey: text('context_key').notNull(),
  memoryData: jsonb('memory_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const agentTasks = pgTable('agent_tasks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  assignedAgent: text('assigned_agent').notNull(),
  taskDescription: text('task_description').notNull(),
  status: text('status').default('pending'), // pending, running, completed, failed
  priority: text('priority').default('medium'),
  result: jsonb('result'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const agentDecisions = pgTable('agent_decisions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  agentId: text('agent_id').notNull(),
  decisionTopic: text('decision_topic').notNull(),
  optionsEvaluated: jsonb('options_evaluated'),
  selectedOption: text('selected_option'),
  reasoning: text('reasoning'),
  confidence: integer('confidence'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentMessages = pgTable('agent_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  fromAgent: text('from_agent').notNull(),
  toAgent: text('to_agent').notNull(),
  messageContent: text('message_content').notNull(),
  relatedTaskId: integer('related_task_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const longTermGoals = pgTable('long_term_goals', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  goalName: text('goal_name').notNull(),
  targetDimension: text('target_dimension'),
  targetDate: timestamp('target_date'),
  status: text('status').default('active'),
  progressScore: integer('progress_score').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const weeklyPlans = pgTable('weekly_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  weekStartDate: timestamp('week_start_date').notNull(),
  objectives: jsonb('objectives'),
  status: text('status').default('active'),
  reviewNotes: text('review_notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const dailyPlans = pgTable('daily_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  planDate: timestamp('plan_date').notNull(),
  weeklyPlanId: integer('weekly_plan_id').references(() => weeklyPlans.id),
  schedule: jsonb('schedule'),
  tasks: jsonb('tasks'),
  completionRate: integer('completion_rate'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const agentFeedback = pgTable('agent_feedback', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  agentId: text('agent_id').notNull(),
  decisionId: integer('decision_id'), // can link to agent_decisions
  userRating: integer('user_rating'), // 1-5
  feedbackText: text('feedback_text'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const optimizationCycles = pgTable('optimization_cycles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  dimension: text('dimension').notNull(),
  previousScore: integer('previous_score'),
  newScore: integer('new_score'),
  optimizationActions: jsonb('optimization_actions'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const decisionHistory = pgTable('decision_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  decisionType: text('decision_type'),
  contextSnapshot: jsonb('context_snapshot'),
  outcome: jsonb('outcome'),
  createdAt: timestamp('created_at').defaultNow(),
});

// === Phase 9: Enterprise Infrastructure, Cloud Deployment & SaaS Platform ===

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  plan: text('plan').default('Free'), // Free, Premium, Pro, Enterprise
  status: text('status').default('active'), // active, canceled, past_due
  billingCycle: text('billing_cycle').default('monthly'), // monthly, yearly
  currentPeriodStart: timestamp('current_period_start').defaultNow(),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  amount: integer('amount').notNull(), // stored in cents
  currency: text('currency').default('USD'),
  status: text('status').default('succeeded'), // succeeded, pending, failed
  invoiceUrl: text('invoice_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('info'), // info, warning, alert, recommendation
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  resource: text('resource'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  status: text('status').default('success'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionToken: text('session_token').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const devices = pgTable('devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  deviceName: text('device_name').notNull(),
  deviceType: text('device_type').default('browser'), // browser, mobile, desktop
  lastIp: text('last_ip'),
  trusted: boolean('trusted').default(true),
  lastActiveAt: timestamp('last_active_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemHealth = pgTable('system_health', {
  id: serial('id').primaryKey(),
  serviceName: text('service_name').notNull(),
  status: text('status').default('operational'), // operational, degraded, outage
  latencyMs: integer('latency_ms').default(0),
  cpuUsage: integer('cpu_usage'), // percentage
  memoryUsage: integer('memory_usage'), // percentage
  createdAt: timestamp('created_at').defaultNow(),
});

export const usageStatistics = pgTable('usage_statistics', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  metricName: text('metric_name').notNull(), // ai_tokens, api_calls, storage_bytes
  metricValue: integer('metric_value').default(0),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  digitalTwin: one(digitalTwins, {
    fields: [users.id],
    references: [digitalTwins.userId],
  }),
  wellnessScores: many(wellnessScores),
  recommendations: many(recommendations),
  journalEntries: many(journalEntries),
  foodLogs: many(foodLogs),
  exerciseLogs: many(exerciseLogs),
  wearableConnections: many(wearableConnections),
  digitalTwinSnapshots: many(digitalTwinSnapshots),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const wellnessScoresRelations = relations(wellnessScores, ({ one }) => ({
  user: one(users, {
    fields: [wellnessScores.userId],
    references: [users.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, {
    fields: [journalEntries.userId],
    references: [users.id],
  }),
}));

export const foodLogsRelations = relations(foodLogs, ({ one }) => ({
  user: one(users, {
    fields: [foodLogs.userId],
    references: [users.id],
  }),
}));

export const exerciseLogsRelations = relations(exerciseLogs, ({ one }) => ({
  user: one(users, {
    fields: [exerciseLogs.userId],
    references: [users.id],
  }),
}));

export const wearableConnectionsRelations = relations(wearableConnections, ({ one }) => ({
  user: one(users, {
    fields: [wearableConnections.userId],
    references: [users.id],
  }),
}));

export const digitalTwins = pgTable('digital_twins', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  states: jsonb('states').notNull(), // DigitalTwinModel containing all 16 states
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const digitalTwinsRelations = relations(digitalTwins, ({ one }) => ({
  user: one(users, {
    fields: [digitalTwins.userId],
    references: [users.id],
  }),
}));

export const digitalTwinSnapshots = pgTable('digital_twin_snapshots', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  snapshotTimestamp: timestamp('snapshot_timestamp').defaultNow(),
  triggerSource: text('trigger_source').notNull(),
  fullTwinState: jsonb('full_twin_state').notNull(),
  overallScore: integer('overall_score').notNull(),
  calibrationConfidence: integer('calibration_confidence').notNull(),
  generatedSummary: text('generated_summary'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const digitalTwinSnapshotsRelations = relations(digitalTwinSnapshots, ({ one }) => ({
  user: one(users, {
    fields: [digitalTwinSnapshots.userId],
    references: [users.id],
  }),
}));
