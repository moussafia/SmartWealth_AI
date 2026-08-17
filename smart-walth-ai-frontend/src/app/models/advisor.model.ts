import { RiskLevel } from './portfolio.model';

/** The six LangChain4j tools declared in the blueprint (§5.2). */
export type AdvisorTool =
  | 'get_portfolio'
  | 'get_transaction_history'
  | 'calculate_risk_score'
  | 'detect_anomalies'
  | 'search_financial_knowledge'
  | 'generate_health_report';

export type StepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAIL';
export type ChatRole = 'USER' | 'AGENT';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ToolCall {
  tool: AdvisorTool;
  status: StepStatus;
  durationMs: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  toolCalls: ToolCall[];
}

/** Shape of `assets/data/advisor-chat.json` — POST /api/advisor/chat. */
export interface ChatSession {
  sessionId: string;
  userId: string;
  startedAt: string;
  memoryTurns: number;
  messages: ChatMessage[];
}

export interface AnalysisStep {
  step: number;
  tool: AdvisorTool;
  description: string;
  status: StepStatus;
  durationMs: number;
  output: string;
}

/** Shape of `assets/data/advisor-analysis.json` — POST /api/advisor/analyze. */
export interface AdvisorAnalysis {
  id: string;
  userId: string;
  query: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  steps: AnalysisStep[];
  conclusion: string;
}

export type MetricUnit = 'USD' | 'PERCENT' | 'MONTHS';

export interface ReportMetric {
  key: string;
  label: string;
  value: number;
  unit: MetricUnit;
}

export interface Recommendation {
  id: string;
  priority: Priority;
  title: string;
  detail: string;
  knowledgeRefId: string | null;
}

export interface SpendingPattern {
  id: string;
  label: string;
  periodDays: number;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  changePercent: number;
  flagged: boolean;
}

/** Shape of `assets/data/advisor-report.json` — GET /api/advisor/report. */
export interface HealthReport {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  healthScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  metrics: ReportMetric[];
  recommendations: Recommendation[];
  spendingPatterns: SpendingPattern[];
}

export type AlertType =
  | 'CRYPTO_EXPOSURE'
  | 'ANOMALY_DETECTED'
  | 'SPENDING_PATTERN'
  | 'OVERCONCENTRATION';

/** Shape of `assets/data/advisor-alerts.json` — GET /api/advisor/alerts. */
export interface AdvisorAlert {
  id: string;
  type: AlertType;
  severity: Priority;
  title: string;
  message: string;
  assetSymbol: string | null;
  transactionId: string | null;
  thresholdPercent: number | null;
  actualPercent: number | null;
  createdAt: string;
  acknowledged: boolean;
}

export type KnowledgeCategory =
  | 'DIVERSIFICATION'
  | 'RISK_MANAGEMENT'
  | 'ALERT_THRESHOLD'
  | 'SAVINGS';

/** Shape of `assets/data/knowledge-base.json` — the RAG corpus of §5.3. */
export interface KnowledgeEntry {
  id: string;
  category: KnowledgeCategory;
  title: string;
  content: string;
  source: string;
}
