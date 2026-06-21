/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-this-alias */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { userContextStorage } from '../common/context/user-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly client: any;

  constructor() {
    super();
    const self = this; // Capture the base PrismaClient instance

    // Helper to get camelCase model key for Prisma client property mapping
    const getModelKey = (modelName: string): string => {
      if (!modelName) return '';
      return modelName.charAt(0).toLowerCase() + modelName.slice(1);
    };

    // We extend the client to intercept writes (create, update, delete)
    const extended = this.$extends({
      query: {
        $allModels: {
          async create({
            model,
            args,
            query,
          }: {
            model: string;
            args: any;
            query: (args: any) => Promise<any>;
          }) {
            if (model === 'AuditLog') {
              return query(args);
            }
            const result = await query(args);
            const context = userContextStorage.getStore();
            try {
              // We use the base client instance (self) to perform the audit log write,
              // preventing infinite recursion and avoiding undefined context.
              await (self as any).auditLog.create({
                data: {
                  action: 'INSERT',
                  tableName: model,
                  recordId: String(result.id || ''),
                  oldValues: null,
                  newValues: JSON.parse(JSON.stringify(result)),
                  userId: context?.userId || null,
                  userEmail: context?.userEmail || null,
                },
              });
            } catch (e) {
              console.error('AuditLog Error (create):', e);
            }
            return result;
          },
          async update({
            model,
            args,
            query,
          }: {
            model: string;
            args: any;
            query: (args: any) => Promise<any>;
          }) {
            if (model === 'AuditLog') {
              return query(args);
            }
            const context = userContextStorage.getStore();
            let oldValues: any = null;
            try {
              // Retrieve old record from the base client instance (self)
              const modelKey = getModelKey(model);
              oldValues = await (self as any)[modelKey].findUnique({
                where: args.where,
              });
            } catch (e) {
              console.error('AuditLog: failed to fetch old record', e);
            }

            const result = await query(args);

            try {
              await (self as any).auditLog.create({
                data: {
                  action: 'UPDATE',
                  tableName: model,
                  recordId: String(result.id || args.where?.id || ''),
                  oldValues: oldValues
                    ? JSON.parse(JSON.stringify(oldValues))
                    : null,
                  newValues: JSON.parse(JSON.stringify(result)),
                  userId: context?.userId || null,
                  userEmail: context?.userEmail || null,
                },
              });
            } catch (e) {
              console.error('AuditLog Error (update):', e);
            }
            return result;
          },
          async delete({
            model,
            args,
            query,
          }: {
            model: string;
            args: any;
            query: (args: any) => Promise<any>;
          }) {
            if (model === 'AuditLog') {
              return query(args);
            }
            const context = userContextStorage.getStore();
            let oldValues: any = null;
            try {
              // Retrieve old record from the base client instance (self)
              const modelKey = getModelKey(model);
              oldValues = await (self as any)[modelKey].findUnique({
                where: args.where,
              });
            } catch (e) {
              console.error(
                'AuditLog: failed to fetch record before delete',
                e,
              );
            }

            const result = await query(args);

            try {
              await (self as any).auditLog.create({
                data: {
                  action: 'DELETE',
                  tableName: model,
                  recordId: String(args.where?.id || result.id || ''),
                  oldValues: oldValues
                    ? JSON.parse(JSON.stringify(oldValues))
                    : null,
                  newValues: null,
                  userId: context?.userId || null,
                  userEmail: context?.userEmail || null,
                },
              });
            } catch (e) {
              console.error('AuditLog Error (delete):', e);
            }
            return result;
          },
        },
      },
    });

    this.client = extended;

    // Use ES6 Proxy to delegate all database calls (e.g. this.prisma.product.findMany)
    // to the extended client seamlessly, keeping dependency injection fully compatible.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target.client) {
          const value = target.client[prop];
          if (typeof value === 'function') {
            return value.bind(target.client);
          }
          return value;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
