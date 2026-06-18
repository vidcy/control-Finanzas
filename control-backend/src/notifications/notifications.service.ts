import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(userId: string) {
    // Auto-generate notifications for pending accounts
    const pendingTransactions = await this.prisma.transaction.findMany({
      where: { userId, status: 'PENDING' },
      include: { category: true },
    });

    for (const t of pendingTransactions) {
      // Create a unique link based on transaction id to avoid duplicates
      const uniqueLink = `/pending?id=${t.id}`;
      const existing = await this.prisma.notification.findFirst({
        where: { userId, link: uniqueLink },
      });

      if (!existing) {
        // Calculate days until due if dueDate exists
        let desc = `Tienes un pendiente de ${t.currency === 'PEN' ? 'S/' : '$'} ${t.amount} en ${t.category?.name || 'Categoría'}.`;
        if (t.dueDate) {
          const days = Math.ceil(
            (new Date(t.dueDate).getTime() - new Date().getTime()) /
              (1000 * 3600 * 24),
          );
          if (days < 0) desc += ` Venció hace ${Math.abs(days)} día(s).`;
          else if (days === 0) desc += ` Vence HOY.`;
          else desc += ` Vence en ${days} día(s).`;
        }

        await this.prisma.notification.create({
          data: {
            title: t.type === 'INCOME' ? 'Cobro Pendiente' : 'Pago Pendiente',
            description: desc,
            link: uniqueLink,
            userId,
          },
        });
      }
    }

    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  // Helper method to create a notification (e.g. called when a pending transaction is close to due date)
  async createNotification(
    userId: string,
    title: string,
    description: string,
    link: string,
  ) {
    return this.prisma.notification.create({
      data: {
        title,
        description,
        link,
        userId,
      },
    });
  }
}
