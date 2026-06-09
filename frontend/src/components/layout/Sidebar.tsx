import {
  BarChart3,
  GitFork,
  Grid3X3,
  Images,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  SplitSquareHorizontal,
  Workflow,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '../ui/Button';

const navItems = [
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/trees', label: 'Trees', icon: GitFork },
  { to: '/projects', label: 'Projects', icon: Grid3X3 },
  { to: '/prompts', label: 'Prompts', icon: MessageSquareText },
  { to: '/sessions', label: 'Sessions', icon: Workflow },
  { to: '/compare', label: 'Compare', icon: SplitSquareHorizontal },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <>
      <aside
        className={`hidden border-r border-slate-800 bg-slate-950/55 px-3 py-4 transition-all duration-200 md:flex md:flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="mb-5 flex items-center justify-between px-2">
          <span className={`text-sm font-semibold text-slate-300 ${collapsed ? 'sr-only' : ''}`}>
            Navigation
          </span>
          <Button
            type="button"
            variant="ghost"
            className="h-10 w-10 px-0"
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </Button>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-cyan-400/15 text-cyan-200'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-ink'
                } ${collapsed ? 'justify-center' : ''}`
              }
              title={item.label}
            >
              <item.icon size={20} aria-hidden="true" />
              <span className={collapsed ? 'sr-only' : ''}>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-slate-800 bg-slate-950/95 px-1 py-2 backdrop-blur md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium ${
                isActive ? 'bg-cyan-400/15 text-cyan-200' : 'text-slate-400'
              }`
            }
            aria-label={item.label}
          >
            <item.icon size={18} aria-hidden="true" />
            <span className="max-w-full truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
