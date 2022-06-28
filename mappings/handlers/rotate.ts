import { log, BigInt, ethereum, Bytes } from '@graphprotocol/graph-ts';

import { updateProof, cacheDotnugg } from '../onchain';
import { safeLoadNugg } from '../safeload';
import { b32toBigEndian } from '../utils';

export function _rotate(
    tokenId: BigInt,
    block: ethereum.Block,
    proof: Bytes,
    increment: boolean,
): void {
    log.info('handleEvent__Rotate start', []);

    let nugg = safeLoadNugg(tokenId);

    nugg = updateProof(nugg, b32toBigEndian(proof), increment, block);

    cacheDotnugg(nugg, block.number);

    log.info('handleEvent__Rotate end', []);
}
