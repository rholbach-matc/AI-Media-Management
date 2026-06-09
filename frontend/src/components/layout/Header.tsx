import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-slate-800 bg-charcoal/95 px-4 md:px-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Grok Organizer</h1>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-300 sm:inline">{user?.display_name}</span>
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3"
          onClick={() => void logout()}
          disabled={loading}
        >
          <LogOut size={18} aria-hidden="true" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
