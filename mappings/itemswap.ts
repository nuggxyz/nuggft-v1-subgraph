import { log, BigInt, store } from '@graphprotocol/graph-ts';
import { DelegateItemCall, ClaimItemCall, SwapItemCall } from '../generated/local/NuggFT/NuggFT';
import { wethToUsdc } from './uniswap';
import {
    safeNewItemSwap,
    safeNewItemOffer,
    safeLoadActiveItemSwap,
    safeLoadEpoch,
    safeSetNuggItemActiveSwap,
    safeSetNuggActiveItemSwap,
    safeGetAndDeleteNuggActiveItemSwap,
} from './safeload';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadItemOfferHelper,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadItemOfferHelperNull,
} from './safeload';
import { ItemSwap, Nugg, NuggItem, Protocol, Item } from '../generated/local/schema';
import { updatedStakedSharesAndEth, updateProof } from './dotnugg';

export function handleCall__delegateItem(call: DelegateItemCall): void {
    let proto = safeLoadProtocol('0x42069');

    let sellingNugg = safeLoadNugg(call.inputs.sellerTokenId);

    let item = safeLoadItem(BigInt.fromI32(call.inputs.itemId));

    let buyingNugg = safeLoadNugg(call.inputs.buyerTokenId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveItemSwap(nuggitem);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap);

    if (itemswap.nextDelegateType == 'Commit') {
        _delegateCommitItem(proto, buyingNugg, sellingNugg, item, nuggitem, itemswap, call.transaction.value);
    } else if (itemswap.nextDelegateType == 'Offer') {
        _delegateOfferItem(proto, buyingNugg, sellingNugg, item, nuggitem, itemswap, call.transaction.value);
    } else {
        log.error('itemswap.nextDelegateType should be Commit or Offer', [itemswap.nextDelegateType]);
        log.critical('', []);
    }

    updatedStakedSharesAndEth();
}

function _delegateCommitItem(
    proto: Protocol,
    buyerNugg: Nugg,
    sellerNugg: Nugg,
    item: Item,
    nuggItem: NuggItem,
    itemswap: ItemSwap,
    eth: BigInt,
): void {
    log.info('_delegateCommitItem start', []);

    if (itemswap.epoch != null) log.critical('_delegateOfferItem: ITEMSWAP.epoch MUST BE NULL', []);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));

    itemswap.epoch = epoch.id;
    itemswap.startingEpoch = proto.epoch;
    itemswap.endingEpoch = BigInt.fromString(epoch.id);
    // itemswap.id = nuggitem.id.concat('-').concat(epoch.id);
    itemswap.save();

    let _s = epoch._activeItemSwaps as string[];
    _s.push(itemswap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyerNugg);

    safeSetNuggItemActiveSwap(nuggItem, itemswap);

    itemoffer = safeNewItemOffer(itemswap, buyerNugg);
    itemoffer.claimed = false;
    itemoffer.eth = eth;
    itemoffer.ethUsd = wethToUsdc(eth);
    itemoffer.owner = false;
    itemoffer.nugg = buyerNugg.id;
    itemoffer.swap = itemswap.id;
    itemoffer.save();

    itemswap.eth = itemoffer.eth;
    itemswap.ethUsd = itemoffer.ethUsd;

    itemswap.leader = buyerNugg.id;

    itemswap.save();

    log.info('_delegateCommitItem end', []);
}

function _delegateOfferItem(
    proto: Protocol,
    buyerNugg: Nugg,
    sellerNugg: Nugg,
    item: Item,
    nuggItem: NuggItem,
    itemswap: ItemSwap,
    eth: BigInt,
): void {
    log.info('_delegateOfferItem start', []);

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyerNugg);

    if (itemoffer == null) {
        itemoffer = safeNewItemOffer(itemswap, buyerNugg);
        itemoffer.claimed = false;
        itemoffer.eth = BigInt.fromString('0');
        itemoffer.ethUsd = BigInt.fromString('0');
        itemoffer.owner = false;
        itemoffer.nugg = buyerNugg.id;
        itemoffer.swap = itemswap.id;
        itemoffer.save();
    }

    itemoffer.eth = itemoffer.eth.plus(eth);
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);
    itemoffer.save();

    itemswap.eth = itemoffer.eth;
    itemswap.ethUsd = itemoffer.ethUsd;
    itemswap.leader = buyerNugg.id;
    itemswap.save();

    log.info('handleOffer end', []);
}

export function handleCall__claimItem(call: ClaimItemCall): void {
    let sellingNugg = safeLoadNugg(call.inputs.sellerTokenId);

    let item = safeLoadItem(BigInt.fromI32(call.inputs.itemId));

    let buyingNugg = safeLoadNugg(call.inputs.buyerTokenId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeGetAndDeleteNuggActiveItemSwap(buyingNugg, nuggitem);

    let itemoffer = safeLoadItemOfferHelper(itemswap, buyingNugg);

    itemoffer.claimed = true;

    // if (itemswap.leader == buyingNugg.id) {
    //     // nuggitem.activeSwap = null;
    //     // nuggitem.save();
    //     // if (itemswap.owner == buyingNugg.id) {
    //     //     store.remove('DelegateOfferItem', itemoffer.id);
    //     //     store.remove('StartSwapItem', itemswap.id);
    //     // }
    // }

    itemoffer.save();

    updatedStakedSharesAndEth();

    updateProof(buyingNugg);
}

export function handleCall__swapItem(call: SwapItemCall): void {
    log.info('handleSwapItemStart start', []);

    let sellingNugg = safeLoadNugg(call.inputs.sellerTokenId);

    let item = safeLoadItem(BigInt.fromI32(call.inputs.itemId));

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap != null) log.critical('handleSwapItemStart: nuggitem.activeSwap MUST BE NULL', []);

    let itemSwap = safeNewItemSwap(nuggitem);

    itemSwap.sellingNuggItem = nuggitem.id;
    itemSwap.eth = call.inputs.floor;
    itemSwap.ethUsd = wethToUsdc(call.inputs.floor);
    itemSwap.owner = sellingNugg.id;
    itemSwap.leader = sellingNugg.id;
    itemSwap.nextDelegateType = 'Commit';
    itemSwap.save();

    safeSetNuggItemActiveSwap(nuggitem, itemSwap);

    nuggitem.count = nuggitem.count.minus(BigInt.fromString('1'));
    nuggitem.save();

    let itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = call.inputs.floor;
    itemoffer.ethUsd = wethToUsdc(call.inputs.floor);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.save();

    log.info('handleSwapItemStart end', []);

    updatedStakedSharesAndEth();

    updateProof(sellingNugg);
}
