export type TradeStatus =
  | 'dispute'
  | 'submitted'
  | 'confirmed'
  | 'deleted'
  | 'error';

export const BREAK_STATUSES: TradeStatus[] = ['dispute'];

export interface Trade {
  id: string;
  trade_id: string;
  counterparty_name: string;
  status: TradeStatus;
  currency_code: string;
  notional_amount: number;
  trade_date: string;
  maturity_date: string | null;
  product_type: string;
  has_feedback: boolean;
}

export interface EmailRecipient {
  name: string;
  address: string | null;
}

export interface Email {
  id: number;
  from_name: string;
  from_address: string;
  to: EmailRecipient[];
  cc: EmailRecipient[];
  subject: string | null;
  body: string | null;
  sent_at: string | null;
}

export interface Feedback {
  id: number;
  trade_id: string;
  content: string;
  created_at: string;
}

export interface TradeDetail extends Trade {
  emails: Email[];
  feedback: Feedback[];
}

export interface FeedbackCreate {
  content: string;
}

export function isBreakStatus(status: TradeStatus): boolean {
  return BREAK_STATUSES.includes(status);
}
