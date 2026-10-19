# MuleNet

**A cross-bank mule-account registry on Midnight.** Banks flag fraud "mule" accounts together, without sharing a single customer record and without revealing which bank filed a report. An account is flagged only when *k* independent licensed banks agree.

Built for the Midnight Buildathon. Compact `0.31.1` (ledger 8, deployable on Preview, Preprod and Mainnet), midnight-js `4.1.1`.

---

## The problem

Payment fraud (UPI scams in India, authorised-push-payment scams in the UK, and so on) cashes out through **mule accounts**: bank accounts rented, bought or hijacked to receive and move stolen money. A ring spreads its mules across many banks, so each bank sees only a fragment.

The fix is obvious: let banks pool what they know. But they can't:

- **Customer data can't be shared.** Data-protection law (India's DPDP Act, GDPR) and banking secrecy stop a bank from publishing account numbers it suspects.
- **Reporting is sensitive.** A bank won't announce that it reported an account at a competitor. A false report also exposes an innocent customer.
- **A central database is a honeypot**, and someone has to be trusted to run it.

## What MuleNet does

| | |
|---|---|
| **Report** | A licensed bank reports an account with a zero-knowledge proof that it is in the licensed-bank Merkle tree. The proof doesn't reveal *which* bank. |
| **Threshold** | An account is flagged only after `k` **independent** banks report it. A per-bank, per-account nullifier stops any bank counting twice. |
| **Check** | Before releasing a payment, any member bank looks the payee up **off-chain** against public state. The check is free and instant, and it **creates no transaction**. |
| **Retract** | A bank can withdraw its own report (a false positive) without revealing which of the reports was its. |
| **Appeal** | The regulator delists a wrongly flagged (for example hijacked) account. A new *round* begins, so old reports can't be replayed. |
| **Revoke** | The regulator removes a bank's licence. Old Merkle roots are forgotten, so the bank can no longer prove membership. |
| **Evidence** | Each report commits to a salted hash of its evidence. Only the reporting bank holds the opening and can show it to a regulator. |

## What is public and what stays private

This is the core design question, so here is the full answer.

| Data | Where it lives | Why |
|---|---|---|
| Account number (IFSC + account, IBAN…) | **Private**: circuit argument, never disclosed | It's customer data. |
| Consortium key | **Private**: every member's private state. Only `H(key)` is public | It's what turns an account into a tag. Outsiders without it can't link a tag to an account, or test a guess. |
| Account tag `H("mulenet:account", key, account)` | Public (`reportCount`, `flagged`) | Lets members find the same account across banks without revealing it. |
| Which bank reported | **Private**: bank secret plus Merkle path, both witnesses | Anonymous membership proof against `banks` (a `HistoricMerkleTree<10>`). |
| Report nullifier `H("mulenet:nullifier", bankSecret, tag, round)` | Public (`nullifiers`) | Stops double counting. It is unlinkable across accounts and rounds, and it isn't a bank identity. |
| Evidence | **Private**: stays at the bank | Only `persistentCommit([tag, evidenceHash], salt)` is public. |
| Evidence opening (tag, hash, salt) | **Private**: the reporting bank's `evidenceLog` | It can be opened later to a regulator. |
| Who checked which payee | **Nowhere** | Checks are local reads of public state, not transactions. |
| Regulator key | Private secret; `H(secret)` public | Authorises register, revoke and delist. |
| Report counts, flags, rounds, totals | Public | They're the shared signal itself. |

