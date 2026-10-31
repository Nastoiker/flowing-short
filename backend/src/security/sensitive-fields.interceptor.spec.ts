import { stripSensitiveFields } from './sensitive-fields.interceptor';
describe('response secret filtering', () => {
  it('removes passwords from nested users without changing dates or tokens', () => {
    const createdAt = new Date();
    expect(stripSensitiveFields({ access_token: 'token', createdAt, authors: [
      { id: 'user', hashpassword: 'hash', nested: { password: 'plain', oldpassword: 'old' } },
    ] })).toEqual({ access_token: 'token', createdAt, authors: [{ id: 'user', nested: {} }] });
  });
});
