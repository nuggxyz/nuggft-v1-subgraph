import { log, BigInt, store, Address, Bytes, ethereum } from '@graphprotocol/graph-ts';
import {
    safeGetAndDeleteUserActiveSwap,
    safeLoadActiveSwap,
    safeLoadNugg,
    safeLoadOfferHelperNull,
    safeLoadProtocol,
    safeLoadUser,
    safeLoadUserNull,
    safeNewOfferHelper,
    safeNewSwapHelper,
    safeNewUser,
    safeRemoveNuggActiveSwap,
    safeSetUserActiveSwap,
} from './safeload';
import { wethToUsdc } from './uniswap';
import { safeLoadEpoch, safeLoadOfferHelper, safeSetNuggActiveSwap } from './safeload';
import { Nugg, Protocol, Swap, User } from '../generated/local/schema';
import { cacheDotnugg, updatedStakedSharesAndEth } from './dotnugg';
import { Claim, Offer, OfferMint, Rotate, Sell } from '../generated/local/NuggftV1/NuggftV1';
import { addr_b, addr_i, b32toBigEndian, bigi, MAX_UINT160 } from './utils';
import { mask } from './nuggft';

export function handleEvent__OfferMint(event: OfferMint): void {
    _offer(event.params.tokenId, event.params.agency);
    _rotate(event.params.tokenId);
}

export function handleEvent__Offer(event: Offer): void {
    _offer(event.params.tokenId, event.params.agency);
}

export function handleEvent__Rotate(event: Rotate): void {
    _rotate(event.params.tokenId);
}

function _rotate(tokenId: BigInt): void {
    log.info('handleEvent__Rotate start', []);

    let nugg = safeLoadNugg(tokenId);

    cacheDotnugg(nugg);

    log.info('handleEvent__Rotate end', []);
}

