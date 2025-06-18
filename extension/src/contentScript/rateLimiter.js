// --- Rate Limiter Constants ---
const { showFloatingMessage } = require('./floatingMessage');

const COMMENT_TIME_FRAMES = [
  { label: "1min", seconds: 1 * 60, threshold: 2 },
  { label: "24h", seconds: 24 * 60 * 60, threshold: 50 },
];
const COMMENT_TIMESTAMPS_KEY = 'ava_posted_comment_timestamps';
const ALERT_COOLDOWN_SECONDS = 5 * 60; // 5 minutes
const LAST_ALERT_KEY = 'ava_last_rate_limit_alert';

// --- Utility Functions ---

// Get current time in seconds
function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

// Remove timestamps older than the largest tracked time frame
function pruneOldTimestamps(timestamps) {
  const maxSeconds = Math.max(...COMMENT_TIME_FRAMES.map(tf => tf.seconds));
  const cutoff = nowSeconds() - maxSeconds;
  return timestamps.filter(ts => ts > cutoff);
}

// Record a new comment post timestamp
function recordCommentPost(callback) {
  const now = nowSeconds();
  chrome.storage.local.get([COMMENT_TIMESTAMPS_KEY], (result) => {
    let timestamps = result[COMMENT_TIMESTAMPS_KEY] || [];
    timestamps = pruneOldTimestamps(timestamps);
    timestamps.push(now);
    chrome.storage.local.set({ [COMMENT_TIMESTAMPS_KEY]: timestamps }, () => {
      if (callback) callback(timestamps);
    });
  });
}

// Get comment counts for all time frames
function getCommentCountsForTimeFrames(callback) {
  chrome.storage.local.get([COMMENT_TIMESTAMPS_KEY], (result) => {
    const timestamps = result[COMMENT_TIMESTAMPS_KEY] || [];
    const now = nowSeconds();
    const counts = COMMENT_TIME_FRAMES.map(tf => {
      const cutoff = now - tf.seconds;
      return {
        label: tf.label,
        count: timestamps.filter(ts => ts > cutoff).length,
        threshold: tf.threshold
      };
    });
    callback(counts);
  });
}

// Show a floating message if any rate limit is exceeded
function showRateLimitPopup(exceededFrames, anchorElement) {
  chrome.storage.local.get([LAST_ALERT_KEY], (result) => {
    const lastAlert = result[LAST_ALERT_KEY] || 0;
    const now = nowSeconds();
    if ((now - lastAlert) < ALERT_COOLDOWN_SECONDS) {
      return; // Don't show alert if within cooldown
    }
    const body = exceededFrames.map(f =>
      `You've been active! <b>${f.count}</b> comments in the last <b>${f.label}</b> (suggested max: ${f.threshold}).`
    ).join('<br>') + '<br><b>Tip:</b> Engaging is great, but spreading your comments out can help you get more authentic responses and avoid being seen as spammy.';
    showFloatingMessage({
      anchorElement: anchorElement || document.body,
      title: "Nice Engagement!",
      body: body
    });
    chrome.storage.local.set({ [LAST_ALERT_KEY]: now });
  });
}

// --- Exports ---
module.exports = {
  recordCommentPost,
  getCommentCountsForTimeFrames,
  showRateLimitPopup
}; 