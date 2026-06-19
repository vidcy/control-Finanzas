import axios from './axios';

export interface NotificationDto {
  id: string;
  title: string;
  description: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export const getNotificationsRequest = async (workspace?: string): Promise<NotificationDto[]> => {
  const res = await axios.get(workspace ? `/notifications?workspace=${workspace}` : '/notifications');
  return res.data;
};

export const markNotificationAsReadRequest = async (id: string): Promise<void> => {
  await axios.patch(`/notifications/${id}/read`);
};

export const markAllNotificationsAsReadRequest = async (workspace?: string): Promise<void> => {
  await axios.patch(workspace ? `/notifications/read-all?workspace=${workspace}` : `/notifications/read-all`);
};
