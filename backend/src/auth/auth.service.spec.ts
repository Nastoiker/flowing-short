import { AuthService } from './auth.service';
import { hash, compare } from 'bcryptjs';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
describe('AuthService registration and authentication', () => {
  const account = { id: 'test-user', email: 'test@example.test', login: 'tester', isActive: true };
  let prisma: any, service: AuthService;
  beforeEach(() => {
    prisma = { userModel: { create: jest.fn(async ({data}) => data), findFirst: jest.fn() }, outboxEvent: { create: jest.fn() }, $transaction: jest.fn(async (fn) => fn(prisma)) };
    service = new AuthService(prisma, { signAsync: jest.fn(async () => 'jwt') } as any);
  });
  it('hashes passwords and ignores a supplied admin role while atomically enqueueing an event', async () => {
    const response = await service.createUser({ ...account, hashpassword: 'TestPassword123!', role: 'admin' } as any);
    const saved = prisma.userModel.create.mock.calls[0][0].data;
    expect(saved.role).toBe('user');
    expect(await compare('TestPassword123!', saved.hashpassword)).toBe(true);
    expect(response).not.toHaveProperty('hashpassword');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.outboxEvent.create).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(prisma.outboxEvent.create.mock.calls)).not.toContain('TestPassword');
  });
  it('rejects invalid passwords and inactive accounts', async () => {
    const hashpassword = await hash('TestPassword123!', 4);
    prisma.userModel.findFirst.mockResolvedValue({ ...account, hashpassword });
    await expect(service.validateUser(account.email, 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.userModel.findFirst.mockResolvedValue({ ...account, hashpassword, isActive: false });
    await expect(service.validateUser(account.email, 'TestPassword123!')).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('returns a conflict on duplicate registration without leaking storage errors', async () => {
    prisma.$transaction.mockRejectedValue({ code: 'P2002', message: 'sensitive storage information' });
    await expect(service.createUser({ ...account, hashpassword: 'TestPassword123!' })).rejects.toBeInstanceOf(ConflictException);
  });
});
