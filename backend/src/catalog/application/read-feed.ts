export class InvalidFeedQuery extends Error {}
export interface FeedQuery {
  limit: number;
  offset: number;
  sort: 'recent' | 'popular';
}
export interface FeedReader {
  fetch(query: FeedQuery): Promise<unknown[]>;
}
export class ReadFeed {
  constructor(private readonly reader: FeedReader) {}
  async execute(input: { limit?: string; offset?: string; sort?: string }) {
    const limit = input.limit === undefined ? 12 : Number(input.limit);
    const offset = input.offset === undefined ? 0 : Number(input.offset);
    const sort = input.sort || 'recent';
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 30 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 10000 ||
      (sort !== 'recent' && sort !== 'popular')
    )
      throw new InvalidFeedQuery('Invalid feed pagination or sort');
    const rows = await this.reader.fetch({ limit: limit + 1, offset, sort });
    const hasMore = rows.length > limit && offset + limit <= 10000;
    return {
      items: rows.slice(0, limit),
      hasMore,
      nextOffset: hasMore ? offset + limit : null,
    };
  }
}
