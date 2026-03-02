import { useState } from 'react';
import {
  X,
  ChevronUp,
  ChevronDown,
  Hash,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Mail,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrade, useSubmitFeedback } from '@/hooks';
import { cn, formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import type { Trade, TradeStatus, Email, Feedback } from '@/types';
import { toast } from 'sonner';

const statusConfig: Record<
  TradeStatus,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  dispute: {
    label: 'Dispute',
    icon: AlertTriangle,
    className: 'status-dispute',
  },
  submitted: {
    label: 'Submitted',
    icon: Clock,
    className: 'status-submitted',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    className: 'status-confirmed',
  },
  deleted: {
    label: 'Deleted',
    icon: Trash2,
    className: 'status-deleted',
  },
  error: {
    label: 'Error',
    icon: XCircle,
    className: 'status-error',
  },
};

interface EmailItemProps {
  email: Email;
}

function EmailItem({ email }: EmailItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'border border-border rounded-lg p-4 cursor-pointer transition-colors',
        'hover:bg-gray-800/30'
      )}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-sm truncate">{email.from_name}</p>
            {email.sent_at && (
              <span className="text-xs text-muted-foreground shrink-0">
                {formatDateTime(email.sent_at)}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {email.from_address}
          </p>
          {email.subject && (
            <p className="text-sm mt-1 font-medium">{email.subject}</p>
          )}
          {isExpanded && email.body && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {email.body}
              </p>
              {email.to.length > 0 && (
                <div className="mt-3 text-xs text-muted-foreground">
                  <span className="font-medium">To:</span>{' '}
                  {email.to.map((r) => r.name || r.address).join(', ')}
                </div>
              )}
              {email.cc.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">CC:</span>{' '}
                  {email.cc.map((r) => r.name || r.address).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface FeedbackItemProps {
  feedback: Feedback;
}

function FeedbackItem({ feedback }: FeedbackItemProps) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="h-4 w-4 text-cyan-400" />
        <span className="text-xs text-muted-foreground">
          {formatDateTime(feedback.created_at)}
        </span>
      </div>
      <p className="text-sm">{feedback.content}</p>
    </div>
  );
}

interface FeedbackInputProps {
  tradeId: string;
  onSuccess?: () => void;
}

function FeedbackInput({ tradeId, onSuccess }: FeedbackInputProps) {
  const [content, setContent] = useState('');
  const { submitFeedbackAsync, isSubmitting } = useSubmitFeedback(tradeId);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      await submitFeedbackAsync({ content: content.trim() });
      setContent('');
      toast.success('Feedback submitted');
      onSuccess?.();
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  return (
    <div className="space-y-3">
      <Textarea
        placeholder="Add feedback about this trade..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px] bg-gray-800/50 border-gray-700 resize-none"
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          size="sm"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </div>
    </div>
  );
}

interface TradeModalProps {
  trade: Trade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

export function TradeModal({
  trade,
  open,
  onOpenChange,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}: TradeModalProps) {
  const { emails, feedback, isLoading } = useTrade(trade?.id);

  if (!trade) return null;

  const status = statusConfig[trade.status];
  const StatusIcon = status.icon;
  const isDispute = trade.status === 'dispute';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 gap-0 overflow-hidden h-[85vh]"
        style={{ maxWidth: '1100px', width: '95vw' }}
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          Trade {trade.trade_id}
        </DialogTitle>
        <div className="flex h-full min-h-0">
          {/* Main content - Emails */}
          <div className="basis-3/5 p-6 flex flex-col min-h-0 border-r border-border">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{trade.trade_id}</h2>
                <Badge className={cn('gap-1', status.className)}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onNext}
                  disabled={!hasNext}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Emails Section */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Email Thread</h3>
                <span className="text-sm text-muted-foreground">
                  ({emails.length})
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              ) : emails.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No emails found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emails.map((email) => (
                    <EmailItem key={email.id} email={email} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar - Trade Details & Feedback */}
          <div className="basis-2/5 bg-gray-900/50 p-6 flex flex-col min-h-0">
            {/* Close button */}
            <div className="flex justify-end mb-4 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Trade Details */}
            <div className="divide-y divide-border shrink-0">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Hash className="h-4 w-4" />
                  Trade ID
                </div>
                <span className="text-sm font-mono">{trade.trade_id}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Counterparty
                </div>
                <span className="text-sm font-medium">
                  {trade.counterparty_name}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Product
                </div>
                <span className="text-sm">{trade.product_type}</span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Notional
                </div>
                <span className="text-sm font-mono">
                  {formatCurrency(trade.notional_amount, trade.currency_code)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Trade Date
                </div>
                <span className="text-sm">
                  {formatDate(trade.trade_date, 'short')}
                </span>
              </div>

              {trade.maturity_date && (
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Maturity
                  </div>
                  <span className="text-sm">
                    {formatDate(trade.maturity_date, 'short')}
                  </span>
                </div>
              )}
            </div>

            {/* Feedback Section */}
            <div className="mt-6 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Feedback</h3>
                <span className="text-sm text-muted-foreground">
                  ({feedback.length})
                </span>
              </div>

              {/* Existing Feedback */}
              <div className="flex-1 min-h-0 overflow-y-auto mb-4">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 rounded-lg" />
                  </div>
                ) : feedback.length > 0 ? (
                  <div className="space-y-3">
                    {feedback.map((fb) => (
                      <FeedbackItem key={fb.id} feedback={fb} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No feedback yet
                  </p>
                )}
              </div>

              {/* Feedback Input - Only for disputes */}
              {isDispute && (
                <div className="shrink-0 pt-4 border-t border-border">
                  <FeedbackInput tradeId={trade.id} />
                </div>
              )}

              {!isDispute && (
                <p className="text-xs text-muted-foreground text-center py-4 shrink-0">
                  Feedback can only be submitted for trades in dispute status
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
