import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class TimezoneMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    req.userTimezone = req.headers['x-timezone'] || 'UTC';
    next();
  }
}
