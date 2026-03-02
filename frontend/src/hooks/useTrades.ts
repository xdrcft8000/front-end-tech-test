import { useQuery } from '@tanstack/react-query';
import { TradesService } from '@/services/TradesService';
import { queryKeys } from './queryKeys';
import type { TradeStatus } from '@/types';

export function useTrades(statuses?: TradeStatus[]) {
  const tradesQuery = useQuery({
    queryKey: queryKeys.trades.list(statuses),
    queryFn: () => TradesService.getTrades(statuses),
  });

  return {
    trades: tradesQuery.data ?? [],
    isLoading: tradesQuery.isLoading,
    isError: tradesQuery.isError,
    error: tradesQuery.error,
    refetch: tradesQuery.refetch,
  };
}
