import { ethereum, BigInt } from '@graphprotocol/graph-ts';
import { log } from 'matchstick-as';

import { LOSS } from '../constants';
import { updateProof, cacheDotnugg } from '../onchain';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadActiveNuggItemSwap,
    safeLoadItemOfferHelper,
    safeNewItemSwap,
    safeSetNuggItemActiveSwap,
    safeSetNuggActiveItemSwap,
    safeNewItemOffer,
} from '../safeload';
import { wethToUsdc } from '../uniswap';
import { mask, bigi, panicFatal } from '../utils';

export function _sellItem(
    event: ethereum.Event,
    agency: BigInt,
    sellingNuggId: i32,
    _sellingItemId: i32,
    proof: BigInt,
): void {
    const proto = safeLoadProtocol();

    log.debug('handleEvent__SellItem start', []);

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(LOSS);

    const sellingItemId = bigi(_sellingItemId);

    let sellingNugg = safeLoadNugg(bigi(sellingNuggId));

    const item = safeLoadItem(sellingItemId);

    const nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap !== null) {
        const swap = safeLoadActiveNuggItemSwap(nuggitem);
        //
        if (swap.endingEpoch !== null) {
            panicFatal(
                'handleEvent__SellItem: nuggitem.activeSwap MUST BE NULL if seller is not owner',
            );
        }
        swap.sellingNuggItem = nuggitem.id;
        swap.sellingItem = nuggitem.item;
        swap.top = agency__eth;
        swap.topUsd = agency__eth;
        swap.bottom = wethToUsdc(agency__eth);
        swap.bottomUsd = wethToUsdc(agency__eth);
        swap.updatedAt = event.block.number;
        swap.save(); // OK

        const itemoffer = safeLoadItemOfferHelper(swap, sellingNugg);

        itemoffer.eth = agency__eth;
        itemoffer.ethUsd = wethToUsdc(agency__eth);
        itemoffer.txhash = event.transaction.hash.toHexString();
        itemoffer.epoch = proto.epoch;
        itemoffer.updatedAt = event.block.number;

        itemoffer.save(); // OK

        log.debug('handleEvent__SellItem end EARLY', []);

        return;
    }

    const itemSwap = safeNewItemSwap(nuggitem, event.block);

    itemSwap.sellingNuggItem = nuggitem.id;
    itemSwap.sellingItem = nuggitem.item;
    itemSwap.bottom = agency__eth;
    itemSwap.eth = bigi(0);
    itemSwap.ethUsd = bigi(0);
    itemSwap.top = agency__eth;
    itemSwap.bottomUsd = wethToUsdc(agency__eth);
    itemSwap.topUsd = itemSwap.bottomUsd;
    itemSwap.owner = sellingNugg.id;
    itemSwap.leader = sellingNugg.id;
    itemSwap.numOffers = 0;
    itemSwap.nextDelegateType = 'Commit';
    itemSwap.updatedAt = event.block.number;
    itemSwap.save(); // OK

    safeSetNuggItemActiveSwap(nuggitem, itemSwap, event.block);

    safeSetNuggActiveItemSwap(sellingNugg, nuggitem, itemSwap, event.block);

    const itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = agency__eth;
    itemoffer.ethUsd = wethToUsdc(agency__eth);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.txhash = event.transaction.hash.toHexString();
    itemoffer.incrementX64 = BigInt.fromString('0');
    itemoffer.epoch = proto.epoch;
    itemoffer.updatedAt = event.block.number;
    itemoffer.user = sellingNugg.user;

    itemoffer.save(); // OK
    log.debug('handleEvent__SellItem a', []);

    sellingNugg = updateProof(sellingNugg, proof, false, event.block);
    log.debug('handleEvent__SellItem b', []);

    sellingNugg = cacheDotnugg(sellingNugg, event.block.number);

    log.debug('handleEvent__SellItem end', []);
}
