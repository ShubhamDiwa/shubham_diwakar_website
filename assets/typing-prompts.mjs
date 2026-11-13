export const prompts = [
  'Per my last email, please find attached the attachment I forgot to attach.',
  'Can we move the quick sync to after lunch? The calendar says we are all free at six.',
  'The report is ready for review. Please use the version marked final in the shared folder.',
  'I moved the meeting to Friday. Please let me know if you still want to have a meeting about moving it.',
  'The projector works now, but someone has to hold the cable at a very specific angle.',
  'Please update the tracker before the stand-up so we can read the tracker together.',
  'The customer called back during lunch. They would prefer a callback during our next lunch.',
  'The spreadsheet says the budget is approved. The approval email says to check the spreadsheet.',
  'We can ship today if the last reviewer clicks the button before they leave for the airport.',
  'The office printer is back online. It is currently printing everything we sent on Monday.',
  'Please bring your badge tomorrow. The spare badge is with the person working from home.',
  'The dashboard looks great on my screen. Could you send a screenshot from yours?',
  'The client liked the first draft. We are now trying to remember which file was the first draft.',
  'There are fresh cups in the pantry. The kettle will be available after the finance team leaves.',
  'The ticket has been reopened with a screen recording and the words: happens every time.',
  'We agreed on the next steps. Nobody wrote down who was supposed to take the first step.',
  'The file is too large for email. I have emailed you a screenshot of the error instead.',
  'The handover notes are ready. The only outstanding item is the handover meeting.',
  'Thanks for the quick reply. I have copied in the team so everyone can reply just as quickly.'
];

export function wordsPerMinute(prompt, elapsedMs) {
  return Math.min(300, Math.round(prompt.length * 12000 / Math.max(1000, elapsedMs)));
}

export function normalizeTyping(text) {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}
