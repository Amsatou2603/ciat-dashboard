import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '@/lib/api'
import type { ManagedUser, Paginated } from '@/types/api'

export const useUsers = (page: number) => useQuery({ queryKey: ['users', page], queryFn: ({ signal }) => request<Paginated<ManagedUser>>('/auth/users/', { params: { page, page_size: 12 }, signal }) })
export function useSaveUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: Record<string, unknown> }) => id ? request<ManagedUser>(`/auth/users/${id}/`, { method: 'PATCH', body: data }) : request<ManagedUser>('/auth/users/', { method: 'POST', body: data }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (id: number) => request<void>(`/auth/users/${id}/`, { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) })
}
