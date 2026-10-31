import {
  DirectoryEvent,
  parseIdentityMessage,
} from '../domain/identity-message';
export interface CreatorProjection {
  applyOnce(event: DirectoryEvent): Promise<boolean>;
}
export class ProjectCreator {
  constructor(private readonly projection: CreatorProjection) {}
  execute(body: string) {
    return this.projection.applyOnce(parseIdentityMessage(body));
  }
}
