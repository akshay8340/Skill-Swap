// Validates a meeting link people paste into a session (Google Meet, Zoom, ...).
// Only https links to the hosts the admins allow are accepted, so the chat cannot be used to spread random links.
export function normalizeMeetingLink(raw, hosts) {
  const text = String(raw ?? '').trim();
  if (!text) return { link: '' }; // clears the link
  if (text.length > 300) return { error: 'That link is too long' };
  let url;
  try {
    url = new URL(text);
  } catch {
    return { error: 'Enter the full link, starting with https://' };
  }
  if (url.protocol !== 'https:' || url.username || url.password) return { error: 'Meeting links must be plain https:// links' };
  const host = url.hostname.toLowerCase();
  if (!hosts.some((h) => host === h || host.endsWith('.' + h))) {
    return { error: `That meeting service is not allowed. Use one of: ${hosts.join(', ')}` };
  }
  return { link: url.href };
}
