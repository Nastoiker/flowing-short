import { InvalidFeedQuery, ReadFeed } from './read-feed';
describe('bounded feed query', () => {
  it('reads one look-ahead row and returns stable pagination metadata', async () => {
    const fetch = jest.fn(async () => [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    expect(
      await new ReadFeed({ fetch }).execute({
        limit: '2',
        offset: '0',
        sort: 'popular',
      }),
    ).toEqual({
      items: [{ id: 'a' }, { id: 'b' }],
      hasMore: true,
      nextOffset: 2,
    });
    expect(fetch).toHaveBeenCalledWith({
      limit: 3,
      offset: 0,
      sort: 'popular',
    });
  });
  it.each([
    { limit: '0' },
    { limit: '100000' },
    { offset: '-1' },
    { offset: '10001' },
    { sort: 'random' },
    { limit: 'NaN' },
  ])('rejects invalid query %p', async (input) => {
    const fetch = jest.fn();
    await expect(new ReadFeed({ fetch }).execute(input)).rejects.toBeInstanceOf(
      InvalidFeedQuery,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
