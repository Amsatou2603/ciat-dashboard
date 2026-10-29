export type Role = 'admin' | 'coordinator' | 'analyst' | 'reader'
export type Capability =
  | 'view_dashboard' | 'view_projects' | 'view_personal' | 'write_projects' | 'delete_projects'
  | 'export' | 'use_ai' | 'manage_users' | 'view_audit'

export interface User {
  id: number; username: string; first_name: string; last_name: string; email: string | null
  role: Role; role_label: string; capabilities: Capability[]
}
export interface ManagedUser {
  id: number; username: string; first_name: string; last_name: string; email: string | null
  role: Role; is_active: boolean; last_login: string | null; date_joined: string
}
export interface AuthPayload { access: string; user: User }

export type Status = 'RECU' | 'PRESELECTIONNE' | 'SELECTIONNE' | 'EN_INCUBATION' | 'PROTOTYPAGE' | 'TERMINE' | 'ABANDONNE' | 'REJETE'
export type PrototypeStage = 'AUCUN' | 'MAQUETTE' | 'PROTOTYPE' | 'MVP'
export type Gender = 'F' | 'M' | 'NS'

export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }

export interface Project {
  id: number; title: string; description: string
  cohort: number; cohort_name: string; domain: number; domain_label: string
  subdomain: number | null; subdomain_label: string | null
  porteur: number; porteur_detail: { id: number; full_name: string; gender: Gender | null }
  received_date: string; status: Status; status_label: string
  start_date: string | null; deadline: string | null; progress: number
  prototype_stage: PrototypeStage; prototype_stage_label: string; prototype_notes: string
  days_late: number | null; partnerships_count: number; funding_obtained: number
  mentor: string; phase: '' | 'PRE' | 'INC' | 'POST'; team_size: number | null; evaluation_score: string | null; delay_days: number
  budget_requested_xof: number | null; budget_granted_xof: number | null; budget_spent_xof: number | null; external_id: string | null
  is_demo: boolean; created_at: string; updated_at: string
}
export interface ProjectInput {
  title: string; description: string; cohort: number; domain: number; subdomain: number | null; porteur: number
  received_date: string; status: Status; start_date: string | null; deadline: string | null
  progress: number; prototype_stage: PrototypeStage; prototype_notes: string; mentor: string; delay_days: number
}
export interface Porteur { id: number; full_name: string; gender: Gender; projects_count: number }
export interface Partner { id: number; name: string; kind: string }
export interface Partnership {
  id: number; project: number; project_title: string; partner: number; partner_name: string
  nature: string; nature_label: string; status: string; status_label: string; start_date: string | null
}
export interface Funding {
  id: number; project: number; project_title: string; partner: number; partner_name: string
  amount_xof: number; status: 'PROMIS' | 'OBTENU'; status_label: string; date: string
}

export interface FilterOptions {
  cohorts: { id: number; name: string }[]
  domains: { id: number; label: string }[]
  subdomains: { id: number; label: string; domain: number }[]
  statuses: { value: Status; label: string }[]
  porteurs: { id: number; full_name: string }[]
  porteur_filter_available: boolean
}
export interface CohortAggregates { applicable: boolean; reason?: string; applications?: number; selections?: number; selection_rate_pct?: number | null; cohorts?: number }
export interface AnnualBudget { year: number; allocated_xof: number; spent_xof: number; execution_rate_pct: number | null; sources: Record<string, number>; is_demo: boolean }
export interface Indicators {
  ideas_received: number; projects_selected: number; selection_rate_pct: number | null; prototypes: number; porteurs: number
  active_projects: number; completed_projects: number; average_progress_pct: number | null
  late_projects: number; late_rate_pct: number | null
  average_evaluation_score: number | null; budget_granted_xof: number; budget_spent_xof: number; cohort_aggregates: CohortAggregates | null
  partnerships: number; partnerships_active: number; distinct_partners: number
  funding_count: number; funding_obtained_xof: number; funding_promised_xof: number
  data_quality: { active_without_deadline: number; demo_projects: number }
}
export interface TimePoint { month: string; ideas: number; selected: number; prototypes: number }
export interface BreakdownItem { key: string | number; label: string; count: number }
export interface Breakdown { dimension: string; available: boolean; reason?: string; items: BreakdownItem[] }
export interface CohortRow {
  cohort_id: number; cohort: string; ideas: number; selected: number; prototypes: number
  average_progress_pct: number | null; late: number; funding_obtained_xof: number
}
export interface ProgressOverview {
  distribution: { label: string; count: number }[]
  lowest_progress: { id: number; title: string; progress: number; status: Status; deadline: string | null; cohort: string }[]
  active_total: number
}
export interface LateProject { id: number; title: string; cohort: string; domain: string; status: Status; progress: number; deadline: string | null; days_late: number }
export interface PartnershipsOverview {
  by_nature: BreakdownItem[]; by_partner_kind: BreakdownItem[]; top_partners: { partner: string; count: number }[]; total: number
}
export interface FundingOverview {
  by_status: { key: string; label: string; amount_xof: number; count: number }[]
  by_partner: { partner: string; amount_xof: number }[]
  by_year: { year: number; obtained_xof: number; promised_xof: number }[]
  count: number
}
export interface Summary {
  period: string; indicators: Indicators; top_domains: BreakdownItem[]; cohorts: CohortRow[]
  late_projects: LateProject[]
  trend: { last_month: string; ideas_last: number; ideas_previous: number; delta: number } | null
  observations: string[]; limits: string[]
}
export interface AssistantAnswer {
  id: number; answer: string; intent: string; ai_generated: boolean; ai_configured: boolean
  data: Record<string, unknown>; warning: string | null; disclaimer: string
}
export interface AssistantExchange { id: number; question: string; answer: string; intent: string; ai_generated: boolean; created_at: string }
export interface AssistantStatus { configured: boolean; disclaimer: string; max_question_chars: number }
