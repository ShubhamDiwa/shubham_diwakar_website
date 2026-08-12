# Corporate Mazdoor — FINAL FIXED

## Fixed in this version

- Corporate Radio now uses the YouTube IFrame Player API.
- The compact bottom player is connected to the same YouTube player.
- Play / pause / previous / next work from the compact player.
- YouTube title, channel and thumbnail update dynamically when available.
- Removed the manual "Paste YouTube URL" box.
- Removed the "Another day. Another build." / "Your uploaded corporate clip." caption.
- Portfolio square project short-form tiles (PC / VO / MP / SH) removed.
- LinkedIn and GitHub added to both Corporate Mazdoor and the portfolio.

## YouTube Error 153

YouTube documents error 153 as a missing HTTP Referer/API client identification. This is why local `file://` opening can fail.

For local development, run the site with VS Code Live Server:
Right-click `index.html` -> Open with Live Server.

Do not double-click `index.html` for YouTube playback.

For deployment, use the hosted HTTPS website.

The site includes a strict-origin-when-cross-origin referrer policy as recommended for the embedded player.

## Links

LinkedIn:
https://www.linkedin.com/in/shubham-android-developer

GitHub:
https://github.com/ShubhamDiwa
