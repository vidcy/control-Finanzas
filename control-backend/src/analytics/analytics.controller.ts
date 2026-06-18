import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(@Req() req) {
    const userId = req.user.id;

    // Trigger stock alert check in background (runs internally to auto-create notifications)
    const stockAlerts = await this.analyticsService.getStockAlerts(userId);
    const profitMargin = await this.analyticsService.getProfitMargin(userId);
    const turnover = await this.analyticsService.getInventoryTurnover(userId);

    return {
      profitMargin,
      turnover,
      stockAlerts,
    };
  }

  @Get('advisor')
  async getAdvisor(@Req() req) {
    const userId = req.user.id;
    const advice = await this.analyticsService.getAiAdvice(userId);
    return {
      advice,
    };
  }
}
