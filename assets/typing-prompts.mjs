export const prompts = [
  'Per my last email, please find attached the attachment I forgot to attach.',
  'Can we move the quick sync to after lunch? The calendar says we are all free at six.',
  'The report is ready for review. Please use the version marked final in the shared folder.'
];

export function wordsPerMinute(prompt, elapsedMs) {
  return Math.min(300, Math.round(prompt.length * 12000 / Math.max(1000, elapsedMs)));
}

export function normalizeTyping(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}
