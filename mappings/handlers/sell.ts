import { ethereum, Address, BigInt, log } from '@graphprotocol/graph-ts';

import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadActiveSwap,
    safeLoadUser,
    safeLoadOfferHelper,
    safeNewSwapHelper,
    safeSetNuggActiveSwap,
    safeSetUserActiveSwap,
    safeNewOfferHelper,
} from '../safeload';
import { wethToUsdc } from '../uniswap';
import { bigi, mask, panicFatal } from '../utils';

export function _sell(event: ethereum.Event, agency: BigInt, tokenId: i32): void {
    const proto = safeLoadProtocol();
    log.info('handleEvent__Sell start', []);

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    const nugg = safeLoadNugg(bigi(tokenId));

    if (nugg.activeSwap !== null) {
        const swap = safeLoadActiveSwap(nugg);
        if (swap.endingEpoch !== null) {
            panicFatal('handleEvent__Sell: nugg.activeSwap MUST BE NULL if seller is not owner');
        }
        swap.bottom = agency__eth;
        swap.bottomUsd = wethToUsdc(agency__eth);
        swap.top = agency__eth;
        swap.topUsd = wethToUsdc(agency__eth);
        swap.updatedAt = event.block.number;
        swap.save(); // OK

        const user = safeLoadUser(Address.fromString(swap.owner));

        const offer = safeLoadOfferHelper(swap, user);

        offer.eth = agency__eth;
        offer.ethUsd = wethToUsdc(agency__eth);
        offer.txhash = event.transaction.hash.toHexString();
        offer.incrementX64 = BigInt.fromString('0');
        offer.epoch = proto.epoch;
        offer.updatedAt = event.block.number;

        offer.save(); // OK
        log.info('handleEvent__Sell end', []);

        return;
    }

    const user = safeLoadUser(Address.fromString(nugg.user));

    const swap = safeNewSwapHelper(nugg, event.block);

    swap.top = agency__eth;
    swap.topUsd = wethToUsdc(agency__eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.nextDelegateType = 'Commit';
    swap.bottom = agency__eth;
    swap.bottomUsd = wethToUsdc(agency__eth);
    swap.eth = bigi(0);
    swap.numOffers = 0;

    swap.ethUsd = bigi(0);
    swap.updatedAt = event.block.number;
    swap.save(); // OK

    safeSetNuggActiveSwap(nugg, swap, event.block);

    safeSetUserActiveSwap(user, nugg, swap, event.block);

    const offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = agency__eth;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.user = user.id;
    offer.claimer = user.id;
    offer.swap = swap.id;
    offer.incrementX64 = BigInt.fromString('0');
    offer.epoch = proto.epoch;

    offer.txhash = event.transaction.hash.toHexString();
    offer.updatedAt = event.block.number;
    offer.save(); // OK

    // updatedStakedSharesAndEth();

    log.info('handleEvent__Sell end', []);
}
