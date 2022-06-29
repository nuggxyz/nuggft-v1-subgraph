import { Bytes, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { log } from 'matchstick-as';

import { Protocol, User, Nugg, Swap } from '../../generated/schema';
import { _mspFromStake } from '../onchain';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadUserNull,
    safeLoadActiveSwap,
    safeSetUserActiveSwap,
    safeNewOfferHelper,
    safeLoadEpoch,
    safeSetNuggActiveSwap,
    safeLoadOfferHelperNull,
} from '../safeload';
import { wethToUsdc } from '../uniswap';
import { b32toBigEndian, addr_i, MAX_UINT160, bigi, bigs, makeIncrementX64, mask } from '../utils';

export function _offer(
    hash: string,
    tokenId: BigInt,
    _agency: Bytes,
    block: ethereum.Block,
    stake: BigInt,
): void {
    // log.debug('event.params.agency - a - ' + event.params.agency.toHex(), []);

    // transform bytes to Big-Endian
    const agency = b32toBigEndian(_agency);

    // log.debug('agency - a - ' + agency.toHex(), []);
    log.debug(`agency - b - ${agency.toHexString()}`, []);

    const agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    const proto = safeLoadProtocol();

    const nugg = safeLoadNugg(tokenId);

    const user = safeLoadUserNull(agency__account);

    const swap = safeLoadActiveSwap(nugg);

    safeSetUserActiveSwap(user, nugg, swap);

    nugg.lastPrice = agency__eth;
    nugg.lastOfferBlock = block.number;
    nugg.lastOfferEpoch = bigs(proto.epoch);
    nugg.live = true;
    nugg.save();

    if (swap.nextDelegateType == 'Commit') {
        __offerCommit(hash, proto, user, nugg, swap, agency__eth, stake, block);
    } else if (swap.nextDelegateType == 'Carry') {
        __offerCarry(hash, proto, user, nugg, swap, agency__eth);
    } else if (swap.nextDelegateType == 'Mint') {
        __offerMint(hash, proto, user, nugg, swap, agency__eth, stake);
    } else {
        log.error('swap.nextDelegateType should be Commit or Offer', [swap.nextDelegateType]);
        log.critical('', []);
    }

    // updatedStakedSharesAndEth();
}

function __offerMint(
    hash: string,
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
    stake: BigInt,
): void {
    log.info('__offerMint start', []);

    // let proto = safeLoadProtocol();
    log.info('__offerMint start 1', []);

    log.info('__offerMint start 2', []);

    if (proto.epoch != nugg.id) {
        log.info('__offerMint start 3', []);

        log.critical(`__offerMint: INVALID EPOCH: ${proto.epoch} != ${nugg.id.toString()}`, []);
    }

    proto.nuggftStakedShares = proto.nuggftStakedShares.plus(BigInt.fromString('1'));
    proto.save();
    swap.bottom = _mspFromStake(stake);
    swap.bottomUsd = wethToUsdc(swap.bottom);
    // swap.top = getCurrentUserOffer(user, nugg);
    swap.top = lead;
    swap.topUsd = wethToUsdc(swap.top);
    swap.leader = user.id;
    swap.nextDelegateType = 'Carry';
    swap.numOffers = 1;

    swap.save();

    const offer = safeNewOfferHelper(swap, user);

    offer.txhash = hash;

    offer.claimed = false;
    offer.eth = swap.top;
    offer.ethUsd = swap.topUsd;
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.claimer = user.id;
    offer.incrementX64 = makeIncrementX64(swap.top, swap.bottom);
    offer.epoch = proto.epoch;

    offer.save();

    log.info('__offerMint end', []);
}

function __offerCommit(
    hash: string,
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
    stake: BigInt,
    block: ethereum.Block,
): void {
    log.info('__offerCommit start', []);

    if (swap.epoch != '' && swap.epoch != null)
        log.critical('__offerCommit: SWAP.epochId MUST BE NULL', []);

    const epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));
    if (swap.bottom.equals(bigi(0))) {
        swap.bottom = _mspFromStake(stake);
        swap.bottomUsd = wethToUsdc(swap.bottom);
        swap.top = swap.bottom;
        swap.topUsd = swap.bottomUsd;
    }
    swap.epoch = epoch.id;
    swap.startingEpoch = proto.epoch;
    swap.endingEpoch = BigInt.fromString(epoch.id);
    // swap.id = nugg.id.concat('-').concat(epoch.id);
    swap.save();
    log.info('__offerCommit start 10', []);

    const _s = epoch._activeSwaps as string[];
    // _s[_s.indexOf(prevswapId)] = swap.id;
    _s.push(swap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    safeSetNuggActiveSwap(nugg, swap);
    // makeIncrementX64 [lead:2760000000000000,last:2404156500000000], data_source: NuggftV1
    // 2760000000000000
    // 2404156500000000
    const offer = safeLoadOfferHelperNull(swap, user, hash);
    if (offer.eth.equals(bigi(0))) {
        swap.numOffers += 1;
    }
    offer.txhash = hash;
    offer.incrementX64 = makeIncrementX64(lead, swap.top);

    offer.eth = lead;
    offer.ethUsd = wethToUsdc(offer.eth);
    swap.top = offer.eth;
    swap.topUsd = offer.ethUsd;
    swap.nextDelegateType = 'Carry';
    swap.leader = user.id;
    swap.startUnix = block.timestamp;
    swap.commitBlock = block.number;

    offer.save();
    swap.save();

    log.info('__offerCommit end', []);
}

function __offerCarry(
    hash: string,
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
): void {
    log.info('__offerCarry start', []);

    const offer = safeLoadOfferHelperNull(swap, user, hash);

    if (offer.eth.equals(bigi(0))) {
        swap.numOffers += 1;
    }

    offer.txhash = hash;

    // offer.eth = getCurrentUserOffer(user, nugg);
    offer.eth = lead;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.incrementX64 = makeIncrementX64(lead, swap.top);

    swap.top = offer.eth;
    swap.topUsd = offer.ethUsd;

    swap.leader = user.id;

    offer.save();
    swap.save();

    log.info('__offerCarry end', []);
}
