import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { userContextStorage } from '../context/user-context';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Set by Passport JWT Guard
    if (user) {
      const userId = user.id || user.userId || user.sub;
      const userEmail = user.email || user.userEmail;
      if (userId) {
        return new Observable((subscriber) => {
          userContextStorage.run(
            { userId, userEmail: userEmail || 'unknown' },
            () => {
              next.handle().subscribe(subscriber);
            },
          );
        });
      }
    }
    return next.handle();
  }
}
