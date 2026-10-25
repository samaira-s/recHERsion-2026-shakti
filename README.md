# Shakti

**Your witness. Your vault. Only yours.**

shakti (Sanskrit for "power") is a private evidence and response companion for women facing online abuse in India: sextortion, morphed images, stalking and impersonation. It turns the first panicked hour after abuse into sealed, report-ready evidence, kept on the user's own device.

Built for **recHERsion 2026** (ACM-W, NITK Surathkal), Problem Statement 2: Women's Safety.

- **Live app:** `<add your published URL>`
- **Demo video:** `<add link>`
- **Presentation:** `<add link or file name>`
- **Team:** `<team name and members>`

---

## The problem

Cybercrime against women is rising (76,650+ incidents were reported on the National Cyber Crime Reporting Portal in 2025, per Rajya Sabha data). A March 2026 parliamentary committee report cites stigma, fear of police and a complex reporting portal as reasons women do not report. Frightened victims often delete chats or pay blackmailers before preserving evidence. Most safety tools help during an emergency; very few help in the first hour after online abuse.

## What Shakti does

1. **Hide:** the app opens as a working calculator. The user's PIN followed by `=` unlocks it; a wrong PIN is just arithmetic.
2. **Capture:** screenshots, pasted chats and links are saved to an encrypted local vault.
3. **Understand:** each message is scored by stage (rapport, platform shift, image request, pressure, payment demand) and plotted as a risk curve, with calm do and don't guidance.
4. **Report:** suspect details (phone numbers, UPI IDs, handles, links) are extracted, and an NCRP-style complaint draft is prepared.
5. **Verify:** an evidence PDF carries a QR code that lets anyone check the files are unchanged since export.

## Features

- Working calculator disguise with PIN setup and unlock; increasing delay after repeated wrong PINs
- Encrypted local evidence vault (no account, no server copy of evidence)
- Hash-chained evidence with an integrity page and a "simulate tampering" demo
- Sextortion risk detector with escalation timeline, plus a deepfake **response playbook** (the app does not claim to detect deepfakes)
- Suspect extractor using regex and OCR (English and Hindi)
- NCRP complaint guide with per-field copy buttons, in English, Hindi and regional languages
- Evidence PDF for legal review with an embedded QR code, and a public verify page
- Quick exit and clear (panic wipe), demo mode with synthetic data, and a no-AI mode

> If any feature below is not in your final build, delete it from this list before submitting: duress PIN with decoy vault, helper mode with consent screen, perceptual image hash matching, voice input.

## Tech stack and dependencies

| Area | Used |
|---|---|
| Framework | React, TypeScript, Vite |
| Styling | Tailwind CSS, lucide-react icons |
| Routing | react-router |
| Local storage | `idb` (IndexedDB wrapper) |
| Cryptography | Web Crypto API (AES-GCM, PBKDF2, SHA-256), built into the browser |
| Charts | recharts |
| PDF and QR | jsPDF, qrcode |
| OCR | tesseract.js |
| AI analysis | Google Gemini API via `@google/genai` (optional) |
| Browser APIs | Web Speech API (voice input, where supported) |
| Fonts | Google Fonts (see `index.html` for the exact families) |

Exact versions are pinned in `package.json`. Requires **Node.js 18 or newer** and npm.

## Setup and run

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd <repo-folder>

# 2. Install dependencies
npm install

# 3. Configure environment (optional, only needed for AI analysis)
cp .env.example .env.local     # if the file exists, otherwise create .env.local
# then add:  GEMINI_API_KEY=your_key_here

# 4. Start the development server
npm run dev
```

Open the local address printed in the terminal (usually `http://localhost:3000` or `http://localhost:5173`).

**Production build**

```bash
npm run build
npm run preview
```

**Tests** (hash chain, encryption and extractor tests)

```bash
npm test
```

> Check `package.json` for the exact script names and `vite.config` for the exact environment variable name your build reads, and correct this section if they differ.

**Without an API key:** the app still works. The risk detector falls back to rule-based scoring and a static checklist, and the "No-AI mode" toggle in Settings sends nothing anywhere.

**Deploying:** if your host serves the app under its own domain, add that domain to `server.allowedHosts` and `preview.allowedHosts` in `vite.config`, otherwise Vite blocks the request.

## Demo access

1. Open the app. On first launch, tap the small setup link on the calculator and create a PIN.
2. For judges: demo PIN is `<add the PIN you want judges to use>`.
3. After unlocking, choose **Load demo case** to see a synthetic sextortion conversation, the risk timeline, the suspect sheet, the integrity page and the PDF export.

All demo content is synthetic. No real personal data is used anywhere in this project.

## How the privacy and integrity work

- **Encryption:** each case is encrypted with AES-GCM. The key is derived from the user's PIN with PBKDF2 (310,000 iterations, random salt). Only the salt, an encrypted vault check and opaque encrypted case data are stored in IndexedDB. The unlocked key lives in memory only.
- **Evidence chain:** every item gets a SHA-256 content hash, and `chainHash = SHA-256(previousChainHash + contentHash + timestamp)`. The integrity page recomputes the chain and flags the first altered item.
- **QR verification:** the PDF's QR code encodes the case ID and chain head. Where a server runtime is available the head is signed (Ed25519) and the verify page shows the issue date; otherwise it is labelled an unsigned integrity fingerprint. The verify page can also re-hash uploaded files and compare them to the head.
- **AI use:** when AI analysis is on, only the text the user chooses to analyse is sent to the Gemini API. The no-AI mode sends nothing.

## Known limitations

- The risk detector is AI-assisted and was not evaluated on real-world data, so no accuracy claim is made. It is a prototype.
- The QR check shows files are unchanged since export. It does not prove the original screenshots were genuine, and the timestamp is not a legally recognised timestamp authority.
- The PDF is an assistive draft for legal review, not legal advice. The NCRP guide mirrors the portal's steps and is not an official integration; check it against the live form.
- A forgotten PIN cannot be recovered, by design.
- If the wrong PIN is guessed offline, protection relies on PIN strength; a 4-digit PIN is weak against brute force.

## Roadmap

A trained classifier with held-out evaluation metrics; privacy-preserving scammer matching using hashed identifiers; trusted timestamping; NCRP integration; pilots with women's helplines and campus cells.

## Hackathon compliance

- All development happened inside the recHERsion 2026 development window (24 Oct 2026, 3:00 PM IST to 25 Oct 2026, 9:00 PM IST). No commits were pushed after the deadline.
- Third-party libraries and services are listed above and used under their respective licences. AI coding tools were used to help build the project; the team can explain every part of the implementation.

## Acknowledgements

React, Vite, Tailwind CSS, lucide-react, react-router, idb, recharts, jsPDF, qrcode, tesseract.js, Google Gemini API, Google Fonts, and the Web Crypto and Web Speech browser APIs. Statistics are from Rajya Sabha data as reported in the press and a PRS Legislative Research summary of the parliamentary standing committee report on cybercrime against women.


