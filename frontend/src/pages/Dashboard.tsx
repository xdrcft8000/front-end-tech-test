import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTrades } from '@/hooks';

export function Dashboard() {
  const { trades, isLoading } = useTrades();

  const stats = {
    total: trades.length,
    disputes: trades.filter((t) => t.status === 'dispute').length,
    submitted: trades.filter((t) => t.status === 'submitted').length,
    confirmed: trades.filter((t) => t.status === 'confirmed').length,
    errors: trades.filter((t) => t.status === 'error').length,
  };

  const recentDisputes = trades
    .filter((t) => t.status === 'dispute')
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your trade operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? '-' : stats.total}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover border-red-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disputes
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {isLoading ? '-' : stats.disputes}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-amber-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submitted
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-400">
              {isLoading ? '-' : stats.submitted}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pending confirmation
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover border-emerald-800/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmed
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">
              {isLoading ? '-' : stats.confirmed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully matched
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Disputes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Recent Disputes
            </CardTitle>
            <Link
              to="/trades?status=dispute"
              className="text-sm text-link hover:text-cyan-300"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-shimmer h-16 rounded-lg" />
              ))}
            </div>
          ) : recentDisputes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
              <p>No disputes found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDisputes.map((trade) => (
                <Link
                  key={trade.id}
                  to={`/trades/${trade.id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors no-underline"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-900/50 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {trade.trade_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trade.counterparty_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-foreground">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: trade.currency_code,
                        minimumFractionDigits: 0,
                      }).format(trade.notional_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {trade.product_type}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
