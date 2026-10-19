# MuleNet: directed brief

GOAL      A Midnight Buildathon judge finishes this film convinced that MuleNet is a real, working
          privacy product with a clear buyer, and opens the repo.

PRODUCT   MuleNet: banks flag fraud mule accounts together on Midnight, without sharing customer
          data or revealing who reported. CTA: github.com/kinnuworks/mulenet

FACTS     True today (source: repo, deployments/standalone.json, test output):
          - Anonymous report: Merkle membership proof, per-account nullifier (contract).
          - k-of-n flagging, k = 3 in the demo (contract + story).
          - Double report rejected; unlicensed bank rejected; revoked bank rejected (receipt).
          - Payee check is a local read, with no transaction (api.check).
          - Retract, appeal/delist with fresh rounds, revoke (contract).
          - 16 proven transactions, 3 rejected attacks (receipt, local network).
          - 109 tests, 12/12 mutants killed (npm test, npm run mutation).
          Illustrative: the Rs 48,000 scam, account numbers, bank names in the story. Marked "Demo data".

FORMAT    long · 16x9 (+9x16 check) · target ~120 s
TIME      30 fps · 120 BPM (beat = 15 frames, bar = 2 s)
LOOK      neon: bg #07080A, ink #F3F1EC, muted #9CA0AA, accent amber #F7A028, alert red #FF5A47,
          ok green #3DDC97. Panels: the console's light UI (#FFFFFF/#F5F5F7) as the bright hero on dark.
          Fonts: Inter (display/text), Geist Mono (eyebrows, hashes, counters), Instrument Serif (one word).
          Emphasis: accent colour.
MOTION    Defaults. Springs 0.8 on UI, no overshoot on text. One continuous world per chapter,
          camera never parks (2–4% push on holds). Transitions travel one way (left → right = money's path).

SHOTS     See SCRIPT below; each line is one scene sized to its recorded length plus a breath.
BANNED    purple/blue AI gradients, glow orbs, lens flares, particles, spinning logo, everything fading
          in at once, centred-everything layouts, fake numbers or testimonials.
QA        Stills at every cut, 2+ fix rounds, 9:16 stills, draft, final at 1440p, frames pulled at every boundary.

## Voice script (one file per line)

| id | line |
|---|---|
| v01 | Forty-eight thousand rupees. Sent in one tap. |
| v02 | Within minutes, it's split across a dozen mule accounts, at five different banks. |
| v03 | Each bank sees one piece. Nobody sees the ring. |
| v04 | Banks can't share customer data. And no bank wants to accuse another bank's customer. |
| v05 | This is MuleNet. |
| v06 | Banks flag mule accounts together, on Midnight, without sharing a single customer record. |
| v07 | When a bank spots a mule, it files a report, with a zero-knowledge proof. |
| v08 | The proof says: a licensed bank reported this account. It never says which bank. And it never reveals the account. |
| v09 | One report isn't enough. An account is flagged only when three independent banks agree. |
| v10 | Report twice? The contract rejects it. Not a licensed bank? Rejected too. |
| v11 | Now, before money leaves, the bank checks the payee. |
| v12 | Flagged. Payment blocked. And the check never touches the chain. No transaction. No trace. |
| v13 | Wrongly flagged? The regulator upholds the appeal, and a clean round begins. |
| v14 | This is everything the chain ever sees. Tags. Counts. Nullifiers. Nothing a bank could leak. |
| v15 | Every action is a real zero-knowledge transaction. Sixteen in our demo run. Three attacks, rejected. |
| v16 | One hundred and nine tests. Every security check, mutation tested. Twelve out of twelve caught. |
| v17 | MuleNet. Stop paying mule accounts. Together. |
