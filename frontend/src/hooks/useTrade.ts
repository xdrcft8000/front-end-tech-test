import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TradesService } from '@/services/TradesService';
import { queryKeys } from './queryKeys';
import type { FeedbackCreate } from '@/types';

export function useTrade(tradeId: string | undefined) {
  const tradeQuery = useQuery({
    queryKey: queryKeys.trades.detail(tradeId!),
    queryFn: () => TradesService.getTradeById(tradeId!),
    enabled: !!tradeId,
  });

  return {
    trade: tradeQuery.data,
    emails: tradeQuery.data?.emails ?? [],
    feedback: tradeQuery.data?.feedback ?? [],
    isLoading: tradeQuery.isLoading,
    isError: tradeQuery.isError,
    error: tradeQuery.error,
    refetch: tradeQuery.refetch,
  };
}

export function useSubmitFeedback(tradeId: string) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (feedback: FeedbackCreate) =>
      TradesService.submitFeedback(tradeId, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.trades.detail(tradeId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.trades.all,
      });
    },
  });

  return {
    submitFeedback: mutation.mutate,
    submitFeedbackAsync: mutation.mutateAsync,
    isSubmitting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
