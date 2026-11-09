import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Package, Brain, DollarSign, Upload, ChevronLeft, ChevronRight, Target, Database, Layers, UserCircle, FileText } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProjectLogo } from '@/components/ProjectLogo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type Tab = 'overview' | 'data' | 'forecast' | 'models' | 'accuracy' | 'inventory' | 'pricing' | 'reports' | 'datasets' | 'combine' | 'profile';

interface DashboardSidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const tabs: { id: Tab; label: string; icon: typeof BarChart3; group: 'main' | 'analytics' | 'ops' | 'account' }[] = [
  { id: 'data', label: 'Data Upload', icon: Upload, group: 'main' },
  { id: 'overview', label: 'Overview', icon: BarChart3, group: 'main' },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, group: 'analytics' },
  { id: 'models', label: 'Models', icon: Brain, group: 'analytics' },
  { id: 'accuracy', label: 'Accuracy', icon: Target, group: 'analytics' },
  { id: 'inventory', label: 'Inventory', icon: Package, group: 'ops' },
  { id: 'pricing', label: 'Pricing', icon: DollarSign, group: 'ops' },
  { id: 'reports', label: 'Reports', icon: FileText, group: 'ops' },
  { id: 'datasets', label: 'My Datasets', icon: Database, group: 'account' },
  { id: 'combine', label: 'Combine Data', icon: Layers, group: 'account' },
  { id: 'profile', label: 'Profile', icon: UserCircle, group: 'account' },
];

const groupLabels: Record<string, string> = {
  main: 'Main',
  analytics: 'Analytics',
  ops: 'Operations',
  account: 'Account',
};

export function DashboardSidebar({ activeTab, onTabChange, collapsed = false, onToggleCollapse }: DashboardSidebarProps) {
  const groups: ('main' | 'analytics' | 'ops' | 'account')[] = ['main', 'analytics', 'ops', 'account'];

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={`${collapsed ? 'w-16' : 'w-56'} sticky top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-[width] duration-200 ease-out`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center py-4' : 'justify-between px-4 py-4'} border-b border-sidebar-border/80`}>
          {!collapsed ? (
            <ProjectLogo size="md" showText={true} />
          ) : (
            <ProjectLogo size="sm" showText={false} />
          )}
          {onToggleCollapse && !collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="p-1.5 rounded-lg hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3.5 px-2.5 space-y-4">
          {groups.map((g) => (
            <div key={g}>
              {!collapsed && (
                <p className="px-2.5 mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-mono font-semibold">
                  {groupLabels[g]}
                </p>
              )}
              <div className="space-y-1">
                {tabs.filter((t) => t.group === g).map(({ id, label, icon: Icon }) => {
                  const active = activeTab === id;
                  const button = (
                    <button
                      key={id}
                      onClick={() => onTabChange(id)}
                      className={`w-full flex items-center ${collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'} rounded-lg text-sm font-medium transition-all duration-200 relative ${
                        active
                          ? 'bg-primary/12 text-primary font-semibold shadow-xs border border-primary/20'
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-bar"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r bg-primary shadow-sm"
                        />
                      )}
                      <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${active ? 'scale-110 text-primary' : 'text-muted-foreground group-hover:scale-105'}`} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </button>
                  );
                  return collapsed ? (
                    <Tooltip key={id}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="font-mono text-xs bg-popover/95 border-border">
                        {label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border/80 px-2.5 py-3 space-y-2.5 bg-sidebar/50">
          <ThemeToggle variant="sidebar" />
          <div className={`px-1.5 pt-1 ${collapsed ? 'flex justify-center' : ''}`}>
            {collapsed ? (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-slow shadow-xs" title="All systems operational" />
            ) : (
              <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <p className="text-[10px] text-muted-foreground font-mono">Pipeline Engine</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-slow" />
                  <span className="text-[11px] text-emerald-500 font-mono font-medium">Operational</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

export type { Tab };
