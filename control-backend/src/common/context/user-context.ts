import { AsyncLocalStorage } from 'async_hooks';

export interface UserContext {
  userId: string;
  userEmail: string;
}

export const userContextStorage = new AsyncLocalStorage<UserContext>();
