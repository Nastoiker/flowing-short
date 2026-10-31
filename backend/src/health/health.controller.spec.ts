import { ServiceUnavailableException } from '@nestjs/common';
import { boundedCheck, HealthController } from './health.controller';

describe('health checks', () => {
  const query = jest.fn();
  const check = jest.fn();
  let controller: HealthController;
  beforeEach(() => {
    query.mockReset().mockResolvedValue([{ 1: 1 }]);
    check.mockReset().mockResolvedValue(undefined);
    controller = new HealthController({ $queryRaw: query } as any, { check } as any);
  });

  it('liveness does not depend on the database or Kafka', () => {
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
    expect(check).not.toHaveBeenCalled();
  });

  it.each(['database', 'kafka'])('returns sanitized 503 on %s failure and recovers', async dependency => {
    const failing = dependency === 'database' ? query : check;
    failing.mockRejectedValueOnce(new Error('password=secret address=private-host'));
    try {
      await controller.ready();
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect(error.getStatus()).toBe(503);
      expect(error.getResponse()).toEqual({ status: 'unavailable', checks: {
        database: dependency === 'database' ? 'down' : 'up',
        kafka: dependency === 'kafka' ? 'down' : 'up',
      } });
    }
    await expect(controller.ready()).resolves.toEqual({ status: 'ok', checks: { database: 'up', kafka: 'up' } });
  });

  it('bounds a hung dependency and clears timeout timers', async () => {
    jest.useFakeTimers();
    const result = boundedCheck(() => new Promise(() => {}));
    jest.advanceTimersByTime(2000);
    await expect(result).resolves.toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('coalesces database queries during concurrent probes', async () => {
    let resolve: (value: unknown) => void;
    query.mockReturnValue(new Promise(r => { resolve = r; }));
    const first = controller.ready();
    const second = controller.ready();
    await Promise.resolve();
    expect(query).toHaveBeenCalledTimes(1);
    resolve([]);
    await Promise.all([first, second]);
  });
});
