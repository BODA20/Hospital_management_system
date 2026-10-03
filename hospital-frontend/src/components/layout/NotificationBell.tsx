import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import { notificationService, Notification } from '../../services/notificationService';
import { useAuth } from '../../hooks/useAuth';

// ── Relative time formatter ────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60)  return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Icon per notification type ────────────────────────────────────────────────
function typeIcon(type: string): string {
  switch (type) {
    case 'patient_arrived':     return '🏥';
    case 'patient_ready':       return '✅';
    case 'new_appointment':     return '📅';
    case 'upcoming_appointment':return '🔔';
    case 'upcoming_patient':    return '👤';
    default:                    return '🔔';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const [isOpen, setIsOpen]               = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [isLoading, setIsLoading]         = useState(false);
  const [isMarkingAll, setIsMarkingAll]   = useState(false);

  const panelRef   = useRef<HTMLDivElement>(null);
  const buttonRef  = useRef<HTMLButtonElement>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Poll unread count every 30 s (quiet background fetch) ─────────────────
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationService.getUnreadCount();
      setUnreadCount(res.data?.count ?? 0);
    } catch {
      // silent — don't crash the header on network error
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    pollRef.current = setInterval(fetchUnreadCount, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchUnreadCount]);

  // ── Load full notification list when panel opens ──────────────────────────
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await notificationService.getNotifications();
      setNotifications(res.data ?? []);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBellClick = useCallback(() => {
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleOutside);
    return ()  => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const handleMarkRead = useCallback(async (n: Notification, e: React.MouseEvent) => {
    e.stopPropagation();
    if (n.is_read) return;
    try {
      await notificationService.markAsRead(n.id);
      setNotifications(prev =>
        prev.map(item => item.id === n.id ? { ...item, is_read: true } : item)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  }, []);

  // ── Mark all as read ──────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAll || unreadCount === 0) return;
    setIsMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    } finally {
      setIsMarkingAll(false);
    }
  }, [isMarkingAll, unreadCount]);

  if (!isAuthenticated) return null;

  const unread  = notifications.filter(n => !n.is_read);
  const read    = notifications.filter(n => n.is_read);

  return (
    <div className="relative">
      {/* ── Bell button ──────────────────────────────────────────────────── */}
      <button
        ref={buttonRef}
        id="notification-bell-button"
        onClick={handleBellClick}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1"
      >
        <Bell className={`w-5 h-5 transition-colors ${isOpen ? 'text-teal-600' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center leading-none px-1 shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ───────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-label="Notifications panel"
          className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm max-h-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 flex flex-col animate-fade-in"
          style={{ boxShadow: '0 20px 60px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700 border border-teal-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                id="mark-all-read-btn"
                className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-semibold transition-colors disabled:opacity-50"
              >
                {isMarkingAll
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CheckCheck className="w-3.5 h-3.5" />
                }
                Mark all read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
                <p className="text-xs">Loading notifications…</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
                <Inbox className="w-10 h-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              <div>
                {/* Unread section */}
                {unread.length > 0 && (
                  <div>
                    <div className="px-5 py-2 bg-teal-50/60 border-b border-teal-100">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Unread</p>
                    </div>
                    {unread.map(n => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                )}

                {/* Read section */}
                {read.length > 0 && (
                  <div>
                    {unread.length > 0 && (
                      <div className="px-5 py-2 bg-slate-50/80 border-b border-slate-100 border-t border-t-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Earlier</p>
                      </div>
                    )}
                    {read.map(n => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
              <p className="text-[10px] text-slate-400 text-center">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Individual notification row ────────────────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (n: Notification, e: React.MouseEvent) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification: n, onMarkRead }) => {
  return (
    <div
      className={`
        group relative flex items-start gap-3.5 px-5 py-4 border-b border-slate-50
        transition-all duration-150
        ${n.is_read
          ? 'bg-white hover:bg-slate-50/80'
          : 'bg-teal-50/30 hover:bg-teal-50/60 border-l-2 border-l-teal-400'
        }
      `}
    >
      {/* Icon bubble */}
      <div className={`
        flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-base shadow-sm
        ${n.is_read ? 'bg-slate-100' : 'bg-teal-100'}
      `}>
        {typeIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs leading-snug ${n.is_read ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
            {n.title}
          </p>
          <span className="flex-shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
            {timeAgo(n.created_at)}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
          {n.message}
        </p>
      </div>

      {/* Mark-as-read button (shows on hover for unread items) */}
      {!n.is_read && (
        <button
          onClick={(e) => onMarkRead(n, e)}
          title="Mark as read"
          aria-label="Mark as read"
          className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-teal-100 text-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Unread dot indicator */}
      {!n.is_read && (
        <span className="absolute top-5 right-3 w-2 h-2 rounded-full bg-teal-500 shadow-sm group-hover:opacity-0 transition-opacity" />
      )}
    </div>
  );
};
