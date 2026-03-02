import type {
  Trade,
  TradeDetail,
  TradeStatus,
  Feedback,
  FeedbackCreate,
} from '@/types';
import { apiClient } from './ApiClient';

export class TradesService {
  static async getTrades(statuses?: TradeStatus[]): Promise<Trade[]> {
    const params: Record<string, string[]> | undefined = statuses?.length
      ? { status: statuses }
      : undefined;

    return apiClient.get<Trade[]>('/trades', params);
  }

  static async getTradeById(tradeId: string): Promise<TradeDetail> {
    return apiClient.get<TradeDetail>(`/trades/${tradeId}`);
  }

  static async submitFeedback(
    tradeId: string,
    feedback: FeedbackCreate
  ): Promise<Feedback> {
    return apiClient.post<Feedback>(`/trades/${tradeId}/feedback`, feedback);
  }
}
