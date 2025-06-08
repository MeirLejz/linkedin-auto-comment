const supabase = require('./supabaseConfig.js');

// =========================
// SessionManager Class (Supabase-only)
// =========================
class SessionManager {
  constructor() {
    this.session = null; // in-memory cache
    this.SAFE_EXPIRY_WINDOW = 60; // seconds
  }

  async loadSession() {
    if (this.session) return this.session;
    const { userSession } = await chrome.storage.local.get('userSession');
    this.session = userSession || null;
    return this.session;
  }

  async saveSession(session) {
    this.session = session;
    await chrome.storage.local.set({ userSession: session });
  }

  async clearSession() {
    this.session = null;
    await chrome.storage.local.remove('userSession');
  }

  // Check if a token is expiring within SAFE_EXPIRY_WINDOW seconds
  isExpiringSoon(expires_at) {
    if (!expires_at) return true;
    const now = Math.floor(Date.now() / 1000);
    return (expires_at - now) < this.SAFE_EXPIRY_WINDOW;
  }

  // Supabase sign in with Google ID token (for initial login)
  async signInSupabaseWithGoogleIdToken(id_token) {
    const { user, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: id_token,
    });
    if (error) throw new Error('Supabase signInWithIdToken failed: ' + error.message);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw new Error('Supabase getSession failed: ' + sessionError.message);
    if (!session) throw new Error('No Supabase session after sign-in');
    return session;
  }

  // Supabase refresh
  async refreshSupabaseSession(refresh_token) {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) throw new Error(error.message);
    if (!data?.session) throw new Error('No Supabase session after refresh');
    return data.session;
  }

  // Ensure Supabase token is fresh
  async ensureFreshSession() {
    let session = await this.loadSession();
    if (!session || !session.supabase) throw new Error('No session found');
    let updated = false;
    // Supabase token
    if (this.isExpiringSoon(session.supabase.expires_at)) {
      try {
        const newSupabase = await this.refreshSupabaseSession(session.supabase.refresh_token);
        session.supabase = {
          access_token: newSupabase.access_token,
          refresh_token: newSupabase.refresh_token, // Always update to latest!
          expires_at: newSupabase.expires_at,
          user: {
            id: newSupabase.user.id,
            email: newSupabase.user.email,
          },
        };
        updated = true;
        console.log('[SessionManager] Refreshed Supabase session');
      } catch (e) {
        // If refresh fails (e.g., refresh_token_already_used), sign out
        await this.signOut();
        throw new Error('Session expired or invalid. Please sign in again. (' + e.message + ')');
      }
    }
    if (updated) await this.saveSession(session);
    // Always update supabase client
    supabase.auth.setSession({
      access_token: session.supabase.access_token,
      refresh_token: session.supabase.refresh_token,
    });
    return session;
  }

  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    await this.clearSession();
  }
}

const sessionManager = new SessionManager();

module.exports = { SessionManager, sessionManager }; 