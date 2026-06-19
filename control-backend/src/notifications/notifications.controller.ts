import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(@Request() req, @Query('workspace') workspace: string) {
    return this.notificationsService.getNotifications(req.user.id, workspace);
  }

  @Patch('read-all')
  markAllAsRead(@Request() req, @Query('workspace') workspace: string) {
    return this.notificationsService.markAllAsRead(req.user.id, workspace);
  }

  @Patch(':id/read')
  markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, id);
  }
}
