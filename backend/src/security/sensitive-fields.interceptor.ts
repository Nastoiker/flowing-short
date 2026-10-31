import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';
export function stripSensitiveFields(value: unknown): unknown {
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(stripSensitiveFields);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['hashpassword', 'password', 'oldpassword'].includes(key))
    .map(([key, item]) => [key, stripSensitiveFields(item)]));
  return value;
}
@Injectable()
export class SensitiveFieldsInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) { return next.handle().pipe(map(stripSensitiveFields)); }
}
