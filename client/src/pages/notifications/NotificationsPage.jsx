import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Tag,
  MessageSquare,
  Car,
  CheckCircle2,
  Check,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Header } from '../../components/layout/Header';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../context/ToastContext';

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('All');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const tabs = ['All', 'Unread', 'Offers', 'Enquiries', 'System'];

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: async () => {
      let url = '/api/notifications?limit=50';
      if (activeTab === 'Unread') {
        url += '&unreadOnly=true';
      } else if (activeTab === 'Offers') {
        url += '&type=offer';
      } else if (activeTab === 'Enquiries') {
        url += '&type=enquiry';
      } else if (activeTab === 'System') {
        url += '&type=system';
      }

      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load notifications');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async id => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include',
      });
      return res.json();
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'All Read',
        message: 'All notifications marked as read.',
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    },
  });

  const handleNotificationClick = async notif => {
    if (!notif.read) {
      markReadMutation.mutate(notif._id);
    }

    if (notif.relatedRef?.model === 'Offer' && notif.relatedRef?.id) {
      navigate(`/negotiations/${notif.relatedRef.id}`);
    } else if (notif.relatedRef?.model === 'Enquiry' && notif.relatedRef?.id) {
      navigate(`/enquiries/${notif.relatedRef.id}`);
    } else if (notif.relatedRef?.model === 'Listing' && notif.relatedRef?.id) {
      navigate(`/listings/${notif.relatedRef.id}`);
    }
  };

  const notifications = data?.items || [];
  const unreadCount = data?.unreadCount || 0;

  const getTypeIcon = type => {
    switch (type) {
      case 'offer':
        return <Tag className="w-4 h-4 text-accent" />;
      case 'enquiry':
        return <MessageSquare className="w-4 h-4 text-[#2563eb] dark:text-[#60a5fa]" />;
      case 'rental':
        return <Car className="w-4 h-4 text-[#16a34a] dark:text-[#34d399]" />;
      default:
        return <Bell className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text transition-colors duration-200">
      <Header />

      <main className="flex-1 max-w-container w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                Activity Center
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-foreground">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-text tracking-tight">
              Notifications
            </h1>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="rounded-full px-4 text-[12px] self-start sm:self-auto"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Mark all as read
            </Button>
          )}
        </div>

        {/* Filter Tabs (UI 8.9: All · Unread · Offers · Enquiries) */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`h-9 px-4 rounded-full text-[13px] font-medium transition-colors cursor-pointer select-none ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface text-muted hover:text-text border border-border'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map(n => (
              <Skeleton key={n} className="h-20 w-full rounded-[20px]" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center rounded-[24px] bg-surface border border-border my-6">
            <Bell className="w-10 h-10 text-muted mx-auto mb-3 opacity-40" />
            <h2 className="text-[16px] font-semibold text-text mb-1">No Notifications</h2>
            <p className="text-[12px] text-muted">You are all caught up! Updates regarding offers and enquiries will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`flex items-center justify-between p-4 sm:p-5 rounded-[20px] border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-surface border-border hover:border-text/40'
                    : 'bg-surface border-accent/40 shadow-sm hover:border-accent'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-tile shrink-0 mt-0.5">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-[13px] font-semibold truncate ${notif.read ? 'text-text' : 'text-text font-bold'}`}>
                        {notif.title}
                      </h3>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0" aria-label="Unread" />
                      )}
                    </div>
                    <p className="text-[12px] text-muted mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-muted/70 block mt-1.5">
                      {new Date(notif.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="pl-4 shrink-0">
                  <ArrowRight className="w-4 h-4 text-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default NotificationsPage;
