import { log, BigInt, store } from '@graphprotocol/graph-ts';
import {
    Claim,
    ClaimItem,
    Commit,
    CommitItem,
    Swap as SwapEvent,
    Mint,
    Offer,
    OfferItem,
    SwapItem,
} from '../generated/local/NuggFT/NuggFT';
import { invariant, wethToUsdc } from './uniswap';
import {
    safeLoadItemSwapHelperNull,
    safeNewItemSwap,
    safeNewItemOffer,
    safeLoadActiveItemSwap,
    safeLoadEpoch,
    safeSetNuggItemActiveSwap,
} from './safeload';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadItemSwapHelper,
    safeLoadItemOfferHelper,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadItemOfferHelperNull,
} from './safeload';

export function handleCommitItem(event: CommitItem): void {
    log.info('handleCommitItem start', []);

    let proto = safeLoadProtocol('0x42069');

    let sellingNugg = safeLoadNugg(event.params.sellingTokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveItemSwap(nuggitem);

    let prevswapId = itemswap.id;

    if (itemswap.epoch != null) log.critical('handleOfferItem: ITEMSWAP.epoch MUST BE NULL', []);

    let owneritemoffer = safeLoadItemOfferHelper(itemswap, sellingNugg);

    store.remove('ItemSwap', itemswap.id);
    store.remove('ItemOffer', owneritemoffer.id);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));

    itemswap.epoch = epoch.id;
    itemswap.id = nuggitem.id.concat('-').concat(itemswap.epoch as string);
    itemswap.save();

    let _s = epoch._activeItemSwaps as string[];
    _s[_s.indexOf(prevswapId)] = itemswap.id;

    // _s.push(itemswap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    owneritemoffer.id = itemswap.id.concat('-').concat(itemswap.owner);
    owneritemoffer.swap = itemswap.id;

    owneritemoffer.save();

    safeSetNuggItemActiveSwap(nuggitem, itemswap);

    let buyingNugg = safeLoadNugg(event.params.buyingTokenId);

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyingNugg);

    if (itemoffer == null) {
        itemoffer = safeNewItemOffer(itemswap, buyingNugg);
        itemoffer.claimed = false;
        itemoffer.eth = BigInt.fromString('0');
        itemoffer.ethUsd = BigInt.fromString('0');
        itemoffer.owner = false;
        itemoffer.nugg = buyingNugg.id;
        itemoffer.swap = itemswap.id;
        itemoffer.save();
    }

    itemoffer.eth = itemoffer.eth.plus(event.transaction.value);
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);

    itemswap.eth = itemoffer.eth;
    itemswap.ethUsd = itemoffer.ethUsd;

    itemswap.leader = buyingNugg.id;

    itemoffer.save();
    itemswap.save();

    log.info('handleCommitItem end', []);
}

export function handleOfferItem(event: OfferItem): void {
    log.info('handleOfferItem start', []);

    let sellingNugg = safeLoadNugg(event.params.sellingTokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveItemSwap(nuggitem);

    let buyingNugg = safeLoadNugg(event.params.buyingTokenId);

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyingNugg);

    if (itemoffer == null) {
        itemoffer = safeNewItemOffer(itemswap, buyingNugg);
        itemoffer.claimed = false;
        itemoffer.eth = BigInt.fromString('0');
        itemoffer.ethUsd = BigInt.fromString('0');
        itemoffer.owner = false;
        itemoffer.nugg = buyingNugg.id;
        itemoffer.swap = itemswap.id;
        itemoffer.save();
    }

    itemoffer.eth = itemoffer.eth.plus(event.transaction.value);
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);
    itemoffer.save();

    itemswap.eth = itemoffer.eth;
    itemswap.ethUsd = itemoffer.ethUsd;
    itemswap.leader = buyingNugg.id;
    itemswap.save();

    log.info('handleOffer end', []);
}

export function handleClaimItem(event: ClaimItem): void {
    log.info('handleClaimItem start', []);

    let sellingNugg = safeLoadNugg(event.params.sellingTokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadItemSwapHelper(nuggitem, event.params.endingEpoch);

    let buyingNugg = safeLoadNugg(event.params.buyingTokenId);

    let itemoffer = safeLoadItemOfferHelper(itemswap, buyingNugg);

    itemoffer.claimed = true;

    if (itemswap.leader == buyingNugg.id) {
        // nuggitem.activeSwap = null;
        // nuggitem.save();
        if (itemswap.owner == buyingNugg.id) {
            store.remove('OfferItem', itemoffer.id);
            store.remove('SwapItem', itemswap.id);
        }
    }

    itemoffer.save();

    log.info('handleClaimItem end', []);
}

export function handleSwapItem(event: SwapItem): void {
    log.info('handleSwapItem start', []);

    let sellingNugg = safeLoadNugg(event.params.sellingTokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap != null) log.critical('handleSwapItem: nuggitem.activeSwap MUST BE NULL', []);

    let itemSwap = safeNewItemSwap(nuggitem, BigInt.fromString('0'));

    itemSwap.sellingNuggItem = nuggitem.id;
    // itemSwap.sellingNuggItemId = nuggitem.id;
    itemSwap.eth = event.transaction.value;
    itemSwap.ethUsd = wethToUsdc(itemSwap.eth);
    itemSwap.owner = sellingNugg.id;
    //     itemSwap.offers = [];
    itemSwap.leader = sellingNugg.id;
    itemSwap.save();

    safeSetNuggItemActiveSwap(nuggitem, itemSwap);

    nuggitem.count = nuggitem.count.minus(BigInt.fromString('1'));
    nuggitem.save();

    let itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = event.transaction.value;
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.save();

    log.info('handleSwapItem end', []);
}
