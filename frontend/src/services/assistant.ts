import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request, type Params } from '@/lib/api'
import type { AssistantAnswer, AssistantExchange, AssistantStatus } from '@/types/api'

export const useAssistantStatus = () => useQuery({ queryKey: ['assistant', 'status'], queryFn: ({ signal }) => request<AssistantStatus>('/assistant/status/', { signal }) })
export const useAssistantHistory = () => useQuery({ queryKey: ['assistant', 'history'], queryFn: ({ signal }) => request<{ items: AssistantExchange[] }>('/assistant/history/', { signal }) })

export function useAsk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ question, filters }: { question: string; filters: Params }) => request<AssistantAnswer>('/assistant/ask/', { method: 'POST', body: { question, filters } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assistant', 'history'] }),
  })
}
export function useClearHistory() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: () => request<void>('/assistant/history/', { method: 'DELETE' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['assistant', 'history'] }) })
}
