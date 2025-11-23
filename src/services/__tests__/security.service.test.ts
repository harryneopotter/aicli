import { SecurityService } from '../security.service';
import * as keytar from 'keytar';

jest.mock('keytar');

describe('SecurityService', () => {
  let securityService: SecurityService;
  const mockKeytar = keytar as jest.Mocked<typeof keytar>;

  beforeEach(() => {
    securityService = new SecurityService();
    jest.clearAllMocks();
  });

  describe('Keychain Management', () => {
    describe('setSecret', () => {
      it('should store secret in keychain', async () => {
        await securityService.setSecret('test-account', 'secret-value');

        expect(mockKeytar.setPassword).toHaveBeenCalledWith(
          'aicli',
          'test-account',
          'secret-value'
        );
      });
    });

    describe('getSecret', () => {
      it('should retrieve secret from keychain', async () => {
        mockKeytar.getPassword.mockResolvedValue('stored-secret');

        const secret = await securityService.getSecret('test-account');

        expect(mockKeytar.getPassword).toHaveBeenCalledWith('aicli', 'test-account');
        expect(secret).toBe('stored-secret');
      });

      it('should return null if secret not found', async () => {
        mockKeytar.getPassword.mockResolvedValue(null);

        const secret = await securityService.getSecret('nonexistent');

        expect(secret).toBeNull();
      });
    });

    describe('deleteSecret', () => {
      it('should delete secret from keychain', async () => {
        mockKeytar.deletePassword.mockResolvedValue(true);

        const result = await securityService.deleteSecret('test-account');

        expect(mockKeytar.deletePassword).toHaveBeenCalledWith('aicli', 'test-account');
        expect(result).toBe(true);
      });
    });
  });

    describe('Encryption', () => {
    beforeEach(() => {
      // Mock encryption key retrieval
      mockKeytar.getPassword.mockImplementation(async (_service, account) => {
        if (account === 'session_encryption_key') {
          return '0'.repeat(64); // 32 bytes as hex
        }
        return null;
      });
    });    describe('encrypt', () => {
      it('should encrypt text with AES-256-GCM', async () => {
        const plaintext = 'sensitive data';
        const encrypted = await securityService.encrypt(plaintext);

        // Format: iv:authTag:encryptedData
        const parts = encrypted.split(':');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toHaveLength(32); // 16 bytes IV as hex
        expect(parts[1]).toHaveLength(32); // 16 bytes auth tag as hex
        expect(parts[2].length).toBeGreaterThan(0);
      });

      it('should generate different IVs for same plaintext', async () => {
        const plaintext = 'test data';
        const encrypted1 = await securityService.encrypt(plaintext);
        const encrypted2 = await securityService.encrypt(plaintext);

        expect(encrypted1).not.toBe(encrypted2);
      });

      it('should generate encryption key if not exists', async () => {
        mockKeytar.getPassword.mockResolvedValueOnce(null); // No key exists
        mockKeytar.setPassword.mockResolvedValue(undefined);

        await securityService.encrypt('test');

        expect(mockKeytar.setPassword).toHaveBeenCalledWith(
          'aicli',
          'session_encryption_key',
          expect.any(String)
        );
      });
    });

    describe('decrypt', () => {
      it('should decrypt encrypted text', async () => {
        const plaintext = 'my secret message';
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);

        expect(decrypted).toBe(plaintext);
      });

      it('should throw error for invalid format', async () => {
        await expect(securityService.decrypt('invalid:format')).rejects.toThrow(
          'Decryption failed'
        );
      });

      it('should throw error for tampered ciphertext', async () => {
        const plaintext = 'test';
        const encrypted = await securityService.encrypt(plaintext);

        // Tamper with the ciphertext
        const parts = encrypted.split(':');
        parts[2] = 'tampered';
        const tampered = parts.join(':');

        await expect(securityService.decrypt(tampered)).rejects.toThrow(
          'Decryption failed'
        );
      });

      it('should handle decryption with wrong key', async () => {
        const plaintext = 'secret';
        const encrypted = await securityService.encrypt(plaintext);

        // Change the key
        mockKeytar.getPassword.mockResolvedValue('1'.repeat(64));

        await expect(securityService.decrypt(encrypted)).rejects.toThrow(
          'Decryption failed'
        );
      });
    });

    describe('encrypt/decrypt round-trip', () => {
      it('should handle empty string', async () => {
        const encrypted = await securityService.encrypt('');
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe('');
      });

      it('should handle unicode characters', async () => {
        const plaintext = '🔒 Encrypted: 你好世界 مرحبا';
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });

      it('should handle large text', async () => {
        const plaintext = 'a'.repeat(10000);
        const encrypted = await securityService.encrypt(plaintext);
        const decrypted = await securityService.decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      });

      it('should handle JSON data', async () => {
        const jsonData = JSON.stringify({ user: 'test', session: 123, data: [1, 2, 3] });
        const encrypted = await securityService.encrypt(jsonData);
        const decrypted = await securityService.decrypt(encrypted);
        expect(JSON.parse(decrypted)).toEqual(JSON.parse(jsonData));
      });
    });
  });
});