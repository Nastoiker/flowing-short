const { mkdirSync, openSync, closeSync } = require('node:fs');
const { resolve, dirname } = require('node:path');
const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('file:')) throw new Error('DATABASE_URL must be a SQLite file URL');
const filename = decodeURIComponent(url.slice(5).split('?')[0]);
if (!filename || filename === ':memory:') throw new Error('A persistent SQLite file is required');
const databasePath = resolve(__dirname, '../prisma', filename);
mkdirSync(dirname(databasePath), { recursive: true });
// Prisma 4 migrations require an existing file on some platforms. Append mode
// creates an absent database and never truncates an existing user's database.
closeSync(openSync(databasePath, 'a'));
