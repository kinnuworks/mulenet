# MuleNet: pitch deck (10 slides)

Build this in Google Slides, one idea per slide, with large type. Fill in the bracketed items with real facts and sources before presenting. Don't present a number you can't cite.

---

**1. Title**
MuleNet. Banks stop mule accounts together, without sharing a customer record.
*Built on Midnight · [team names]*

**2. The problem**
Scam money cashes out through mule accounts spread across many banks. Each bank sees only a fragment.
- [cite: national fraud-loss figure, e.g. I4C / RBI annual report, or UK Finance]
- [cite: share of fraud flowing through mule accounts]

**3. Why banks can't just share**
- Data-protection law (DPDP Act / GDPR) and banking secrecy.
- No bank wants to announce that it reported a competitor's customer.
- A central blacklist is a honeypot and a single point of trust.

**4. MuleNet in one line**
A bank proves *"a licensed bank reported this account"* without revealing **which bank** or **which account**. When *k* banks agree, the account is flagged.

**5. How it works** (diagram from the README)
Report (anonymous Merkle proof + nullifier) → threshold *k* → flagged → every bank checks payees locally, with no transaction.

**6. Why Midnight**
Public / private table (from the README). Selective disclosure is the product, not a feature:
- Private: account numbers, bank identity, evidence, consortium key.
- Public: keyed tags, counts, unlinkable nullifiers.

**7. Demo**
Screenshot or live: UPI pay screen → "Payment blocked: reported by 3 independent banks", plus the Proofs table with real tx hashes on Preprod.

**8. Engineering**
- 5 circuits, Compact 0.31.1, deployed on Preprod at `[contract address]`.
- 109 simulator tests, including transcript-privacy and attack tests. 12/12 mutants killed.
- Retraction, appeals with rounds, licence revocation.

**9. Go-to-market**
- Beachhead: [co-operative banks / payment aggregators in X], which are hit hardest and move fastest.
- Buyer: the bank's fraud-risk head. Value: fewer reimbursements and complaints.
- Path: pilot with [named partner / LOI] → consortium of 5 → regulator sandbox.
- [Only include a partner you actually have a conversation or LOI with.]

**10. Roadmap and ask**
Wave 3: fee relayer (unlinkable reporters), key rotation, severity tiers, mainnet.
Ask: introductions to bank fraud-risk teams; Midnight Build Club.
