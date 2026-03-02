import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatPopup } from '@/components/chat/ChatPopup';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: FileText },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="page-container">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2 no-underline">
                <span className="text-xl font-bold gradient-text">Yantra</span>
              </Link>

              {/* Navigation */}
              <nav className="flex items-center gap-1">
                {navigation.map((item) => {
                  const isActive =
                    item.href === '/'
                      ? location.pathname === '/'
                      : location.pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors no-underline',
                        isActive
                          ? 'bg-gray-800 text-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-gray-800/50'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-container py-8">
        <Outlet />
      </main>

      {/* AI Assistant Chat */}
      <ChatPopup />
    </div>
  );
}
