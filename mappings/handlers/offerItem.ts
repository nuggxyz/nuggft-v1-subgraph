import { BigInt, ethereum, log } from '@graphprotocol/graph-ts';

import { Protocol, Nugg, Item, NuggItem, ItemSwap } from '../../generated/schema';
import { LOSS } from '../constants';
import {
    safeLoadEpoch,
    safeLoadItemOfferHelperNull,
    safeNewItemOffer,
    safeLoadActiveNuggItemSwap,
    safeLoadItem,
    safeLoadNugg,
    safeLoadNuggItemHelper,
    safeLoadProtocol,
    safeSetNuggActiveItemSwap,
    safeSetItemActiveSwap,
    safeSetNuggItemActiveSwap,
} from '../safeload';
import { wethToUsdc } from '../uniswap';
import { bigi, bigs, makeIncrementX64, mask, MAX_UINT160, panicFatal } from '../utils';

export function _offerItem(
    event: ethereum.Event,
    agency: BigInt,
    sellingTokenId: BigInt,
    sellingItemId: BigInt,
): void {
    const proto = safeLoadProtocol();

    const agency__account = agency.bitAnd(MAX_UINT160);

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(LOSS);

    const sellingNuggId = sellingTokenId;

    const sellingNugg = safeLoadNugg(sellingNuggId);

    const item = safeLoadItem(sellingItemId);

    const buyingNugg = safeLoadNugg(agency__account);

    const nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    const itemswap = safeLoadActiveNuggItemSwap(nuggitem);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap, event.block);

    item.lastPrice = agency__eth;
    item.lastOfferEpoch = event.block.number;
    item.lastOfferEpoch = bigs(proto.epoch);
    item.updatedAt = event.block.number;
    item.save(); // OK

    if (itemswap.nextDelegateType == 'Commit') {
        _offerCommitItem(
            event.transaction.hash.toHexString(),
            proto,
            buyingNugg,
            sellingNugg,
            item,
            nuggitem,
            itemswap,
            agency__eth,
            event.block,
        );
    } else if (itemswap.nextDelegateType == 'Carry') {
        _offerOfferItem(
            event.transaction.hash.toHexString(),
            proto,
            buyingNugg,
            sellingNugg,
            item,
            nuggitem,
            itemswap,
            agency__eth,
            event.block,
        );
    } else {
        panicFatal('itemswap.nextDelegateType should be Commit or Offer');
    }
}

function _offerCommitItem(
    hash: string,
    proto: Protocol,
    buyerNugg: Nugg,
    sellerNugg: Nugg,
    item: Item,
    nuggItem: NuggItem,
    itemswap: ItemSwap,
    eth: BigInt,
    block: ethereum.Block,
): void {
    log.debug('_offerCommitItem start', []);

    if (itemswap.epoch !== null) panicFatal('_offerOfferItem: ITEMSWAP.epoch MUST BE NULL');

    const epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));

    itemswap.epoch = epoch.id;
    itemswap.startingEpoch = proto.epoch;
    itemswap.endingEpoch = BigInt.fromString(epoch.id);
    // itemswap.id = nuggitem.id.concat('-').concat(epoch.id);
    itemswap.updatedAt = block.number;
    itemswap.save(); // OK

    let _s = epoch._activeItemSwaps as string[];
    _s.push(itemswap.id as string);
    epoch._activeItemSwaps = _s as string[];

    _s = epoch._activeNuggItemSwaps as string[];
    _s.push(itemswap.id as string);
    epoch._activeNuggItemSwaps = _s as string[];
    epoch.updatedAt = block.number;
    epoch.save(); // OK

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyerNugg);

    safeSetItemActiveSwap(item, itemswap, block);
    safeSetNuggItemActiveSwap(nuggItem, itemswap, block);

    // const __s = epoch._upcomingActiveItemSwaps as string[];
    // __s.push(itemswap.id as string);
    // epoch._upcomingActiveItemSwaps = __s as string[];
    // epoch.save(); // OK

    // if (item.activeSwap !== null) {
    //     log.debug("a",[])
    //     let itemActiveSwap = safeLoadActiveItemSwap(item);
    //     if (itemActiveSwap.endingEpoch !== null) {
    //         log.debug("b",[])

    //         if ((itemActiveSwap.endingEpoch as BigInt).equals(BigInt.fromString(epoch.id))) {
    //             log.debug("c",[])

    //             let _s = epoch._upcomingActiveItemSwaps as string[];
    //             _s.push(itemswap.id as string);
    //             epoch._upcomingActiveItemSwaps = _s as string[];
    //             epoch.save(); // OK
    //         } else {
    //             safeSetItemActiveSwap(item, itemswap);
    //         }
    //     } else {
    //         safeSetItemActiveSwap(item, itemswap);
    //     }
    // } else {
    //     safeSetItemActiveSwap(item, itemswap);
    // }

    itemoffer = safeNewItemOffer(itemswap, buyerNugg);
    itemoffer.claimed = false;
    itemoffer.eth = eth;
    itemoffer.ethUsd = wethToUsdc(eth);
    itemoffer.owner = false;
    itemoffer.nugg = buyerNugg.id;
    itemoffer.swap = itemswap.id;
    itemoffer.txhash = hash;
    itemoffer.incrementX64 = bigi(0);
    itemoffer.epoch = proto.epoch;
    itemoffer.updatedAt = block.number;
    itemoffer.save(); // OK

    itemswap.startUnix = block.timestamp;
    itemswap.top = itemoffer.eth;
    itemswap.topUsd = itemoffer.ethUsd;
    itemswap.nextDelegateType = 'Carry';
    itemswap.commitBlock = block.number;

    itemswap.leader = buyerNugg.id;
    itemswap.updatedAt = block.number;

    itemswap.save(); // OK

    log.debug('_offerCommitItem end', []);
}

function _offerOfferItem(
    hash: string,
    proto: Protocol,
    buyerNugg: Nugg,
    sellerNugg: Nugg,
    item: Item,
    nuggItem: NuggItem,
    itemswap: ItemSwap,
    eth: BigInt,
    block: ethereum.Block,
): void {
    log.debug('_offerOfferItem start', []);
    log.debug('_offerOfferItem start', []);

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyerNugg);

    if (itemoffer == null) {
        itemoffer = safeNewItemOffer(itemswap, buyerNugg);
        itemoffer.claimed = false;
        itemoffer.eth = BigInt.fromString('0');
        itemoffer.ethUsd = BigInt.fromString('0');
        itemoffer.owner = false;
        itemoffer.nugg = buyerNugg.id;
        itemoffer.swap = itemswap.id;
        itemoffer.txhash = hash;
        itemoffer.incrementX64 = bigi(0);

        itemoffer.epoch = proto.epoch;
        itemoffer.updatedAt = block.number;

        itemoffer.save(); // OK

        itemswap.numOffers += 1;
    }

    itemoffer.txhash = hash;
    itemoffer.eth = eth;
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);

    itemoffer.incrementX64 = makeIncrementX64(itemoffer.eth, itemswap.top);
    itemoffer.updatedAt = block.number;

    itemoffer.save(); // OK

    itemswap.top = itemoffer.eth;
    itemswap.topUsd = itemoffer.ethUsd;
    itemswap.leader = buyerNugg.id;
    itemswap.updatedAt = block.number;
    itemswap.save(); // OK

    log.debug('handleOffer end', []);
}
