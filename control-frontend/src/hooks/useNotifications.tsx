import { useEffect, useState } from 'react';
import type { NotificationDto } from '../services/notification.api';
import {
  getNotificationsRequest,
  markNotificationAsReadRequest,
  markAllNotificationsAsReadRequest
} from '../services/notification.api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await getNotificationsRequest();
      setNotifications(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markNotificationAsReadRequest(id);
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsAsReadRequest();
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return { notifications, loading, markAsRead, markAllAsRead, refresh: fetchNotifications };
};
