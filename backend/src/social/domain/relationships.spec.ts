import {
  assertCanFollow,
  followTransition,
  likeTransition,
  SocialViolation,
  unfollowTransition,
} from './relationships';
describe('social relationship decisions', () => {
  it('rejects self follow and malformed identifiers before persistence', () => {
    expect(() => assertCanFollow('same', 'same')).toThrow(SocialViolation);
    expect(() => assertCanFollow('a', '')).toThrow(SocialViolation);
  });
  it('makes repeated follow/unfollow idempotent for counters', () => {
    expect(followTransition(false)).toEqual({ active: true, delta: 1 });
    expect(followTransition(true)).toEqual({ active: true, delta: 0 });
    expect(unfollowTransition(true)).toEqual({ active: false, delta: -1 });
    expect(unfollowTransition(false)).toEqual({ active: false, delta: 0 });
  });
  it('toggles a like with exactly one balanced counter delta', () => {
    const first = likeTransition(false),
      second = likeTransition(first.active);
    expect(first.delta + second.delta).toBe(0);
    expect(second.active).toBe(false);
  });
});
