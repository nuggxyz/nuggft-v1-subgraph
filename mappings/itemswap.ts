import { log, BigInt } from '@graphprotocol/graph-ts';
import { wethToUsdc } from './uniswap';
import {
    safeNewItemSwap,
    safeNewItemOffer,
    safeLoadActiveNuggItemSwap,
    safeLoadEpoch,
    safeSetNuggItemActiveSwap,
    safeSetNuggActiveItemSwap,
    safeGetAndDeleteNuggActiveItemSwap,
    safeSetItemActiveSwap,
    safeLoadActiveItemSwap,
    safeRemoveItemActiveSwap,
    safeRemoveNuggItemActiveSwap,
} from './safeload';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadItemOfferHelper,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadItemOfferHelperNull,
} from './safeload';
import { ItemSwap, Nugg, NuggItem, Protocol, Item } from '../generated/schema';
import { cacheDotnugg, updatedStakedSharesAndEth, updateProof } from './dotnugg';
import { ClaimItem, OfferItem, SellItem } from '../generated/NuggftV1/NuggftV1';
import { b32toBigEndian, bigb, bigi, MAX_UINT160 } from './utils';
import { mask } from './nuggft';

export function handleEvent__OfferItem(event: OfferItem): void {
    let proto = safeLoadProtocol();

    let agency = b32toBigEndian(event.params.agency);

    let agency__account = agency.bitAnd(MAX_UINT160);

    let sellingNuggId = event.params.sellingTokenId;

    let sellingItemId = bigb(event.params.itemId);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(agency__account);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveNuggItemSwap(nuggitem);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap);

    if (itemswap.nextDelegateType == 'Commit') {
        _offerCommitItem(
            event.transaction.hash.toHexString(),
            proto,
            buyingNugg,
            sellingNugg,
            item,
            nuggitem,
            itemswap,
            event.transaction.value,
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
            event.transaction.value,
        );
    } else {
        log.error('itemswap.nextDelegateType should be Commit or Offer', [
            itemswap.nextDelegateType,
        ]);
        log.critical('', []);
    }

    updatedStakedSharesAndEth();
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
): void {
    log.info('_offerCommitItem start', []);

    if (itemswap.epoch !== null) log.critical('_offerOfferItem: ITEMSWAP.epoch MUST BE NULL', []);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));

    itemswap.epoch = epoch.id;
    itemswap.startingEpoch = proto.epoch;
    itemswap.endingEpoch = BigInt.fromString(epoch.id);
    // itemswap.id = nuggitem.id.concat('-').concat(epoch.id);
    itemswap.save();

    let _s = epoch._activeItemSwaps as string[];
    _s.push(itemswap.id as string);
    epoch._activeItemSwaps = _s as string[];

    _s = epoch._activeNuggItemSwaps as string[];
    _s.push(itemswap.id as string);
    epoch._activeNuggItemSwaps = _s as string[];
    epoch.save();

    let itemoffer = safeLoadItemOfferHelperNull(itemswap, buyerNugg);

    if (item.activeSwap != null) {
        let itemActiveSwap = safeLoadActiveItemSwap(item);
        if (itemActiveSwap.endingEpoch !== null) {
            if ((itemActiveSwap.endingEpoch as BigInt).equals(BigInt.fromString(epoch.id))) {
                let _s = epoch._upcomingActiveItemSwaps as string[];
                _s.push(itemswap.id as string);
                epoch._upcomingActiveItemSwaps = _s as string[];
                epoch.save();
            } else {
                safeSetItemActiveSwap(item, itemswap);
            }
        } else {
            safeSetItemActiveSwap(item, itemswap);
        }
    } else {
        safeSetItemActiveSwap(item, itemswap);
    }

    itemoffer = safeNewItemOffer(itemswap, buyerNugg);
    itemoffer.claimed = false;
    itemoffer.eth = eth;
    itemoffer.ethUsd = wethToUsdc(eth);
    itemoffer.owner = false;
    itemoffer.nugg = buyerNugg.id;
    itemoffer.swap = itemswap.id;
    itemoffer.txhash = hash;
    itemoffer.save();

    itemswap.eth = itemoffer.eth;
    itemswap.ethUsd = itemoffer.ethUsd;
    itemswap.nextDelegateType = 'Carry';
    itemswap.leader = buyerNugg.id;

    itemswap.save();

    log.info('_offerCommitItem end', []);
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
): void {
    log.info('_offerOfferItem start', []);

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

        itemoffer.save();
    }

    itemoffer.txhash = hash;
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
    let sellingNuggId = event.params.sellingTokenId;

    let sellingItemId = bigb(event.params.itemId);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(event.params.buyerTokenId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeGetAndDeleteNuggActiveItemSwap(buyingNugg, nuggitem);

    let itemoffer = safeLoadItemOfferHelper(itemswap, buyingNugg);

    safeRemoveNuggItemActiveSwap(nuggitem);

    // let itemswap = nuggitem.activeSwap;

    // if (itemswap == null) {
    //     log.error('itemswap connot be null', []);
    //     log.critical('', []);
    // }

    // let realitemswap = ItemSwap.load(itemswap as string);

    // if (realitemswap == null) {
    //     log.error('realitemswap connot be null', []);
    //     log.critical('', []);
    // }

    // safeRemoveNuggItemActiveSwap(nuggitem);

    // let itemoffer = safeLoadItemOfferHelper(realitemswap as ItemSwap, buyingNugg);

    itemoffer.claimed = true;

    itemoffer.save();

    updatedStakedSharesAndEth();

    updateProof(buyingNugg);
}

export function handleEvent__SellItem(event: SellItem): void {
    log.info('handleEvent__SellItem start', []);

    let agency = b32toBigEndian(event.params.agency);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let sellingNuggId = event.params.sellingTokenId;

    let sellingItemId = bigb(event.params.itemId);

    let sellingNugg = safeLoadNugg(sellingNuggId);

    let item = safeLoadItem(sellingItemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap != null) {
        log.critical('handleEvent__SellItem: nuggitem.activeSwap MUST BE NULL', []);
    }

    let itemSwap = safeNewItemSwap(nuggitem);

    itemSwap.sellingNuggItem = nuggitem.id;
    itemSwap.sellingItem = nuggitem.item;

    itemSwap.eth = agency__eth;
    itemSwap.ethUsd = wethToUsdc(agency__eth);
    itemSwap.owner = sellingNugg.id;
    itemSwap.leader = sellingNugg.id;
    itemSwap.nextDelegateType = 'Commit';
    itemSwap.save();

    safeSetNuggItemActiveSwap(nuggitem, itemSwap);

    safeSetNuggActiveItemSwap(sellingNugg, nuggitem, itemSwap);

    nuggitem.count = nuggitem.count.minus(BigInt.fromString('1'));
    nuggitem.save();

    let itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = agency__eth;
    itemoffer.ethUsd = wethToUsdc(agency__eth);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.save();

    log.info('handleEvent__SellItem end', []);

    updatedStakedSharesAndEth();

    updateProof(sellingNugg);

    cacheDotnugg(sellingNugg, 0);
}
