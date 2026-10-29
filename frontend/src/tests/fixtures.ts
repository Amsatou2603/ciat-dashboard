import type { Indicators } from '@/types/api'

export const indicators: Indicators = {
  ideas_received: 31, projects_selected: 14, selection_rate_pct: 45.2, prototypes: 5, porteurs: 30, active_projects: 11, completed_projects: 3,
  average_progress_pct: 59.6, late_projects: 8, late_rate_pct: 72.7, partnerships: 29, partnerships_active: 13, distinct_partners: 7,
  funding_count: 22, funding_obtained_xof: 32_000_000, funding_promised_xof: 22_000_000,
  average_evaluation_score: 15, budget_granted_xof: 84_800_000, budget_spent_xof: 70_000_000, cohort_aggregates: null,
  data_quality: { active_without_deadline: 3, demo_projects: 31 },
}
export const emptyIndicators: Indicators = { ...indicators, ideas_received: 0, projects_selected: 0, selection_rate_pct: null, prototypes: 0, porteurs: 0, active_projects: 0, average_progress_pct: null, late_projects: 0, late_rate_pct: null, partnerships: 0, funding_count: 0, funding_obtained_xof: 0, funding_promised_xof: 0, data_quality: { active_without_deadline: 0, demo_projects: 0 } }

export const options = {
  cohorts: [{ id: 1, name: 'Cohorte A' }, { id: 2, name: 'Cohorte B' }], domains: [{ id: 1, label: 'Agriculture' }], subdomains: [{ id: 1, label: 'Développement backend', domain: 1 }],
  statuses: [{ value: 'RECU', label: 'Idée reçue' }], porteurs: [], porteur_filter_available: false,
}
const summary = (i: Indicators) => ({ period: 'toutes périodes', indicators: i, top_domains: [], cohorts: [], late_projects: [], trend: null, observations: i.ideas_received ? ['31 idée(s) reçue(s).'] : [], limits: [] })

export function dashboardRoutes(i: Indicators = indicators) {
  return {
    '/analytics/filter-options/': options, '/analytics/indicators/': i,
    '/analytics/timeseries/': { items: i.ideas_received ? [{ month: '2026-01', ideas: 3, selected: 1, prototypes: 0 }] : [] },
    '/analytics/late/': { items: i.late_projects ? [{ id: 9, title: 'Capteurs d\'humidité', cohort: 'Cohorte A', domain: 'Agriculture', status: 'EN_INCUBATION', progress: 40, deadline: '2026-01-10', days_late: 120 }] : [] },
    '/analytics/breakdown/': (u: URL) => ({ dimension: u.searchParams.get('dimension'), available: true, items: i.ideas_received ? [{ key: 'RECU', label: 'Idée reçue', count: 3 }] : [] }),
    '/analytics/cohorts/': { items: [] }, '/analytics/progress/': { distribution: [], lowest_progress: [], active_total: 0 },
    '/analytics/funding/': { by_status: [], by_partner: [], by_year: [], count: 0 }, '/analytics/summary/': summary(i),
  }
}
