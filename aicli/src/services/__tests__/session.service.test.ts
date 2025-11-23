import { SessionService } from '../session.service';
import { SessionStorage } from '../../storage/session-storage';
import { contextService } from '../context.service';
import { configService } from '../config.service';

jest.mock('../../storage/session-storage');
jest.mock('../context.service');
jest.mock('../config.service');

const mockSession: any = {
  id: 'test-session',
  name: 'Test',
  created: new Date(),
  updated: new Date(),
  messages: [],
  context: {},
};

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();
    (configService.getSessionDirectory as jest.Mock).mockReturnValue('/tmp/test-sessions');
    sessionService = new SessionService();
  });

  it('should create a new session', async () => {
    (contextService.getContext as jest.Mock).mockResolvedValue({
      cwd: '/tmp',
      history: { commands: [] },
      git: { status: 'clean' },
      project: { type: 'typescript' }
    });
    const session = await sessionService.createSession('Test');
    expect(session.name).toBe('Test');
    expect(session.id).toBeDefined();
    expect(session.messages).toEqual([]);
  });

  it('should load a session', async () => {
    (SessionStorage.prototype.loadSession as jest.Mock).mockResolvedValue(mockSession);
    const session = await sessionService.loadSession('test-session');
    expect(session).toEqual(mockSession);
    expect(sessionService.getCurrentSession()).toEqual(mockSession);
  });

  it('should save current session', async () => {
    sessionService['currentSession'] = mockSession;
    await sessionService.saveCurrentSession();
    expect(SessionStorage.prototype.saveSession).toHaveBeenCalledWith(mockSession);
  });

  it('should list sessions', async () => {
    (SessionStorage.prototype.listSessions as jest.Mock).mockResolvedValue([mockSession]);
    const sessions = await sessionService.listSessions();
    expect(sessions).toEqual([mockSession]);
  });

  it('should delete session and clear current if matching', async () => {
    sessionService['currentSession'] = mockSession;
    await sessionService.deleteSession('test-session');
    expect(SessionStorage.prototype.deleteSession).toHaveBeenCalledWith('test-session');
    expect(sessionService.getCurrentSession()).toBeUndefined();
  });

  it('should add message to current session', () => {
    sessionService['currentSession'] = { ...mockSession, messages: [] };
    const msg = sessionService.addMessage('user', 'Hello');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
    expect(sessionService.getCurrentSession()?.messages.length).toBe(1);
  });

  it('should throw if no active session when adding message', () => {
    sessionService['currentSession'] = undefined;
    expect(() => sessionService.addMessage('user', 'Hello')).toThrow('No active session');
  });

  it('should get last N messages', () => {
    const messages = [
      { id: '1', role: 'user', content: 'A', timestamp: new Date() },
      { id: '2', role: 'assistant', content: 'B', timestamp: new Date() },
      { id: '3', role: 'user', content: 'C', timestamp: new Date() },
    ];
    sessionService['currentSession'] = { ...mockSession, messages };
    const lastTwo = sessionService.getLastNMessages(2);
    expect(lastTwo.length).toBe(2);
    expect(lastTwo[0].content).toBe('B');
    expect(lastTwo[1].content).toBe('C');
  });
});
