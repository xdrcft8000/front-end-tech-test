import { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TradeModal } from '@/components/trade/TradeModal';
import {
  FilterableTable,
  type ColumnConfig,
} from '@/components/FilterableTable';
import { useTrades } from '@/hooks';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import type { Trade, TradeStatus } from '@/types';

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

const statusOrder: TradeStatus[] = [
  'dispute',
  'submitted',
  'confirmed',
  'deleted',
  'error',
];

export function Trades() {
  const { tradeId: urlTradeId } = useParams<{ tradeId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { trades, isLoading, isError } = useTrades();

  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(
    urlTradeId ?? null
  );
  const [isModalOpen, setIsModalOpen] = useState(!!urlTradeId);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);

  useEffect(() => {
    setSelectedTradeId(urlTradeId ?? null);
    setIsModalOpen(!!urlTradeId);
  }, [urlTradeId]);

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId) ?? null,
    [trades, selectedTradeId]
  );

  const selectedTradeIndex = useMemo(() => {
    if (!selectedTradeId) return -1;
    return filteredTrades.findIndex((t) => t.id === selectedTradeId);
  }, [selectedTradeId, filteredTrades]);

  const openTradeModal = useCallback(
    (trade: Trade) => {
      const params = new URLSearchParams(searchParams);
      navigate(`/trades/${trade.id}?${params.toString()}`);
    },
    [navigate, searchParams]
  );

  const closeTradeModal = useCallback(() => {
    navigate(`/trades?${searchParams.toString()}`);
  }, [navigate, searchParams]);

  const handlePrevious = useCallback(() => {
    if (selectedTradeIndex > 0) {
      const prevTrade = filteredTrades[selectedTradeIndex - 1];
      navigate(`/trades/${prevTrade.id}?${searchParams.toString()}`);
    }
  }, [selectedTradeIndex, filteredTrades, navigate, searchParams]);

  const handleNext = useCallback(() => {
    if (selectedTradeIndex < filteredTrades.length - 1) {
      const nextTrade = filteredTrades[selectedTradeIndex + 1];
      navigate(`/trades/${nextTrade.id}?${searchParams.toString()}`);
    }
  }, [selectedTradeIndex, filteredTrades, navigate, searchParams]);

  const handleVisibleDataChange = useCallback((data: Trade[]) => {
    setFilteredTrades(data);
  }, []);

  const columns: ColumnConfig<Trade>[] = useMemo(
    () => [
      {
        key: 'trade_id',
        header: 'Trade ID',
        width: 'w-[140px]',
        render: (trade) => (
          <span className="font-medium text-link">{trade.trade_id}</span>
        ),
        sortMethod: (a, b) => a.trade_id.localeCompare(b.trade_id),
      },
      {
        key: 'counterparty_name',
        header: 'Counterparty',
        width: 'w-[180px]',
        truncate: true,
        render: (trade) => (
          <span className="text-foreground">{trade.counterparty_name}</span>
        ),
        sortMethod: (a, b) =>
          a.counterparty_name.localeCompare(b.counterparty_name),
        filterConfig: {
          type: 'enum',
          label: 'Counterparty',
          getOptions: (data) =>
            [...new Set(data.map((t) => t.counterparty_name))].sort(),
          getValue: (trade) => trade.counterparty_name,
        },
      },
      {
        key: 'product_type',
        header: 'Product',
        width: 'w-[120px]',
        render: (trade) => (
          <span className="text-muted-foreground">{trade.product_type}</span>
        ),
        sortMethod: (a, b) => a.product_type.localeCompare(b.product_type),
        filterConfig: {
          type: 'enum',
          label: 'Product',
          getOptions: (data) =>
            [...new Set(data.map((t) => t.product_type))].sort(),
          getValue: (trade) => trade.product_type,
        },
        groupConfig: {
          getGroupKey: (trade) => trade.product_type,
          getGroupLabel: (key) => key,
        },
      },
      {
        key: 'notional_amount',
        header: 'Notional',
        width: 'w-[140px]',
        className: 'text-right font-mono',
        render: (trade) => (
          <span className="text-foreground">
            {formatCurrency(trade.notional_amount, trade.currency_code)}
          </span>
        ),
        sortMethod: (a, b) => a.notional_amount - b.notional_amount,
      },
      {
        key: 'trade_date',
        header: 'Trade Date',
        width: 'w-[120px]',
        render: (trade) => (
          <span className="text-muted-foreground">
            {formatDate(trade.trade_date, 'short')}
          </span>
        ),
        sortMethod: (a, b) =>
          new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime(),
      },
      {
        key: 'status',
        header: 'Status',
        width: 'w-[120px]',
        render: (trade) => {
          const status = statusConfig[trade.status];
          const StatusIcon = status.icon;
          return (
            <Badge
              className={cn('inline-flex items-center gap-1', status.className)}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          );
        },
        sortMethod: (a, b) =>
          statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status),
        filterConfig: {
          type: 'enum',
          label: 'Status',
          defaultLabel: 'All statuses',
          getOptions: () => statusOrder,
          getValue: (trade) => trade.status,
          formatOptionLabel: (value) => {
            const status = statusConfig[value as TradeStatus];
            const StatusIcon = status.icon;
            return (
              <span className="inline-flex items-center gap-2">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            );
          },
        },
        groupConfig: {
          getGroupKey: (trade) => trade.status,
          getGroupLabel: (key) => statusConfig[key as TradeStatus]?.label ?? key,
          sortGroups: (a, b) =>
            statusOrder.indexOf(a as TradeStatus) -
            statusOrder.indexOf(b as TradeStatus),
          renderGroupHeader: (key) => {
            const status = statusConfig[key as TradeStatus];
            const StatusIcon = status.icon;
            return (
              <span className="inline-flex items-center gap-2 font-semibold text-lg">
                <StatusIcon className="h-5 w-5" />
                {status.label} Trades
              </span>
            );
          },
        },
      },
      {
        key: 'has_feedback',
        header: 'Feedback',
        width: 'w-[80px]',
        className: 'text-center',
        render: (trade) =>
          trade.has_feedback ? (
            <MessageSquare className="h-4 w-4 text-cyan-400 mx-auto" />
          ) : null,
        filterConfig: {
          type: 'boolean',
          label: 'Has Feedback',
          getOptions: () => ['true', 'false'],
          getValue: (trade) => trade.has_feedback,
          formatOptionLabel: (value) => (value === 'true' ? 'Yes' : 'No'),
        },
      },
    ],
    []
  );

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1>Trades</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all trades
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <XCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <p>Failed to load trades</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1>Trades</h1>
        <p className="text-muted-foreground mt-1">View and manage all trades</p>
      </div>

      <FilterableTable
        data={trades}
        columns={columns}
        isLoading={isLoading}
        emptyMessage="No trades found"
        getRowKey={(trade) => trade.id}
        onRowClick={openTradeModal}
        searchFields={[
          (trade) => trade.trade_id,
          (trade) => trade.counterparty_name,
          (trade) => trade.product_type,
        ]}
        searchPlaceholder="Search trades..."
        syncWithUrl
        defaultSortColumnKey="trade_date"
        defaultSortDirection="desc"
        pageSize={25}
        onVisibleDataChange={handleVisibleDataChange}
      />

      <TradeModal
        trade={selectedTrade}
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) closeTradeModal();
        }}
        onPrevious={handlePrevious}
        onNext={handleNext}
        hasPrevious={selectedTradeIndex > 0}
        hasNext={selectedTradeIndex < filteredTrades.length - 1}
      />
    </div>
  );
}
