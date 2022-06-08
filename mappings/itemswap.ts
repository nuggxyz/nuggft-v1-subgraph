import { log, BigInt, ethereum } from '@graphprotocol/graph-ts';
import { wethToUsdc, panicFatal } from './uniswap';
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
    safeRemoveNuggItemActiveSwap,
    safeSetUpcomingItemActiveSwap,
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
import { ClaimItem, OfferItem, SellItem } from '../generated/NuggftV1/NuggftV1';
import { b32toBigEndian, bigb, bigi, bigs, MAX_UINT160 } from './utils';
import { mask, _stake } from './nuggft';
import { updateProof, cacheDotnugg } from './dotnugg';
import { LOSS } from './constants';
import { makeIncrementX64 } from './swap';

export function handleEvent__OfferItem(event: OfferItem): void {
    let proto = safeLoadProtocol();

    let agency = b32toBigEndian(event.params.agency);

    let agency__account = agency.bitAnd(MAX_UINT160);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(LOSS);

    let sellingNuggId = event.params.sellingTokenId;

    let sellingItemId = bigi(event.params.itemId);

    let sellingNugg = safeLoadNugg(bigi(sellingNuggId));

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(agency__account);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeLoadActiveNuggItemSwap(nuggitem);

    safeSetNuggActiveItemSwap(buyingNugg, nuggitem, itemswap);

    item.lastPrice = agency__eth;
    item.lastOfferEpoch = event.block.number;
    item.lastOfferEpoch = bigs(proto.epoch);

    item.save();

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
        );
    } else {
        panicFatal('itemswap.nextDelegateType should be Commit or Offer');
    }

    // updatedStakedSharesAndEth();

    _stake(b32toBigEndian(event.params.stake));
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

    safeSetUpcomingItemActiveSwap(item, itemswap);

    let __s = epoch._upcomingActiveItemSwaps as string[];
    __s.push(itemswap.id as string);
    epoch._upcomingActiveItemSwaps = __s as string[];
    epoch.save();

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
    //             epoch.save();
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
    itemoffer.save();

    itemswap.startUnix = block.timestamp;
    itemswap.top = itemoffer.eth;
    itemswap.topUsd = itemoffer.ethUsd;
    itemswap.nextDelegateType = 'Carry';
    itemswap.commitBlock = block.number;

    itemswap.leader = buyerNugg.id;

    itemswap.save();

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

        itemoffer.save();

        itemswap.numOffers = itemswap.numOffers + 1;
    }

    itemoffer.txhash = hash;
    itemoffer.eth = itemoffer.eth.plus(eth);
    itemoffer.ethUsd = wethToUsdc(itemoffer.eth);

    itemoffer.incrementX64 = makeIncrementX64(itemoffer.eth, itemswap.top);

    itemoffer.save();

    itemswap.top = itemoffer.eth;
    itemswap.topUsd = itemoffer.ethUsd;
    itemswap.leader = buyerNugg.id;
    itemswap.save();

    log.debug('handleOffer end', []);
}

export function handleEvent__ClaimItem(event: ClaimItem): void {
    let sellingNuggId = event.params.sellingTokenId;

    let sellingItemId = bigi(event.params.itemId);

    let sellingNugg = safeLoadNugg(bigi(sellingNuggId));

    let item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(bigi(event.params.buyerTokenId));

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    let itemswap = safeGetAndDeleteNuggActiveItemSwap(buyingNugg, nuggitem);

    let itemoffer = safeLoadItemOfferHelper(itemswap, buyingNugg);

    safeRemoveNuggItemActiveSwap(nuggitem);

    itemoffer.claimed = true;

    itemoffer.save();

    const proof = b32toBigEndian(event.params.proof);

    if (proof.notEqual(bigi(0))) {
        buyingNugg = updateProof(buyingNugg, proof, false, event.block);

        buyingNugg = cacheDotnugg(buyingNugg, event.block.number);
    }
}

export function handleEvent__SellItem(event: SellItem): void {
    _sellItem(
        event,
        b32toBigEndian(event.params.agency),
        event.params.sellingTokenId,
        event.params.itemId,
        b32toBigEndian(event.params.proof),
    );
}

export function _sellItem(
    event: ethereum.Event,
    agency: BigInt,
    sellingNuggId: i32,
    _sellingItemId: i32,
    proof: BigInt,
): void {
    log.debug('handleEvent__SellItem start', []);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(LOSS);

    let sellingItemId = bigi(_sellingItemId);

    let sellingNugg = safeLoadNugg(bigi(sellingNuggId));

    let item = safeLoadItem(sellingItemId);

    let nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    if (nuggitem.activeSwap !== null) {
        let swap = safeLoadActiveNuggItemSwap(nuggitem);
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
        swap.save();

        let itemoffer = safeLoadItemOfferHelper(swap, sellingNugg);

        itemoffer.eth = agency__eth;
        itemoffer.ethUsd = wethToUsdc(agency__eth);
        itemoffer.txhash = event.transaction.hash.toHexString();
        itemoffer.save();

        log.debug('handleEvent__SellItem end EARLY', []);

        return;
    }

    let itemSwap = safeNewItemSwap(nuggitem);

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
    itemSwap.save();

    safeSetNuggItemActiveSwap(nuggitem, itemSwap);

    safeSetNuggActiveItemSwap(sellingNugg, nuggitem, itemSwap);

    let itemoffer = safeNewItemOffer(itemSwap, sellingNugg);

    itemoffer.claimed = false;
    itemoffer.eth = agency__eth;
    itemoffer.ethUsd = wethToUsdc(agency__eth);
    itemoffer.owner = true;
    itemoffer.nugg = sellingNugg.id;
    itemoffer.swap = itemSwap.id;
    itemoffer.txhash = event.transaction.hash.toHexString();
    itemoffer.incrementX64 = BigInt.fromString('0');

    itemoffer.save();
    log.debug('handleEvent__SellItem a', []);

    sellingNugg = updateProof(sellingNugg, proof, false, event.block);
    log.debug('handleEvent__SellItem b', []);

    sellingNugg = cacheDotnugg(sellingNugg, event.block.number);

    log.debug('handleEvent__SellItem end', []);
}

// https://eth-rinkeby.alchemyapi.io/v2/MbPzjkEmyF891zBE51Q1c5M4IQAEXZ-9
