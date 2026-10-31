import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const path = fileURLToPath(new URL('../.env', import.meta.url));
try {
  writeFileSync(path, `JWT_SECRET=${randomBytes(48).toString('hex')}\nAPP_PORT=3000\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created local .env with a random JWT secret.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing .env preserved.');
}
