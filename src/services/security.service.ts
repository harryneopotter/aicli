import * as keytar from "keytar";
import * as crypto from "crypto";

export class SecurityService {
    private readonly SERVICE_NAME = "aicli";
    private readonly ENCRYPTION_KEY_ACCOUNT = "session_encryption_key";
    private readonly ALGORITHM = "aes-256-gcm";

    // --- Keychain Management ---

    async setSecret(account: string, secret: string): Promise<void> {
        await keytar.setPassword(this.SERVICE_NAME, account, secret);
    }

    async getSecret(account: string): Promise<string | null> {
        return await keytar.getPassword(this.SERVICE_NAME, account);
    }

    async deleteSecret(account: string): Promise<boolean> {
        return await keytar.deletePassword(this.SERVICE_NAME, account);
    }

    // --- Encryption ---

    private async getEncryptionKey(): Promise<Buffer> {
        let keyHex = await this.getSecret(this.ENCRYPTION_KEY_ACCOUNT);
        if (!keyHex) {
            // Generate a new 32-byte key
            keyHex = crypto.randomBytes(32).toString("hex");
            await this.setSecret(this.ENCRYPTION_KEY_ACCOUNT, keyHex);
        }
        return Buffer.from(keyHex, "hex");
    }

    async encrypt(text: string): Promise<string> {
        const key = await this.getEncryptionKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

        let encrypted = cipher.update(text, "utf8", "hex");
        encrypted += cipher.final("hex");
        const authTag = cipher.getAuthTag().toString("hex");

        // Format: iv:authTag:encryptedData
        return `${iv.toString("hex")}:${authTag}:${encrypted}`;
    }

    async decrypt(encryptedText: string): Promise<string> {
        try {
            const parts = encryptedText.split(":");
            if (parts.length !== 3) {
                throw new Error("Invalid encrypted format");
            }

            const [ivHex, authTagHex, encryptedHex] = parts;
            const key = await this.getEncryptionKey();
            const iv = Buffer.from(ivHex, "hex");
            const authTag = Buffer.from(authTagHex, "hex");
            const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedHex, "hex", "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
        } catch (error) {
            // If decryption fails, it might be plain text (legacy session)
            // Caller should handle this fallback or we can try to return original if it looks like JSON?
            // For now, just throw to let caller decide.
            throw new Error("Decryption failed");
        }
    }
}

export const securityService = new SecurityService();
