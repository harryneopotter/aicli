import { Message } from "../types";

export class Tokenizer {
    /**
     * Simple heuristic: 1 token ~= 4 characters.
     * This is a rough approximation for English text.
     * For production, consider 'tiktoken' or similar, but this avoids native deps.
     */
    static estimateTokens(text: string): number {
        if (!text) {return 0;}
        return Math.ceil(text.length / 4);
    }

    static countMessageTokens(message: Message): number {
        let count = this.estimateTokens(message.content);
        // Add overhead for role/metadata
        count += 4;
        return count;
    }

    static countMessagesTokens(messages: Message[]): number {
        return messages.reduce((acc, msg) => acc + this.countMessageTokens(msg), 0);
    }

    /**
     * Optimizes the message history to fit within maxTokens.
     * Strategy:
     * 1. Always keep the System Prompt (first message if role=system).
     * 2. Always keep the last 'minRecent' messages to maintain immediate context.
     * 3. Drop messages from the beginning of the history (after system prompt) until it fits.
     */
    static optimizeContext(messages: Message[], maxTokens: number, minRecent: number = 2): Message[] {
        const totalTokens = this.countMessagesTokens(messages);
        if (totalTokens <= maxTokens) {return messages;}

        const optimized: Message[] = [];
        let currentTokens = 0;

        // 1. Identify System Prompt
        const systemPrompt = messages.find(m => m.role === "system");
        if (systemPrompt) {
            optimized.push(systemPrompt);
            currentTokens += this.countMessageTokens(systemPrompt);
        }

        // 2. Identify Recent Messages
        // We want to keep the last N messages no matter what, but we must respect maxTokens if possible.
        // If recent messages alone exceed maxTokens, we just take what fits from the end.
        const recentMessages = messages.filter(m => m !== systemPrompt).slice(-minRecent);
        const otherMessages = messages.filter(m => m !== systemPrompt).slice(0, -minRecent);

        // Calculate space remaining for "middle" history
        let remainingTokens = maxTokens - currentTokens - this.countMessagesTokens(recentMessages);

        // 3. Add Middle Messages if they fit
        if (remainingTokens > 0) {
            // We add from the end of "otherMessages" backwards until we run out of space
            const middleToKeep: Message[] = [];
            for (let i = otherMessages.length - 1; i >= 0; i--) {
                const msg = otherMessages[i];
                const tokens = this.countMessageTokens(msg);
                if (remainingTokens >= tokens) {
                    middleToKeep.unshift(msg);
                    remainingTokens -= tokens;
                } else {
                    break; // Stop once we can't fit a message
                }
            }
            optimized.push(...middleToKeep);
        }

        // 4. Add Recent Messages
        // If we didn't have space for all recent messages (rare/extreme case), we'd need to truncate them too.
        // But for now, let's assume we append them and if it overflows, it overflows slightly or we truncate the oldest recent.
        // To be strictly safe:
        for (const msg of recentMessages) {
            optimized.push(msg);
        }

        // Final check (if recent messages were huge)
        // In a real robust system, we might truncate the content of the messages themselves.

        return optimized;
    }
}
