import { log, BigInt, store, Address, Bytes, ethereum } from '@graphprotocol/graph-ts';
import {
    safeGetAndDeleteUserActiveSwap,
    safeLoadActiveSwap,
    safeLoadNugg,
    safeLoadNuggNull,
    safeLoadOfferHelperNull,
    safeLoadProtocol,
    safeLoadUser,
    safeLoadUserNull,
    safeNewNugg,
    safeNewOfferHelper,
    safeNewSwapHelper,
    safeNewUser,
    safeRemoveNuggActiveSwap,
    safeSetUserActiveSwap,
} from './safeload';
import { panicFatal, safeDiv, wethToUsdc } from './uniswap';
import { safeLoadEpoch, safeLoadOfferHelper, safeSetNuggActiveSwap } from './safeload';
import { Nugg, Protocol, Swap, User } from '../generated/schema';
import { cacheDotnugg, updatedStakedSharesAndEth, updateProof } from './dotnugg';
import {
    Claim,
    Mint,
    Offer,
    OfferMint,
    PreMint,
    Rotate,
    Sell,
} from '../generated/NuggftV1/NuggftV1';
import { addr_b, addr_i, b32toBigEndian, bigi, MAX_UINT160, addrs, bigs } from './utils';
import { mask, _mint, _stake, _mspFromStake } from './nuggft';

export function handleEvent__PreMint(event: PreMint): void {
    log.debug('handleEvent__PreMint start', []);
    // let proto = safeLoadProtocol();

    // _transfer(
    //     addrs(proto.nuggftUser),
    //     addr_i(b32toBigEndian(event.params.nuggAgency).bitAnd(mask(160))),
    //     bigi(event.params.tokenId),
    //     event.block,
    // );

    log.debug('handleEvent__PreMint end', []);
}

export function handleEvent__Mint(event: Mint): void {
    const inter = b32toBigEndian(event.params.stake);

    _mint(
        event.params.tokenId,
        b32toBigEndian(event.params.agency),
        event.transaction.hash,
        inter,
        event.params.value,
        event.block,
    );
    _rotate(bigi(event.params.tokenId), event.block, event.params.proof, true);
    _stake(inter);
}

export function handleEvent__OfferMint(event: OfferMint): void {
    const inter = b32toBigEndian(event.params.stake);
    _offer(
        event.transaction.hash.toHexString(),
        bigi(event.params.tokenId),
        event.params.agency,
        event.block,
        inter,
    );
    _rotate(bigi(event.params.tokenId), event.block, event.params.proof, true);
    _stake(inter);
}

export function handleEvent__Offer(event: Offer): void {
    const inter = b32toBigEndian(event.params.stake);

    _offer(
        event.transaction.hash.toHexString(),
        bigi(event.params.tokenId),
        event.params.agency,
        event.block,
        inter,
    );
    _stake(inter);
}

export function handleEvent__Rotate(event: Rotate): void {
    _rotate(bigi(event.params.tokenId), event.block, event.params.proof, false);
}

