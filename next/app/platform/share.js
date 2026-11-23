// Sending the shopping list out of the app as plain text (brief 6.3): the clipboard, and the share sheet.
// NOT verified on a Mac: what Reminders and Messages do with the text is on the phone checklist.

/** True when this phone offers a share sheet to web apps. */
export function canShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/** Put text on the clipboard. True when it worked. Must be called from a tap. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the older way.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.className = 'offscreen';
    document.body.append(area);
    area.select();
    area.setSelectionRange(0, text.length);
    const done = document.execCommand('copy');
    area.remove();
    return done;
  } catch {
    return false;
  }
}

/**
 * Open the share sheet with the text. Must be called from a tap.
 * @returns {Promise<'shared' | 'cancelled' | 'failed'>}
 */
export async function shareText(text) {
  if (!canShare()) return 'failed';
  try {
    await navigator.share({ text });
    return 'shared';
  } catch (error) {
    return error && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
