export class SocialViolation extends Error {
  constructor(
    readonly code: 'invalid' | 'missing' | 'forbidden',
    message: string,
  ) {
    super(message);
  }
}
export function requireId(id: string) {
  if (typeof id !== 'string' || !id.trim() || id.length > 128)
    throw new SocialViolation('invalid', 'Invalid relationship identifier');
}
export function assertCanFollow(userId: string, authorId: string) {
  requireId(userId);
  requireId(authorId);
  if (userId === authorId)
    throw new SocialViolation('invalid', 'Cannot follow yourself');
}
export function followTransition(current: boolean): {
  active: true;
  delta: 0 | 1;
} {
  return { active: true, delta: current ? 0 : 1 };
}
export function unfollowTransition(current: boolean): {
  active: false;
  delta: 0 | -1;
} {
  return { active: false, delta: current ? -1 : 0 };
}
export function likeTransition(current: boolean): {
  active: boolean;
  delta: 1 | -1;
} {
  return { active: !current, delta: current ? -1 : 1 };
}