The test suite checks these claims (see [Tests](#tests)). It scans every transaction's **public transcript** and the whole ledger, and confirms that raw account numbers, bank secrets, bank leaves, the consortium key and evidence never appear. A positive-control test confirms the scanner *does* see disclosed values.

## Architecture

```
            Bank A ─┐                         ┌─ Bank B checks a payee
  reportMule(acct)  │   Merkle proof: "a      │   (local read: tag ∈ flagged?)
  + nullifier       ├─► licensed bank", no ───┤   no transaction, no trace
  + evidence commit │   which one             │
            Bank C ─┘          │              │
                               ▼              │
                 ┌──────────── Midnight ──────┴────────────┐
                 │ banks (Merkle root) · nullifiers        │
                 │ reportCount[tag] · flagged{tag}         │
                 │ reportRound[tag] · evidenceCommitments  │
                 └──────────────▲──────────────────────────┘
                                │ registerBank / revokeBank / delist
                           Regulator (key-holder)
```

- `contract/src/mulenet.compact`: the contract. It has 5 proving circuits and 6 exported pure derivations.
- `contract/src/witnesses.ts`: private state (bank secret, consortium key, regulator secret, evidence log) and the witnesses, including the Merkle path lookup.
- `cli/`: the midnight-js integration. It contains the `story` (scripted end-to-end run with real proofs) and `serve` (the HTTP API behind the console).
- `ui/`: the React console, with four parts: payee check (UPI pay screen), bank desk, regulator appeals, and public-vs-private ledger view with a proof log.

### Circuits

| Circuit | Caller | Proves / enforces |
|---|---|---|
| `reportMule(accountId, evidenceHash)` | any licensed bank | Holds the consortium key; is in the licensed-bank tree (anonymously); hasn't reported this account in this round. Flags the account at `k` reports. |
| `retractReport(accountId)` | the bank that reported | Knows the secret behind one of the nullifiers. Decrements the count and unflags the account below `k`. |
| `registerBank(leaf)` | regulator | Adds a bank leaf to the Merkle tree. |
| `revokeBank(index)` | regulator | Clears the leaf and resets root history, so old paths stop verifying. |
| `delist(tag)` | regulator | Resets the count, removes the flag and starts a new round. |

## Quick start

Requirements: Node ≥ 24, Docker running, and the Compact toolchain pinned to the version that public networks run:

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update 0.31.1
```

Then:

```bash
npm install
npm run compact          # compile the contract (5 circuits, ZK keys)
npm test                 # 109 simulator tests
npm run mutation         # 12/12 mutants killed
npm run story:standalone # full scenario with real proofs on a local Docker network
```

To run the console against a local network:

```bash
npm run ui:build
npm run serve:standalone   # starts the network, replays the story, serves http://localhost:8787
```

### Preprod

```bash
export BLOCKFROST_PROJECT_ID=...   # free key from blockfrost.io (Midnight Preprod)
export MULENET_WALLET_SEED=...     # optional; otherwise a seed is generated and printed
npm run story:preprod              # fund the printed address from the Preprod faucet when asked
npm run serve:preprod
```

The run writes a receipt to `deployments/<network>.json`: contract address, every transaction hash and block, every rejected attack, and the final public state. Secrets go to `.secrets/<network>.json`, which is git-ignored.

## The demo story

`npm run story:<network>` runs this scenario. Every step is a real proven transaction:

1. The regulator deploys the registry (`k = 3`) and licenses SBI, HDFC, ICICI, Axis and Kotak.
2. HDFC and ICICI report mule account A from victim complaints.
3. **Attack:** ICICI reports A again → *rejected* (nullifier).
4. **Attack:** unlicensed "ShadowPay", which has the consortium key, reports A → *rejected* (no membership).
5. Axis reports A, and A is **flagged**.
6. Kotak checks payees before a UPI payment. A is blocked and a shopkeeper is clear, with no transaction created.
7. Kotak reports B, then retracts it (a false positive at a festival-sale merchant).
8. Three banks flag a hijacked account. The customer appeals and the regulator **delists** it.
9. The regulator **revokes** Kotak. **Attack:** Kotak reports again → *rejected*.

## Tests

```bash
npm test
npm run mutation
```

- **109 tests** run the compiled contract through the Compact runtime simulator, in multi-party scenarios with one shared ledger and separate private state per actor.
  - deployment, derivations and domain separation
  - registry access control
  - reporting and threshold behaviour
  - **11 attack tests**: double report, unlicensed bank, wrong consortium key, stolen membership path, forged path, replay after revocation, and more
  - retraction, appeals and rounds, revocation
  - ledger privacy, plus **transcript privacy** with a positive control
  - an end-to-end scenario
- **Mutation testing:** `scripts/mutation-test.sh` removes or weakens each of 12 security guards in the contract, recompiles, and requires the suite to fail. **12/12 killed.**

## Threat model and limitations

These are stated honestly so a reviewer doesn't have to find them:

- **Fee payer linkability.** The wallet paying a transaction's fee is visible. In production, each report should go through a shared relayer or fee sponsor so the payer can't be tied to a bank. *(Roadmap.)*
- **Members can test accounts.** Any bank holding the consortium key can check any account. That's the product. Key rotation and per-epoch keys limit the damage if a key leaks. *(Roadmap.)*
- **Collusion.** `k` colluding banks can flag an account. The appeal and delist flow, the evidence commitments (openable to the regulator) and licence revocation are the remedies. Choose `k` per market.
- **Account identifiers** are normalised to 32 bytes before tagging. Longer schemes would be hashed first.
- **Trusted regulator** for licensing and appeals. A multi-sig or committee regulator is a natural extension.

## Roadmap

- A pilot with a co-operative bank or payment aggregator, using real complaint flows (India: NCRP / 1930).
- A fee relayer, so reporter wallets are unlinkable.
- Consortium key rotation by epoch.
- Severity tiers (watch / hold / block) and expiry of stale reports.
- A Lace-connected browser console for smaller banks; Mainnet deployment.

## License and attribution

Apache-2.0. The wallet and network plumbing in `cli/` is adapted from [midnightntwrk/example-bboard](https://github.com/midnightntwrk/example-bboard) (Apache-2.0). The UI uses the indie-app design tokens.
