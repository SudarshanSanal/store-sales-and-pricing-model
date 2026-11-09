import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Check,
  CheckCheck,
  FileText,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  RefreshCw,
  Volume2,
  VolumeX,
  Laptop
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { motion } from 'framer-motion';
import { soundFx } from '@/lib/sound';

const BACKEND_URL = 'http://localhost:5000';

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(soundFx.isSoundEnabled());
  const [desktopPerm, setDesktopPerm] = useState<NotificationPermission>(soundFx.getDesktopPermission());

  const isInitialFetch = useRef(true);
  const prevUnreadCount = useRef(0);
  const prevIds = useRef<Set<string>>(new Set());

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    soundFx.setSoundEnabled(nextState);
    if (nextState) {
      soundFx.playNotificationChime(true);
    }
  };

  const handleRequestDesktopPermission = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const granted = await soundFx.requestDesktopPermission();
    setDesktopPerm(granted ? 'granted' : 'denied');
    if (granted) {
      soundFx.showDesktopNotification('🔔 Notifications Enabled', {
        body: 'You will now receive desktop alerts for forecasts and inventory.'
      });
      soundFx.playNotificationChime(true);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!session?.token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${session.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const incomingNotifs: NotificationItem[] = data.notifications || [];
        const incomingUnreadCount: number = data.unreadCount || 0;

        // Detect new unread arrivals
        if (!isInitialFetch.current) {
          const newlyArrived = incomingNotifs.filter(
            n => !n.read && !prevIds.current.has(n._id)
          );

          if (newlyArrived.length > 0 || incomingUnreadCount > prevUnreadCount.current) {
            console.log(`[Notification] ${newlyArrived.length} new notification(s) arrived. Playing chime.`);
            // Play throttled sound
            soundFx.playNotificationChime();

            // Show desktop browser notification if allowed
            if (newlyArrived.length > 0) {
              const latest = newlyArrived[0];
              soundFx.showDesktopNotification(latest.title, { body: latest.message });
            }
          }
        } else {
          isInitialFetch.current = false;
        }

        prevUnreadCount.current = incomingUnreadCount;
        prevIds.current = new Set(incomingNotifs.map(n => n._id));

        setNotifications(incomingNotifs);
        setUnreadCount(incomingUnreadCount);
      }
    } catch (err) {
      console.warn('[Notification] Fetch error:', err);
    }
  }, [session?.token]);

  // Real-time Polling every 8 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    if (!session?.token) return;
    try {
      await fetch(`${BACKEND_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      prevUnreadCount.current = Math.max(0, prevUnreadCount.current - 1);
    } catch {
      // silent
    }
  };

  const markAllAsRead = async () => {
    if (!session?.token) return;
    try {
      await fetch(`${BACKEND_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      prevUnreadCount.current = 0;
    } catch {
      // silent
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'forecast_completed':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'report_generated':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'stockout_warning':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'high_demand':
        return <TrendingUp className="w-4 h-4 text-amber-400" />;
      case 'pricing_alert':
        return <DollarSign className="w-4 h-4 text-blue-400" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 glass-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-secondary/30">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-foreground font-mono">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {/* Desktop Notification Prompt */}
            {soundFx.isDesktopNotificationSupported() && desktopPerm !== 'granted' && (
              <button
                onClick={handleRequestDesktopPermission}
                className="p-1.5 rounded transition-colors text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                title="Enable Desktop Notifications"
              >
                <Laptop className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Sound Toggle / Preview */}
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded transition-colors text-xs flex items-center gap-1 ${
                soundEnabled
                  ? 'text-primary hover:bg-primary/10'
                  : 'text-muted-foreground hover:bg-secondary/60 line-through opacity-60'
              }`}
              title={soundEnabled ? 'Notification sound enabled (click to mute)' : 'Notification sound muted (click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-mono text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-secondary/60 px-2 py-1 rounded transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3 h-3 text-emerald-400" />
                <span>Mark all read</span>
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-secondary/60 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40 font-sans text-xs">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-mono">No notifications yet</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => !notif.read && markAsRead(notif._id)}
                className={`p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                  notif.read ? 'bg-transparent opacity-75' : 'bg-primary/5 hover:bg-primary/10'
                }`}
              >
                <div className="p-2 rounded-xl bg-secondary/50 border border-border/60 shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h5 className={`text-xs truncate ${notif.read ? 'font-medium text-foreground' : 'font-bold text-foreground'}`}>
                      {notif.title}
                    </h5>
                    <span className="text-[9px] font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
