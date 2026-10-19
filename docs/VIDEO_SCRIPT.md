# MuleNet: demo video script (about 3 minutes, with voice-over)

Record your screen with OBS or Loom, and **speak throughout**. The Wave 1 judge marked down a demo that had no audio. Use one take per scene and cut them together.

| Time | Screen | Voice-over |
|---|---|---|
| 0:00–0:20 | Title slide | "Every day, scam money moves through mule accounts, and each bank only sees a piece of the ring. Banks can't pool what they know without breaking data-protection law. MuleNet fixes that on Midnight." |
| 0:20–0:45 | README privacy table | "Here's the whole design in one table. Account numbers, the reporting bank's identity and the evidence stay private. On chain there are only keyed tags, counts and nullifiers that can't be linked to anything." |
| 0:45–1:20 | Console → Bank desk: report Mule B as HDFC, then ICICI | "HDFC reports an account. The proof says 'a licensed bank reported this', but not which bank. Now ICICI reports the same account. Two of three." |
| 1:20–1:35 | Report again as ICICI → rejected | "If ICICI tries to report twice, the nullifier stops it. One bank can't flag an account on its own." |
| 1:35–1:55 | Report as Axis → status Flagged | "A third, independent bank. Now it's flagged." |
| 1:55–2:15 | Phone payee check: Mule B → blocked; Shopkeeper → clear | "Before releasing a UPI payment, any member bank checks the payee. This is a local read, so there's no transaction and no trace of who checked whom." |
| 2:15–2:30 | Appeals: delist hijacked account | "If an account was hijacked, the regulator upholds the appeal. A new round starts, so old reports can't be replayed." |
| 2:30–2:45 | Public ledger window, then Proofs table with Preprod tx hashes | "This is everything the chain sees. And every action here is a real zero-knowledge transaction on Preprod." |
| 2:45–3:00 | Terminal: `npm test` (109 passed) and `npm run mutation` (12/12) | "109 tests, including privacy checks on each transaction transcript, and every security guard is mutation-tested. Next: a pilot with [partner] and a relayer so reporter wallets are unlinkable." |
