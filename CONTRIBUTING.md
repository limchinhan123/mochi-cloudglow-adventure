# Contributing to Mochi Cloudglow Adventure

Thank you for helping make Mochi's world more playful, beautiful and educational. This repository is the canonical version maintained by `@limchinhan123`; outside contributions arrive through pull requests rather than direct access to the repository.

## Required workflow

Please use **Fork → branch in your fork → pull request**:

1. Fork `limchinhan123/mochi-cloudglow-adventure` to your own GitHub account.
2. Create a descriptively named branch in your fork, such as `feature/new-learning-realm` or `fix/mobile-controls`.
3. Make and test your changes on that branch. Do not work directly on either repository's `main` branch.
4. Push the branch to your fork.
5. Open a pull request from your fork's branch into this repository's `main` branch.

Direct write access is not needed for casual contributions. Opening a pull request proposes a change; the repository owner decides whether and when it becomes part of the canonical game.

## Preserve the child-learning experience

Every contribution should protect the principles that make the game suitable for an early learner:

- Keep controls large, forgiving and playable with a keyboard or touch screen.
- Avoid timers, game-over states, harsh failure sounds, penalties and frightening obstacles.
- Let children retry without embarrassment or lost progress.
- Keep spoken feedback short and optional; do not replace exploration with mechanical narration.
- Preserve randomized targets, distractors and answer positions so learning does not become memorization.
- Maintain readable camera framing, natural follow-the-leader movement and distinctive world silhouettes.
- Follow the full acceptance contract in [VISUAL_ACCEPTANCE.md](VISUAL_ACCEPTANCE.md).

## Privacy and security

Never include:

- API keys, access tokens, passwords, private keys or populated `.env` files
- child photos, family media, names beyond the fictional/game context, or other personal identifiers
- Vercel project metadata, local browser data or account information
- third-party code, music, fonts or artwork without permission to contribute them

Use synthetic or in-game imagery for screenshots. Crop out browser chrome, account avatars, bookmarks and desktop notifications.

## Validate before opening a pull request

Run:

```bash
npm ci
npm run build
npm audit --omit=dev
```

For gameplay changes, test both desktop and mobile-landscape controls. Visual changes should include a screenshot or short recording in the pull request so the owner can compare the result against the quality contract.

## Pull-request expectations

Explain:

- what changed and why
- how it improves play or learning
- what you tested
- any visual, performance, accessibility or curriculum trade-offs

Keep each pull request focused. Repository ownership and final product decisions remain with `@limchinhan123`, even when a contribution is accepted.
