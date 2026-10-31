import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';
@Injectable()
export class AdminJwtAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await super.canActivate(context);
    // Passport loads the current role from the database, never from client input.
    if (context.switchToHttp().getRequest().user?.role !== 'admin') throw new ForbiddenException();
    return true;
  }
}
