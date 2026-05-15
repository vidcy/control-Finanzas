import axios from './axios';

export interface NotificationDto {
  id: string;
  title: string;
  description: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const getNotificationsRequest = async (): Promise<NotificationDto[]> => {
  const res = await axios.get('/notifications');
  return res.data;
};

export const markNotificationAsReadRequest = async (id: string): Promise<void> => {
  await axios.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsReadRequest = async (): Promise<void> => {
  await axios.patch(`/notifications/read-all`);
};
