const { SessionManager } = require('../background/sessionManager');

// Mock supabaseConfig
jest.mock('./supabaseConfig', () => ({
  auth: {
    signInWithIdToken: jest.fn(),
    getSession: jest.fn(),
    refreshSession: jest.fn(),
    setSession: jest.fn(),
    signOut: jest.fn(),
  }
}));

// Mock chrome.storage.local
const mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: jest.fn(async (key) => {
        if (typeof key === 'string') return { [key]: mockStorage[key] };
        if (Array.isArray(key)) {
          const result = {};
          key.forEach(k => { result[k] = mockStorage[k]; });
          return result;
        }
        return { userSession: mockStorage.userSession };
      }),
      set: jest.fn(async (obj) => {
        Object.assign(mockStorage, obj);
      }),
      remove: jest.fn(async (key) => {
        delete mockStorage[key];
      })
    }
  }
};

describe('SessionManager', () => {
  let sessionManager;
  const now = Math.floor(Date.now() / 1000);

  beforeEach(() => {
    sessionManager = new SessionManager();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  it('refreshes session when expiring soon', async () => {
    // Arrange: set an expiring session
    const expiringSession = {
      supabase: {
        access_token: 'old',
        refresh_token: 'refresh',
        expires_at: now + 10, // 10 seconds from now
        user: { id: 'uid', email: 'test@example.com' }
      }
    };
    mockStorage.userSession = expiringSession;
    const newSession = {
      access_token: 'new',
      refresh_token: 'refresh2',
      expires_at: now + 3600,
      user: { id: 'uid', email: 'test@example.com' }
    };
    require('../background/supabaseConfig').auth.refreshSession.mockResolvedValue({ data: { session: newSession } });

    // Act
    const session = await sessionManager.ensureFreshSession();

    // Assert
    expect(session.supabase.access_token).toBe('new');
    expect(require('../background/supabaseConfig').auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'refresh' });
    expect(require('../background/supabaseConfig').auth.setSession).toHaveBeenCalledWith({
      access_token: 'new',
      refresh_token: 'refresh2',
    });
  });

  it('does not refresh if session is not expiring soon', async () => {
    const validSession = {
      supabase: {
        access_token: 'valid',
        refresh_token: 'refresh',
        expires_at: now + 3600,
        user: { id: 'uid', email: 'test@example.com' }
      }
    };
    mockStorage.userSession = validSession;

    const session = await sessionManager.ensureFreshSession();
    expect(session.supabase.access_token).toBe('valid');
    expect(require('../background/supabaseConfig').auth.refreshSession).not.toHaveBeenCalled();
  });

  it('throws and signs out if refresh fails', async () => {
    const expiringSession = {
      supabase: {
        access_token: 'old',
        refresh_token: 'refresh',
        expires_at: now + 10,
        user: { id: 'uid', email: 'test@example.com' }
      }
    };
    mockStorage.userSession = expiringSession;
    require('../background/supabaseConfig').auth.refreshSession.mockRejectedValue(new Error('refresh_token invalid'));
    const signOutSpy = jest.spyOn(sessionManager, 'signOut').mockImplementation(async () => {});
    await expect(sessionManager.ensureFreshSession()).rejects.toThrow('Session expired or invalid. Please sign in again. (refresh_token invalid)');
    expect(signOutSpy).toHaveBeenCalled();
  });

  it('throws if no session found', async () => {
    mockStorage.userSession = undefined;
    await expect(sessionManager.ensureFreshSession()).rejects.toThrow('No session found');
  });

  it('saveSession and loadSession persist and retrieve session', async () => {
    const sessionData = { foo: 'bar' };
    await sessionManager.saveSession(sessionData);
    // Clear in-memory cache to force load from storage
    sessionManager.session = null;
    const loaded = await sessionManager.loadSession();
    expect(loaded).toEqual(sessionData);
  });

  it('clearSession removes session from storage and memory', async () => {
    const sessionData = { foo: 'bar' };
    await sessionManager.saveSession(sessionData);
    await sessionManager.clearSession();
    expect(sessionManager.session).toBeNull();
    expect(mockStorage.userSession).toBeUndefined();
  });

  describe('isExpiringSoon', () => {
    it('returns true if expires_at is missing', () => {
      expect(sessionManager.isExpiringSoon(undefined)).toBe(true);
      expect(sessionManager.isExpiringSoon(null)).toBe(true);
    });
    it('returns true if expires_at is within SAFE_EXPIRY_WINDOW', () => {
      const soon = now + 30; // 30 seconds from now, window is 60
      expect(sessionManager.isExpiringSoon(soon)).toBe(true);
    });
    it('returns false if expires_at is far in the future', () => {
      const future = now + 3600;
      expect(sessionManager.isExpiringSoon(future)).toBe(false);
    });
  });
}); 