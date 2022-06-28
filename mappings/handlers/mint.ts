import { Bytes, ethereum, Address, BigInt, log } from '@graphprotocol/graph-ts';
import { safeNewNugg, _mspFromStake } from '../onchain';
import {
    safeLoadProtocol,
    safeLoadNuggNull,
    safeLoadUser,
    safeNewSwapHelper,
    safeNewOfferHelper,
} from '../safeload';
import { bigi, mask, bigs, makeIncrementX64 } from '../utils';

export function _mint(
    tokenId: i32,
    agency: BigInt,
    hash: Bytes,
    value: BigInt,
    stake: BigInt,
    block: ethereum.Block,
): void {
    log.debug('handleEvent__Mint start', []);

    const proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(bigi(tokenId));

    if (nugg === null) {
        nugg = safeNewNugg(
            bigi(tokenId),
            agency.bitAnd(mask(160)).toHexString(),
            bigs(proto.epoch),
            block,
        );
    }

    const user = safeLoadUser(Address.fromString(nugg.user));

    const swap = safeNewSwapHelper(nugg);

    nugg.numSwaps = BigInt.fromString('1');

    nugg.save();
    swap.eth = bigi(0); // handled by Mint or Offer
    swap.ethUsd = bigi(0); // handled by Mint or Offer
    swap.numOffers = 0;

    swap.top = bigi(0); // handled by Mint or Offer
    swap.topUsd = bigi(0);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.endingEpoch = BigInt.fromString(proto.epoch);
    swap.epoch = proto.epoch;
    swap.startingEpoch = proto.epoch;
    swap.nextDelegateType = 'None';

    const msp = _mspFromStake(stake);
    swap.bottom = msp;
    swap.bottomUsd = msp;
    swap.startUnix = block.timestamp;

    swap.save();

    const offer = safeNewOfferHelper(swap, user);

    offer.claimed = true;
    // offer.eth = bigi(0); // handled by Mint or Offer
    // offer.ethUsd = bigi(0);
    offer.owner = false;
    offer.epoch = proto.epoch;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.txhash = hash.toHexString();
    // offer.save();

    // let offer = safeLoadOfferHelper(swap, user);
    swap.top = value;
    swap.topUsd = value;
    offer.eth = value;
    offer.ethUsd = value;
    offer.incrementX64 = makeIncrementX64(value, msp);

    swap.save();
    offer.save();

    log.debug('handleEvent__Mint end', []);
}
