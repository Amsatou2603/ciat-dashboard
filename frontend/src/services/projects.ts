import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/api'
import type { Funding, Paginated, Partner, Partnership, Porteur, Project, ProjectInput } from '@/types/api'

export interface ProjectQuery { page: number; search: string; ordering: string; filters: Record<string, string | string[] | null | undefined> }

export const useProjects = (q: ProjectQuery, enabled = true) => useQuery({
  queryKey: ['projects', 'list', q],
  queryFn: ({ signal }) => request<Paginated<Project>>('/projects/', { params: { ...q.filters, page: q.page, search: q.search, ordering: q.ordering, page_size: 12 }, signal }),
  placeholderData: keepPreviousData, enabled,
})
export const useProject = (id: number) => useQuery({ queryKey: ['projects', 'detail', id], queryFn: ({ signal }) => request<Project>(`/projects/${id}/`, { signal }), enabled: Number.isFinite(id) })
export const usePorteurs = (enabled: boolean) => useQuery({ queryKey: ['porteurs'], queryFn: ({ signal }) => request<Paginated<Porteur>>('/porteurs/', { params: { page_size: 100 }, signal }), enabled })
export const usePartners = () => useQuery({ queryKey: ['partners'], queryFn: ({ signal }) => request<Paginated<Partner>>('/partners/', { params: { page_size: 100 }, signal }) })

/** Toute écriture invalide les listes ET les indicateurs : graphiques et KPI se recalculent depuis la base. */
function useInvalidate() {
  const qc = useQueryClient()
  return () => Promise.all([qc.invalidateQueries({ queryKey: ['projects'] }), qc.invalidateQueries({ queryKey: ['analytics'] }), qc.invalidateQueries({ queryKey: ['links'] }), qc.invalidateQueries({ queryKey: ['porteurs'] })])
}

export function useSaveProject() {
  const done = useInvalidate()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: ProjectInput }) => id ? request<Project>(`/projects/${id}/`, { method: 'PATCH', body: data }) : request<Project>('/projects/', { method: 'POST', body: data }),
    onSuccess: done,
  })
}
export function useDeleteProject() {
  const done = useInvalidate()
  return useMutation({ mutationFn: (id: number) => request<void>(`/projects/${id}/`, { method: 'DELETE' }), onSuccess: done })
}
export function useCreatePorteur() {
  const done = useInvalidate()
  return useMutation({ mutationFn: (data: { full_name: string; gender: string }) => request<Porteur>('/porteurs/', { method: 'POST', body: data }), onSuccess: done })
}

export const useLinkedList = <T,>(kind: 'partnerships' | 'fundings', page: number, project?: number) => useQuery({
  queryKey: ['links', kind, page, project ?? null],
  queryFn: ({ signal }) => request<Paginated<T>>(`/${kind}/`, { params: { page, page_size: 8, project }, signal }),
  placeholderData: keepPreviousData,
})
export const usePartnershipsList = (page: number, project?: number) => useLinkedList<Partnership>('partnerships', page, project)
export const useFundingsList = (page: number, project?: number) => useLinkedList<Funding>('fundings', page, project)

export function useSaveLink(kind: 'partnerships' | 'fundings') {
  const done = useInvalidate()
  return useMutation({ mutationFn: (data: Record<string, unknown>) => request<unknown>(`/${kind}/`, { method: 'POST', body: data }), onSuccess: done })
}
export function useDeleteLink(kind: 'partnerships' | 'fundings') {
  const done = useInvalidate()
  return useMutation({ mutationFn: (id: number) => request<void>(`/${kind}/${id}/`, { method: 'DELETE' }), onSuccess: done })
}
export function useCreatePartner() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (data: { name: string; kind: string }) => request<Partner>('/partners/', { method: 'POST', body: data }), onSuccess: () => qc.invalidateQueries({ queryKey: ['partners'] }) })
}
