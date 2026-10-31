import { assertCanFollow, requireId } from '../domain/relationships';
export interface SocialRepository {
  follow(userId: string, authorId: string): Promise<unknown>;
  unfollow(id: string, userId: string, authorId: string): Promise<unknown>;
  toggleLike(userId: string, videoId: string): Promise<unknown>;
}
export class SocialGraph {
  constructor(private readonly repository: SocialRepository) {}
  follow(userId: string, authorId: string) {
    assertCanFollow(userId, authorId);
    return this.repository.follow(userId, authorId);
  }
  unfollow(id: string, userId: string, authorId: string) {
    requireId(id);
    assertCanFollow(userId, authorId);
    return this.repository.unfollow(id, userId, authorId);
  }
  toggleLike(userId: string, videoId: string) {
    requireId(userId);
    requireId(videoId);
    return this.repository.toggleLike(userId, videoId);
  }
}
