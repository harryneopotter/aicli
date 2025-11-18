import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended for GCM
const KEY_LENGTH = 32; // 256 bits
const KEY_FILE = path.join(os.homedir(), '.warp-cli', '.session-key');

function ensureDirectory(): void {
  const dir = path.dirname(KEY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function normalizeEnvKey(key: string): Buffer {
  if (key.length === KEY_LENGTH) {
    return Buffer.from(key, 'utf8');
  }
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length === KEY_LENGTH) {
      return decoded;
    }
  } catch {
    // Fall through to hash-based derivation
  }
  return crypto.createHash('sha256').update(key).digest().subarray(0, KEY_LENGTH);
}

function getKey(): Buffer {
  const envKey = process.env.WARP_SESSION_KEY;
  if (envKey) {
    return normalizeEnvKey(envKey);
  }

  ensureDirectory();

  if (fs.existsSync(KEY_FILE)) {
    const data = fs.readFileSync(KEY_FILE, 'utf8').trim();
    return Buffer.from(data, 'base64');
  }

  const key = crypto.randomBytes(KEY_LENGTH);
  fs.writeFileSync(KEY_FILE, key.toString('base64'), { mode: 0o600 });
  return key;
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted].join(':');
}

export function decrypt(data: string): string {
  const [ivB64, tagB64, encrypted] = data.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
