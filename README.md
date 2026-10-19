# MuleNet

MuleNet is a shared registry of mule accounts for banks, built on Midnight. Banks flag fraud mule accounts together without sharing customer records, and a report never reveals which bank filed it. An account is flagged only after *k* independent licensed banks report it.

Built for the Midnight Buildathon with Compact `0.31.1` (ledger 8, so it deploys to Preview, Preprod and Mainnet) and midnight-js `4.1.1`.

## The problem

Payment fraud cashes out through mule accounts: bank accounts that are rented, bought or hijacked to receive stolen money and pass it on. UPI scams in India and authorised-push-payment scams in the UK both work this way. A fraud ring spreads its mules across many banks, so each bank sees only part of the ring.

Banks could stop this by pooling what they know, but three things get in the way:

- Data-protection law (India's DPDP Act, GDPR) and banking secrecy stop a bank from publishing the account numbers it suspects.
- A bank won't announce that it reported an account at a competitor, and a false report exposes an innocent customer.
- A central database is a target for attackers, and someone has to be trusted to run it.

## How it works

| Action | What happens |
|---|---|
| Report | A licensed bank reports an account with a zero-knowledge proof that it is in the licensed-bank Merkle tree. The proof does not reveal which bank it is. |
| Threshold | The account is flagged once `k` different banks have reported it. A nullifier per bank and account stops any bank from counting twice. |
| Check | Before a payment goes out, a member bank looks up the payee against public state on its own machine. The check is free, instant, and creates no transaction. |
| Retract | A bank can withdraw its own report after a false positive, and nobody learns which report was withdrawn. |
| Appeal | The regulator delists a wrongly flagged account, for example a hijacked one. A new round starts, so old reports can't be replayed. |
| Revoke | The regulator removes a bank's licence. Old Merkle roots are forgotten, so that bank can no longer prove membership. |
| Evidence | Each report commits to a salted hash of its evidence. Only the reporting bank holds the opening, and it can show it to a regulator later. |

## What is public and what stays private

| Data | Where it lives | Why |
|---|---|---|
| Account number (IFSC + account, IBAN…) | Private: a circuit argument that is never disclosed | It is customer data. |
| Consortium key | Private: every member's private state. Only `H(key)` is public | It turns an account into a tag. Without it, an outsider can't link a tag to an account or test a guess. |
| Account tag `H("mulenet:account", key, account)` | Public (`reportCount`, `flagged`) | Members can find the same account across banks without revealing it. |
| Which bank reported | Private: the bank secret and Merkle path are witnesses | It is an anonymous membership proof against `banks`, a `HistoricMerkleTree<10>`. |
| Report nullifier `H("mulenet:nullifier", bankSecret, tag, round)` | Public (`nullifiers`) | It stops double counting. It can't be linked across accounts or rounds and does not identify the bank. |
| Evidence | Private: stays at the bank | Only `persistentCommit([tag, evidenceHash], salt)` is public. |
| Evidence opening (tag, hash, salt) | Private: the reporting bank's `evidenceLog` | The bank can open it to a regulator later. |
| Who checked which payee | Nowhere | Checks read public state locally and send no transaction. |
| Regulator key | Private secret, with `H(secret)` public | It authorises register, revoke and delist. |
| Report counts, flags, rounds, totals | Public | These are the shared signal. |

The test suite checks these claims (see [Tests](#tests)). It scans the public transcript of every transaction and the whole ledger, and confirms that raw account numbers, bank secrets, bank leaves, the consortium key and evidence never appear. A positive-control test confirms that the scanner does find values that are meant to be disclosed.

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

- `contract/src/mulenet.compact` is the contract: 5 proving circuits and 6 exported pure derivations.
- `contract/src/witnesses.ts` holds the private state (bank secret, consortium key, regulator secret, evidence log) and the witnesses, including the Merkle path lookup.
- `cli/` is the midnight-js integration. `story` runs the full scenario end to end with real proofs, and `serve` is the HTTP API behind the console.
- `ui/` is the React console: a UPI-style payee check, the bank desk, regulator appeals, and a public-versus-private ledger view with a proof log.
- `video/` is the demo film, built in code with Remotion.

### Circuits

| Circuit | Caller | Proves and enforces |
|---|---|---|
| `reportMule(accountId, evidenceHash)` | any licensed bank | The caller holds the consortium key, is in the licensed-bank tree (without saying which leaf), and hasn't reported this account in this round. The account is flagged at `k` reports. |
| `retractReport(accountId)` | the bank that reported | The caller knows the secret behind one of the nullifiers. The count drops, and the flag clears below `k`. |
| `registerBank(leaf)` | regulator | Adds a bank leaf to the Merkle tree. |
| `revokeBank(index)` | regulator | Clears the leaf and resets the root history, so old paths stop verifying. |
| `delist(tag)` | regulator | Resets the count, removes the flag and starts a new round. |

## Quick start

You need Node 24 or later, Docker running, and the Compact toolchain pinned to the version the public networks run:

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

Each run writes a receipt to `deployments/<network>.json` with the contract address, every transaction hash and block, every rejected attack, and the final public state. Secrets go to `.secrets/<network>.json`, which git ignores.

## The demo story

`npm run story:<network>` runs this scenario, and every step is a real proven transaction:

1. The regulator deploys the registry with `k = 3` and licenses SBI, HDFC, ICICI, Axis and Kotak.
2. HDFC and ICICI report mule account A after victim complaints.
3. ICICI tries to report A again. The nullifier rejects it.
4. "ShadowPay", an unlicensed fintech that has the consortium key, tries to report A. It has no membership, so the contract rejects it.
5. Axis reports A, and A is flagged.
6. Kotak checks payees before a UPI payment. A is blocked and a shopkeeper is clear, and neither check creates a transaction.
7. Kotak reports B, then retracts the report because B turns out to be a merchant with festival sales.
8. Three banks flag a hijacked account. The customer appeals, and the regulator delists it.
9. The regulator revokes Kotak's licence. Kotak tries to report again and is rejected.

## Tests

```bash
npm test
npm run mutation
```

The 109 tests run the compiled contract through the Compact runtime simulator, in multi-party scenarios with one shared ledger and separate private state for each actor. They cover deployment, the derivations and their domain separation, registry access control, reporting and the threshold, retraction, appeals and rounds, revocation, ledger privacy, transcript privacy with a positive control, and an end-to-end scenario. Eleven of them are attack tests: a double report, an unlicensed bank, a wrong consortium key, a stolen membership path, a forged path, a replay after revocation, and others.

`scripts/mutation-test.sh` removes or weakens each of the 12 security guards in the contract, recompiles, and requires the suite to fail. All 12 mutants are caught.

## Threat model and limitations

- The wallet that pays a transaction fee is visible on chain. In production, reports should go through a shared relayer or fee sponsor so the payer can't be tied to a bank. This is on the roadmap.
- Any bank that holds the consortium key can check any account, which is the point of the product. Rotating the key by epoch limits the damage if it leaks. Also on the roadmap.
- `k` colluding banks can flag an account. The remedies are the appeal and delist flow, evidence commitments that can be opened to the regulator, and licence revocation. `k` should be set for each market.
- Account identifiers are normalised to 32 bytes before tagging. Longer schemes would need to be hashed first.
- The regulator is trusted for licensing and appeals. A multi-sig or committee regulator would remove that trust.

## Roadmap

- A pilot with a co-operative bank or payment aggregator, using real complaint flows (in India, NCRP and the 1930 helpline).
- A fee relayer, so reporter wallets can't be linked to banks.
- Consortium key rotation by epoch.
- Severity tiers (watch, hold, block) and expiry for stale reports.
- A Lace-connected browser console for smaller banks, and a Mainnet deployment.

## License and attribution

Apache-2.0. The wallet and network plumbing in `cli/` is adapted from [midnightntwrk/example-bboard](https://github.com/midnightntwrk/example-bboard) (Apache-2.0). The demo film uses the motion launch video template (Remotion).
