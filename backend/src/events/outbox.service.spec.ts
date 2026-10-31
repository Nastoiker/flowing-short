import { OutboxService } from './outbox.service';

describe('durable outbox delivery', () => {
  const event = { id: 'event-1', aggregateId: 'user-1', payload: '{}', createdAt: new Date() };
  let prisma: any;
  let kafka: any;
  let service: OutboxService;
  beforeEach(() => {
    prisma = { outboxEvent: { findMany: jest.fn().mockResolvedValue([event]), update: jest.fn().mockResolvedValue({}) } };
    kafka = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new OutboxService(prisma, kafka);
  });

  it('marks publication only after broker acknowledgment', async () => {
    await service.flush();
    expect(kafka.publish).toHaveBeenCalledWith(event);
    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({ where: { id: event.id }, data: { publishedAt: expect.any(Date) } });
    expect(kafka.publish.mock.invocationCallOrder[0]).toBeLessThan(prisma.outboxEvent.update.mock.invocationCallOrder[0]);
  });

  it('retains failed events and retries the same event ID after recovery', async () => {
    kafka.publish.mockRejectedValueOnce(new Error('unavailable'));
    await service.flush();
    expect(prisma.outboxEvent.update).not.toHaveBeenCalled();
    await service.flush();
    expect(kafka.publish).toHaveBeenCalledTimes(2);
    expect(kafka.publish.mock.calls[0][0].id).toBe(kafka.publish.mock.calls[1][0].id);
    expect(prisma.outboxEvent.update).toHaveBeenCalledTimes(1);
  });

  it('does not run overlapping delivery batches', async () => {
    let resolve: () => void;
    kafka.publish.mockReturnValue(new Promise<void>(r => { resolve = r; }));
    const first = service.flush();
    const second = service.flush();
    expect(first).toBe(second);
    await Promise.resolve();
    resolve();
    await Promise.all([first, second]);
    expect(kafka.publish).toHaveBeenCalledTimes(1);
  });
});