function _offer(tokenId: BigInt, _agency: Bytes): void {
    // log.debug('event.params.agency - a - ' + event.params.agency.toHex(), []);

    // transform bytes to Big-Endian
    let agency = b32toBigEndian(_agency);

    // log.debug('agency - a - ' + agency.toHex(), []);
    log.debug('agency - b - ' + agency.toHexString(), []);

    let agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    let agency__flag = agency.rightShift(254);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(tokenId);

    let user = safeLoadUserNull(agency__account);

    if (user == null) {
        user = safeNewUser(agency__account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    let swap = safeLoadActiveSwap(nugg);

    safeSetUserActiveSwap(user, nugg, swap);

    if (swap.nextDelegateType == 'Commit') {
        __offerCommit(proto, user, nugg, swap, agency__eth);
    } else if (swap.nextDelegateType == 'Carry') {
        __offerCarry(proto, user, nugg, swap, agency__eth);
    } else if (swap.nextDelegateType == 'Mint') {
        __offerMint(proto, user, nugg, swap, agency__eth);
    } else {
        log.error('swap.nextDelegateType should be Commit or Offer', [swap.nextDelegateType]);
        log.critical('', []);
    }

    updatedStakedSharesAndEth();
}

export function handleEvent__Sell(event: Sell): void {
    log.info('handleEvent__Sell start', []);

    let agency = b32toBigEndian(event.params.agency);

    // let agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    let agency__flag = agency.rightShift(254);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(event.params.tokenId);

    // if (nugg.user != proto.nuggftUser) {
    //     log.error('handleEvent__Sell: nugg.user should always be proto.nuggftUser', []);
    //     log.critical('', []);
    // }

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    swap.eth = agency__eth;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.nextDelegateType = 'Commit';
    swap.save();

    safeSetNuggActiveSwap(nugg, swap);

    safeSetUserActiveSwap(user, nugg, swap);

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = agency__eth;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.user = user.id;
    offer.claimer = user.id;
    offer.swap = swap.id;

    offer.save();

    updatedStakedSharesAndEth();

    log.info('handleEvent__Sell end', []);
}

export function handleEvent__Claim(event: Claim): void {
    log.info('handleEvent__Claim start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(event.params.tokenId);

    let user = safeLoadUser(event.params.account);

    let swap = safeGetAndDeleteUserActiveSwap(user, nugg);

    let offer = safeLoadOfferHelper(swap, user);

    offer.claimed = true;
    offer.claimer = null;
    offer.save();

    if (swap.leader == user.id) {
        if (swap.owner == user.id) {
            safeRemoveNuggActiveSwap(nugg);

            swap.endingEpoch = BigInt.fromString(proto.epoch);
            swap.save();
        }
    }

    updatedStakedSharesAndEth();

    log.info('handleEvent__Claim end', []);
}

export function __offerMint(
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
): void {
    log.info('__offerMint start', []);

    // let proto = safeLoadProtocol();

    log.info('__offerMint start 2', []);

    if (proto.epoch != nugg.id) {
        log.info('__offerMint start 3', []);

        log.critical(
            '__offerMint: INVALID EPOCH: ' + proto.epoch + ' != ' + nugg.id.toString(),
            [],
        );
    }

    proto.nuggftStakedShares = proto.nuggftStakedShares.plus(BigInt.fromString('1'));
    proto.save();

    // swap.eth = getCurrentUserOffer(user, nugg);
    swap.eth = lead;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.leader = user.id;
    swap.nextDelegateType = 'Carry';

    swap.save();

    // nugg.user = proto.nuggftUser;

    // nugg.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = swap.eth;
    offer.ethUsd = swap.ethUsd;
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.claimer = user.id;
    offer.save();

    log.info('__offerMint end', []);
}

export function __offerCommit(
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
): void {
    log.info('__offerCommit start', []);

    // let owner = safeLoadUser(Address.fromString(swap.owner));
    // log.info('__offerCommit start 5', []);

    // let owneroffer = safeLoadOfferHelper(swap, owner);
    // log.info('__offerCommit start 6', [swap.epoch == null ? 'null' : (swap.epoch as string)]);

    if (swap.epoch != '' && swap.epoch != null)
        log.critical('__offerCommit: SWAP.epochId MUST BE NULL', []);
    // log.info('__offerCommit start 7', []);

    // store.remove('Swap', swap.id);
    // store.remove('Carry', owneroffer.id);

    // log.info('__offerCommit start 8', []);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));
    // log.info('__offerCommit start 9', []);

    swap.epoch = epoch.id;
    swap.startingEpoch = proto.epoch;
    swap.endingEpoch = BigInt.fromString(epoch.id);
    // swap.id = nugg.id.concat('-').concat(epoch.id);
    swap.save();
    log.info('__offerCommit start 10', []);

    let _s = epoch._activeSwaps as string[];
    // _s[_s.indexOf(prevswapId)] = swap.id;
    _s.push(swap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    safeSetNuggActiveSwap(nugg, swap);

    let offer = safeLoadOfferHelperNull(swap, user);

    if (offer == null) {
        offer = safeNewOfferHelper(swap, user);
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.user = user.id;
        offer.swap = swap.id;
        offer.claimer = user.id;

        offer.save();
    }

    // offer.eth = getCurrentUserOffer(user, nugg);
    offer.eth = lead;
    offer.ethUsd = wethToUsdc(offer.eth);
    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;
    swap.nextDelegateType = 'Carry';
    swap.leader = user.id;

    // swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('__offerCommit end', []);
}

export function __offerCarry(
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
): void {
    log.info('__offerCarry start', []);

    let offer = safeLoadOfferHelperNull(swap, user);

    if (offer == null) {
        offer = safeNewOfferHelper(swap, user);
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.user = user.id;
        offer.swap = swap.id;
        offer.claimer = user.id;

        offer.save();
    }

    // offer.eth = getCurrentUserOffer(user, nugg);
    offer.eth = lead;
    offer.ethUsd = wethToUsdc(offer.eth);
    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = user.id;

    offer.save();
    swap.save();

    log.info('__offerCarry end', []);
}
