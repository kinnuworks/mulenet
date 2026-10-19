# MuleNet: AKINDO submission text

Paste each block into the matching field on the AKINDO submission page.

## Project name

MuleNet

## Tagline

Banks flag mule accounts together, without sharing a customer record or revealing who reported.

## Links

- GitHub: https://github.com/kinnuworks/mulenet (tagged `midnightntwrk`, Apache-2.0)
- Demo video: [YouTube link after upload]
- Slide deck: [PDF exported from the deck]

## Description

Scam money in UPI and bank-transfer fraud leaves through mule accounts: accounts rented, bought or hijacked to receive stolen funds and pass them on. A ring spreads its mules across many banks, so no single bank sees the whole picture. Banks could fix this by pooling what they know, but data-protection law and banking secrecy stop them from sharing account numbers, and no bank wants to be known as the one that accused a competitor's customer.

MuleNet lets them pool it on Midnight. A licensed bank reports a suspected mule with a zero-knowledge proof that it belongs to the licensed-bank Merkle tree, without saying which bank it is. The account number never goes on chain. Only a tag keyed with a consortium secret does, so outsiders can't link it to an account. The account is flagged once three independent banks have reported it, and a per-bank nullifier stops any one bank from counting twice. Before releasing a payment, any member bank checks the payee by reading public state locally, which costs nothing and leaves no transaction behind.

Banks can retract their own false positives without revealing which report was theirs. A wrongly flagged customer can appeal to the regulator, who delists the account and starts a fresh round. The regulator can also revoke a bank's licence, after which its old membership proofs stop working. Each report carries a salted commitment to its evidence, which the reporting bank can open for the regulator later.

## What we built this wave

All of MuleNet was built during Wave 2:

- A Compact contract (compiler 0.31.1, ledger 8) with 5 circuits: `reportMule`, `retractReport`, `registerBank`, `revokeBank`, `delist`. Private state in `witnesses.ts` holds the bank secret, the consortium key, the regulator secret and a local evidence log.
- 109 simulator tests, including 11 attack tests and checks that scan each transaction's public transcript for account numbers, bank secrets and bank identities. Mutation testing removes each of the 12 security guards in turn, and the suite catches all 12.
- A midnight-js integration that runs the full story with real proofs: 16 transactions and 3 rejected attacks on a local Midnight network, recorded in `deployments/standalone.json`.
- A React console with a UPI-style payee check, a bank desk, regulator appeals, and a view of exactly what the chain stores next to what stays private.
- README, JUDGES.md (a five-minute evaluation path), a pitch deck and a demo film.

## Next wave

A fee relayer so reporter wallets can't be linked to banks, consortium key rotation, severity tiers and report expiry, a Preprod and Mainnet deployment, and a pilot conversation with a co-operative bank or payment aggregator.
