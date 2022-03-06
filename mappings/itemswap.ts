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
import { updatedStakedSharesAndEth, updateProof } from './dotnugg';
import { ClaimItem, OfferItem, SellItem } from '../generated/NuggftV1/NuggftV1';
import { b32toBigEndian, bigb, bigi, MAX_UINT160 } from './utils';
import { mask } from './nuggft';

// const ONE = BigInt.fromString('1');

export function handleEvent__OfferItem(event: OfferItem): void {
    let proto = safeLoadProtocol();
    log.warning('A', []);

    let agency = b32toBigEndian(event.params.agency);
    log.warning('B' + agency.toHexString(), []);

    let agency__account = agency.bitAnd(MAX_UINT160);
    log.warning('C' + agency__account.toHexString(), []);

    let sellingNuggId = event.params.sellingTokenId;
    log.warning('D', []);

    let sellingItemId = bigb(event.params.itemId);
    log.warning('E' + sellingItemId.toString(), []);

    let sellingNugg = safeLoadNugg(sellingNuggId);
    log.warning('F', []);

    let item = safeLoadItem(sellingItemId);
    log.warning('G', []);

    let buyingNugg = safeLoadNugg(agency__account);
    log.warning('H', []);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);
    log.warning('I', []);

    let itemswap = safeLoadActiveNuggItemSwap(nuggitem);
    log.warning('J', []);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap);
    log.warning('K + ' + itemswap.nextDelegateType, []);

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

    itemoffer.claimed = true;

    // if (itemswap.leader == buyingNugg.id) {
    //     // nuggitem.activeSwap = null;
    //     // nuggitem.save();
    //     // if (itemswap.owner == buyingNugg.id) {
    //     //     store.remove('OfferOfferItem', itemoffer.id);
    //     //     store.remove('StartSellItem', itemswap.id);
    //     // }
    // }

    itemoffer.save();

    updatedStakedSharesAndEth();

    updateProof(buyingNugg);
}

export function handleEvent__SellItem(event: SellItem): void {
    log.info('handleEvent__SellItem start', []);

    let agency = b32toBigEndian(event.params.agency);

    log.warning('A', []);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));
    log.warning('B', []);

    let sellingNuggId = event.params.sellingTokenId;
    log.warning('C', []);

    let sellingItemId = bigb(event.params.itemId);
    log.warning('D', []);

    let sellingNugg = safeLoadNugg(sellingNuggId);
    log.warning('E', []);

    let item = safeLoadItem(sellingItemId);
    log.warning('F', []);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);
    log.warning('G', []);

    if (nuggitem.activeSwap != null) {
        log.warning('HERE', []);
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
}