export function _transfer(
    from: Address,
    to: Address,
    tokenId: BigInt,
    block: ethereum.Block,
): Nugg {
    log.info('handleEvent__Transfer start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(tokenId);

    if (nugg == null) {
        nugg = safeNewNugg(tokenId, proto.nullUser, BigInt.fromString(proto.epoch), block);
    }

    let sender = safeLoadUser(from);

    let receiver = safeLoadUserNull(to);

    // check if we have aready preprocesed this transfer
    /// this should be equal to the !nugg.pendingClaim check
    // if (receiver.id !== nugg.user) {
    if (!nugg.pendingClaim) {
        if (sender.id != proto.nullUser) {
            sender.shares = sender.shares.minus(BigInt.fromString('1'));
        }

        if (receiver.id == proto.nullUser) {
            nugg.burned = true;
        } else {
            receiver.shares = receiver.shares.plus(BigInt.fromString('1'));
        }

        nugg.user = receiver.id;
        nugg.lastUser = sender.id;

        receiver.save();
        nugg.save();
        sender.save();

        // cacheDotnugg(nugg, 0);
    } else {
        // if prepocessed, we mark nugg as
        nugg.pendingClaim = false;
    }

    nugg.lastTransfer = BigInt.fromString(proto.epoch).toI32();

    nugg.save();

    log.info('handleEvent__Transfer end', []);

    return nugg;
}

export function _rotate(
    tokenId: BigInt,
    block: ethereum.Block,
    proof: Bytes,
    increment: boolean,
): void {
    log.info('handleEvent__Rotate start', []);

    let nugg = safeLoadNugg(tokenId);

    nugg = updateProof(nugg, b32toBigEndian(proof), increment, block);

    nugg = cacheDotnugg(nugg, block.number);

    log.info('handleEvent__Rotate end', []);
}

function _offer(
    hash: string,
    tokenId: BigInt,
    _agency: Bytes,
    block: ethereum.Block,
    stake: BigInt,
): void {
    // log.debug('event.params.agency - a - ' + event.params.agency.toHex(), []);

    // transform bytes to Big-Endian
    let agency = b32toBigEndian(_agency);

    // log.debug('agency - a - ' + agency.toHex(), []);
    log.debug('agency - b - ' + agency.toHexString(), []);

    let agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(tokenId);

    let user = safeLoadUserNull(agency__account);

    let swap = safeLoadActiveSwap(nugg);

    safeSetUserActiveSwap(user, nugg, swap);

    nugg.lastPrice = agency__eth;
    nugg.lastOfferBlock = block.number;
    nugg.lastOfferEpoch = bigs(proto.epoch);

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

export function handleEvent__Sell(event: Sell): void {
    _sell(event, b32toBigEndian(event.params.agency), event.params.tokenId);
}

export function _sell(event: ethereum.Event, agency: BigInt, tokenId: i32): void {
    log.info('handleEvent__Sell start', []);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let nugg = safeLoadNugg(bigi(tokenId));

    if (nugg.activeSwap !== null) {
        let swap = safeLoadActiveSwap(nugg);
        if (swap.endingEpoch !== null) {
            panicFatal('handleEvent__Sell: nugg.activeSwap MUST BE NULL if seller is not owner');
        }
        swap.bottom = agency__eth;
        swap.bottomUsd = wethToUsdc(agency__eth);
        swap.top = agency__eth;
        swap.topUsd = wethToUsdc(agency__eth);
        swap.save();

        let user = safeLoadUser(Address.fromString(swap.owner));

        let offer = safeLoadOfferHelper(swap, user);

        offer.eth = agency__eth;
        offer.ethUsd = wethToUsdc(agency__eth);
        offer.txhash = event.transaction.hash.toHexString();
        offer.incrementX64 = BigInt.fromString('0');
        offer.save();
        log.info('handleEvent__Sell end', []);

        return;
    }

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    swap.top = agency__eth;
    swap.topUsd = wethToUsdc(agency__eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.nextDelegateType = 'Commit';
    swap.bottom = agency__eth;
    swap.bottomUsd = wethToUsdc(agency__eth);
    swap.eth = bigi(0);
    swap.numOffers = 0;

    swap.ethUsd = bigi(0);

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
    offer.incrementX64 = BigInt.fromString('0');

    offer.txhash = event.transaction.hash.toHexString();

    offer.save();

    // updatedStakedSharesAndEth();

    log.info('handleEvent__Sell end', []);
}

export function handleEvent__Claim(event: Claim): void {
    log.info('handleEvent__Claim start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(bigi(event.params.tokenId));

    let user = safeLoadUser(event.params.account);

    let swap = safeGetAndDeleteUserActiveSwap(user, nugg);

    let offer = safeLoadOfferHelper(swap, user);

    offer.claimed = true;
    offer.claimer = null;
    offer.save();

    if (swap.leader == user.id) {
        if (swap.owner == user.id) {
            safeRemoveNuggActiveSwap(nugg);
            swap.canceledEpoch = BigInt.fromString(proto.epoch);
            swap.save();
        }
    }

    // updatedStakedSharesAndEth();

    log.info('handleEvent__Claim end', []);
}

export const calculateMsp = (shares: BigInt, eth: BigInt): BigInt => {
    const ethPerShare = safeDiv(
        eth.times(BigInt.fromI64(10).pow(18)),

        shares,
    );
    const protocolFee = ethPerShare.div(BigInt.fromString('1'));
    const premium = ethPerShare.times(shares).div(BigInt.fromString('2000'));
    const final = ethPerShare.plus(protocolFee).plus(premium);

    return final.div(BigInt.fromI64(10).pow(18));
};

export function __offerMint(
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
    swap.bottom = _mspFromStake(stake);
    swap.bottomUsd = wethToUsdc(swap.bottom);
    // swap.top = getCurrentUserOffer(user, nugg);
    swap.top = lead;
    swap.topUsd = wethToUsdc(swap.top);
    swap.leader = user.id;
    swap.nextDelegateType = 'Carry';
    swap.numOffers = 1;

    swap.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.txhash = hash;

    offer.claimed = false;
    offer.eth = swap.top;
    offer.ethUsd = swap.topUsd;
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.claimer = user.id;
    offer.incrementX64 = makeIncrementX64(swap.top, swap.bottom);
    offer.save();

    log.info('__offerMint end', []);
}

export function __offerCommit(
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

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));
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

    let _s = epoch._activeSwaps as string[];
    // _s[_s.indexOf(prevswapId)] = swap.id;
    _s.push(swap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    safeSetNuggActiveSwap(nugg, swap);
    // makeIncrementX64 [lead:2760000000000000,last:2404156500000000], data_source: NuggftV1
    // 2760000000000000
    // 2404156500000000
    let offer = safeLoadOfferHelperNull(swap, user, hash);
    if (offer.eth.equals(bigi(0))) {
        swap.numOffers = swap.numOffers + 1;
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

export function makeIncrementX64(lead: BigInt, last: BigInt): BigInt {
    log.info('makeIncrementX64 [lead:{},last:{}]', [lead.toString(), last.toString()]);

    if (last.isZero()) return last;

    const a = lead.minus(last);
    const b = a.times(mask(64));
    return b.div(last);
}

export function __offerCarry(
    hash: string,
    proto: Protocol,
    user: User,
    nugg: Nugg,
    swap: Swap,
    lead: BigInt,
): void {
    log.info('__offerCarry start', []);

    let offer = safeLoadOfferHelperNull(swap, user, hash);

    if (offer.eth.equals(bigi(0))) {
        swap.numOffers = swap.numOffers + 1;
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
