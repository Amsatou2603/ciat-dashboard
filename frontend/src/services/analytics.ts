import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { request } from '@/lib/api'
import { useFilters } from '@/features/filters/FiltersContext'
import type { AnnualBudget, Breakdown, CohortRow, FilterOptions, FundingOverview, Indicators, LateProject, PartnershipsOverview, ProgressOverview, Summary, TimePoint } from '@/types/api'

/** Hook générique : requête filtrée, désactivée tant que les filtres sont invalides ; l'ancien résultat reste affiché pendant le rechargement. */
function useAnalytics<T>(name: string, path: string, extra: Record<string, string> = {}) {
  const { params, key, error } = useFilters()
  return useQuery({
    queryKey: ['analytics', name, key, extra],
    queryFn: ({ signal }) => request<T>(`/analytics/${path}/`, { params: { ...params, ...extra }, signal }),
    enabled: !error,
    placeholderData: keepPreviousData,
  })
}

export const useFilterOptions = () => useQuery({ queryKey: ['analytics', 'options'], queryFn: ({ signal }) => request<FilterOptions>('/analytics/filter-options/', { signal }), staleTime: 60_000 })
export const useIndicators = () => useAnalytics<Indicators>('indicators', 'indicators')
export const useTimeseries = () => useAnalytics<{ items: TimePoint[] }>('timeseries', 'timeseries')
export const useBreakdown = (dimension: 'status' | 'domain' | 'subdomain' | 'gender' | 'prototype') => useAnalytics<Breakdown>(`breakdown-${dimension}`, 'breakdown', { dimension })
export const useCohorts = () => useAnalytics<{ items: CohortRow[] }>('cohorts', 'cohorts')
export const useProgress = () => useAnalytics<ProgressOverview>('progress', 'progress')
export const useLate = () => useAnalytics<{ items: LateProject[] }>('late', 'late')
export const usePartnershipsOverview = () => useAnalytics<PartnershipsOverview>('partnerships', 'partnerships')
export const useFundingOverview = () => useAnalytics<FundingOverview>('funding', 'funding')
export const useSummary = () => useAnalytics<Summary>('summary', 'summary')

export const useAnnualBudgets = () => useQuery({ queryKey: ['analytics', 'annual-budgets'], queryFn: ({ signal }) => request<{ items: AnnualBudget[] }>('/analytics/annual-budgets/', { signal }), staleTime: 60_000 })
