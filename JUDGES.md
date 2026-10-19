# MuleNet for judges

You can evaluate MuleNet in about 5 minutes.

## 1. Check that the contract compiles (technical gate)

```bash
compact update 0.31.1          # the version Preview, Preprod and Mainnet run (ledger 8)
npm install
npm run compact                # → "Compiling 5 circuits"
```

The contract is [`contract/src/mulenet.compact`](contract/src/mulenet.compact) and the witnesses are in [`contract/src/witnesses.ts`](contract/src/witnesses.ts).

## 2. Run the tests (about 5 seconds)

```bash
npm test                       # 109 tests through the Compact simulator
npm run mutation               # optional, ~4 min: 12/12 mutants killed
```

Tests worth reading first, all in [`contract/src/test/mulenet.test.ts`](contract/src/test/mulenet.test.ts):

- `attacks on reporting`: double report, unlicensed bank, wrong key, stolen and forged Merkle paths.
- `privacy of transaction transcripts`: scans the public transcript of each transaction for account numbers, bank secrets and bank identities, with a positive control.
- `bank revocation › a revoked bank cannot replay a path from before its revocation`.

## 3. See it run with real proofs

```bash
npm run story:standalone       # local Docker network; deploys and runs 16 transactions + 3 rejected attacks
```

This writes `deployments/standalone.json` with every tx hash and block height. If a Preprod run is committed, [`deployments/preprod.json`](deployments/) holds the public Preprod receipt.

## 4. Use the console

```bash
npm run ui:build && npm run serve:standalone   # → http://localhost:8787
```

- **Payee check:** pick "Mule A" and the payment is blocked. Pick "Shopkeeper" and it's clear. Neither check creates a transaction.
- **Bank desk:** report "Mule B" as two different banks, then try the same bank twice (rejected).
- **Appeals:** delist an account as the regulator.
- **Public ledger:** what the chain stores, next to what never leaves a bank.

## Where privacy is used, and why

See the table in the [README](README.md#what-is-public-and-what-stays-private). In short, the account number, the reporting bank's identity, the evidence and the consortium key are all private. Only keyed tags, counts and unlinkable nullifiers are public, and payee checks leave no on-chain trace.

## Midnight features used

- **Private state** in `witnesses.ts`: bank secret, consortium key, regulator secret, and a local evidence log updated by a witness.
- **Anonymous membership:** `HistoricMerkleTree<10>` + `merkleTreePathRoot`, with `resetHistory` for revocation.
- **Nullifiers** in a `Set`, scoped per account per round.
- **Commitments:** `persistentCommit` over the evidence, with the opening kept privately.
- **Selective disclosure:** `disclose()` only on tags, nullifiers, the root check and commitments.
- **Pure circuits** exported for off-chain derivation, so the UI and API compute the same tags.
