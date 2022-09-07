import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { log } from 'matchstick-as';

import { Nugg } from '../../generated/schema';
import { safeNewNugg } from '../onchain';
import { safeLoadProtocol, safeLoadNuggNull, safeLoadUser, safeLoadUserNull } from '../safeload';

export function _transfer(
    from: Address,
    to: Address,
    tokenId: BigInt,
    block: ethereum.Block,
): Nugg {
    log.info('handleEvent__Transfer start', []);

    const proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(tokenId);

    if (nugg == null) {
        nugg = safeNewNugg(tokenId, proto.nullUser, BigInt.fromString(proto.epoch), block);
    }

    const sender = safeLoadUser(from);

    const receiver = safeLoadUserNull(to, block);

    // check if we have aready preprocesed this transfer
    /// this should be equal to the !nugg.pendingClaim check
    // if (receiver.id !== nugg.user) {
    if (!nugg.pendingClaim) {
        if (sender.id != proto.nullUser) {
            sender.shares = sender.shares.minus(BigInt.fromString('1'));
        }

        if (receiver.id == proto.nullUser) {
            nugg.burned = true;
        } else {
            receiver.shares = receiver.shares.plus(BigInt.fromString('1'));
        }

        nugg.user = receiver.id;
        nugg.lastUser = sender.id;
        nugg.updatedAt = block.number;
        receiver.updatedAt = block.number;
        sender.updatedAt = block.number;

        receiver.save(); // OK
        nugg.save(); // OK
        sender.save(); // OK

        // cacheDotnugg(nugg, 0);
    } else {
        // if prepocessed, we mark nugg as
        nugg.pendingClaim = false;
    }

    nugg.lastTransfer = BigInt.fromString(proto.epoch).toI32();
    nugg.updatedAt = block.number;

    nugg.save(); // OK

    log.info('handleEvent__Transfer end', []);

    return nugg;
}
