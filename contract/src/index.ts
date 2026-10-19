// SPDX-License-Identifier: Apache-2.0

import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export * from './managed/mulenet/contract/index.js';
export * from './witnesses.js';

import * as CompiledMuleNet from './managed/mulenet/contract/index.js';
import * as Witnesses from './witnesses.js';

export const CompiledMuleNetContract = CompiledContract.make<
  CompiledMuleNet.Contract<Witnesses.MuleNetPrivateState>
>('MuleNet', CompiledMuleNet.Contract<Witnesses.MuleNetPrivateState>).pipe(
  CompiledContract.withWitnesses(Witnesses.witnesses),
  CompiledContract.withCompiledFileAssets('./managed/mulenet'),
);
