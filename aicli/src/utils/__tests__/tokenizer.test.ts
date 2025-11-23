import { Tokenizer } from '../tokenizer';
import { Message } from '../../types';

describe('Tokenizer', () => {
  describe('estimateTokens', () => {
    it('should return 0 for empty string', () => {
      expect(Tokenizer.estimateTokens('')).toBe(0);
    });

    it('should estimate tokens correctly', () => {
      expect(Tokenizer.estimateTokens('hello')).toBe(2); // 5/4 ceil = 2
      expect(Tokenizer.estimateTokens('hello world')).toBe(3); // 11/4 ceil = 3
    });
  });

  describe('countMessageTokens', () => {
    it('should count tokens including overhead', () => {
      const msg: Message = {
        id: '1',
        role: 'user',
        content: 'hello',
        timestamp: new Date(),
      };
      expect(Tokenizer.countMessageTokens(msg)).toBe(6); // 2 + 4
    });
  });

  describe('countMessagesTokens', () => {
    it('should sum tokens of all messages', () => {
      const messages: Message[] = [
        { id: '1', role: 'user', content: 'hello', timestamp: new Date() },
        { id: '2', role: 'assistant', content: 'world', timestamp: new Date() },
      ];
      expect(Tokenizer.countMessagesTokens(messages)).toBe(12); // 6 + 6
    });
  });

  describe('optimizeContext', () => {
    const systemMsg: Message = { id: 's', role: 'system', content: 'sys', timestamp: new Date() }; // 1+4=5
    const msg1: Message = { id: '1', role: 'user', content: 'one', timestamp: new Date() }; // 1+4=5
    const msg2: Message = { id: '2', role: 'assistant', content: 'two', timestamp: new Date() }; // 1+4=5
    const msg3: Message = { id: '3', role: 'user', content: 'three', timestamp: new Date() }; // 2+4=6
    const msg4: Message = { id: '4', role: 'assistant', content: 'four', timestamp: new Date() }; // 1+4=5

    it('should return all messages if within limit', () => {
      const messages = [systemMsg, msg1, msg2];
      const optimized = Tokenizer.optimizeContext(messages, 100);
      expect(optimized).toHaveLength(3);
    });

    it('should keep system prompt and recent messages', () => {
      const messages = [systemMsg, msg1, msg2, msg3, msg4];
      // Total tokens: 5 + 5 + 5 + 6 + 5 = 26
      // Limit to 16 (System=5, Recent=2 msgs (msg3=6, msg4=5) = 11. Total 16. msg1, msg2 should be dropped)
      
      const optimized = Tokenizer.optimizeContext(messages, 16, 2);
      
      expect(optimized).toHaveLength(3);
      expect(optimized[0].role).toBe('system');
      expect(optimized[1].content).toBe('three');
      expect(optimized[2].content).toBe('four');
    });

    it('should keep middle messages if space permits', () => {
      const messages = [systemMsg, msg1, msg2, msg3, msg4];
      // Limit to 21 (System=5, Recent=11. Remaining=5. msg2=5 fits. msg1=5 fits? No, only 5 left.)
      // Wait, logic:
      // System: 5
      // Recent (msg3, msg4): 11
      // Remaining: 21 - 5 - 11 = 5
      // Middle candidates: msg1, msg2.
      // Loop backwards:
      // msg2 (5 tokens): Fits. Remaining = 0.
      // msg1 (5 tokens): No space.
      
      const optimized = Tokenizer.optimizeContext(messages, 21, 2);
      
      expect(optimized).toHaveLength(4);
      expect(optimized.map(m => m.id)).toEqual(['s', '2', '3', '4']);
    });
  });
});
