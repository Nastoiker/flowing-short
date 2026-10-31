export interface DirectoryEvent {
  eventId: string;
  userId: string;
  type: 'user.registered.v1' | 'user.profile.updated.v1';
  occurredAt?: string;
  aggregateVersion?: number;
  profile?: { displayName: string; authorUrl: string };
}
export class InvalidIdentityMessage extends Error {}
const identifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;
export function parseIdentityMessage(body: string): DirectoryEvent {
  if (body.length > 16384) throw new InvalidIdentityMessage('oversized');
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    throw new InvalidIdentityMessage('invalid_json');
  }
  if (
    !event ||
    !identifier(event.eventId) ||
    !identifier(event.userId) ||
    !['user.registered.v1', 'user.profile.updated.v1'].includes(event.type)
  )
    throw new InvalidIdentityMessage('invalid_contract');
  // Existing unpublished v1 events had only these three keys. Keep replay compatibility.
  if (
    event.schemaVersion === undefined &&
    event.type === 'user.registered.v1' &&
    Object.keys(event).length === 3
  ) {
    return { eventId: event.eventId, userId: event.userId, type: event.type };
  }
  if (
    event.schemaVersion !== 1 ||
    !Number.isSafeInteger(event.aggregateVersion) ||
    event.aggregateVersion > 2147483647 ||
    event.aggregateVersion < 0 ||
    typeof event.occurredAt !== 'string' ||
    !Number.isFinite(Date.parse(event.occurredAt)) ||
    !event.profile ||
    typeof event.profile.displayName !== 'string' ||
    !event.profile.displayName.trim() ||
    event.profile.displayName.length > 100 ||
    typeof event.profile.authorUrl !== 'string' ||
    event.profile.authorUrl.length > 200
  )
    throw new InvalidIdentityMessage('unsupported_schema');
  return {
    eventId: event.eventId,
    userId: event.userId,
    type: event.type,
    occurredAt: event.occurredAt,
    aggregateVersion: event.aggregateVersion,
    profile: {
      displayName: event.profile.displayName,
      authorUrl: event.profile.authorUrl,
    },
  };
}
