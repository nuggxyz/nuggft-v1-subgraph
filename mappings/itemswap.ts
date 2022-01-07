import { log, BigInt, store } from '@graphprotocol/graph-ts';
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
import { ClaimItem, DelegateItem, SwapItem } from '../generated/local/NuggftV1/NuggftV1';

// const ONE = BigInt.fromString('1');
const MAX_UINT160 = BigInt.fromString('1').leftShift(160).minus(BigInt.fromString('1'));

export function handleEvent__DelegateItem(event: DelegateItem): void {
    let proto = safeLoadProtocol('0x42069');

    let sellingNuggId = event.params.sellingItemId.bitAnd(MAX_UINT160);

    let sellingItemId = event.params.sellingItemId.rightShift(160);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(event.params.nugg);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveItemSwap(nuggitem);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap);

    if (itemswap.nextDelegateType == 'Commit') {
        _delegateCommitItem(proto, buyingNugg, sellingNugg, item, nuggitem, itemswap, event.transaction.value);
    } else if (itemswap.nextDelegateType == 'Offer') {
        _delegateOfferItem(proto, buyingNugg, sellingNugg, item, nuggitem, itemswap, event.transaction.value);
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

export function handleEvent__ClaimItem(event: ClaimItem): void {
    let sellingNuggId = event.params.sellingItemId.bitAnd(MAX_UINT160);

    let sellingItemId = event.params.sellingItemId.rightShift(160);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(event.params.nugg);

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

export function handleEvent__SwapItem(event: SwapItem): void {
    log.info('handleEvent__SwapItem start', []);

    let sellingNuggId = event.params.sellingItemId.bitAnd(MAX_UINT160);

    let sellingItemId = event.params.sellingItemId.rightShift(160);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap != null) log.critical('handleEvent__SwapItem: nuggitem.activeSwap MUST BE NULL', []);

    let itemSwap = safeNewItemSwap(nuggitem);

    itemSwap.sellingNuggItem = nuggitem.id;
    itemSwap.eth = event.params.floor;
    itemSwap.ethUsd = wethToUsdc(event.params.floor);
    itemSwap.owner = sellingNugg.id;
    itemSwap.leader = sellingNugg.id;
    itemSwap.nextDelegateType = 'Commit';
    itemSwap.save();

    safeSetNuggItemActiveSwap(nuggitem, itemSwap);

    nuggitem.count = nuggitem.count.minus(BigInt.fromString('1'));
    nuggitem.save();

    let itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = event.params.floor;
    itemoffer.ethUsd = wethToUsdc(event.params.floor);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.save();

    log.info('handleEvent__SwapItem end', []);

    updatedStakedSharesAndEth();

    updateProof(sellingNugg);
}
