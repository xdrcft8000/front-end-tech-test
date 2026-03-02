import type { TradeStatus } from '@/types';

export const queryKeys = {
  trades: {
    all: ['trades'] as const,
    list: (statuses?: TradeStatus[]) =>
      statuses?.length
        ? (['trades', 'list', { statuses }] as const)
        : (['trades', 'list'] as const),
    detail: (tradeId: string) => ['trades', 'detail', tradeId] as const,
    feedback: (tradeId: string) => ['trades', tradeId, 'feedback'] as const,
  },
};
