import { Address, log, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { Genesis, Mint, Stake, Transfer } from '../generated/NuggftV1/NuggftV1';
import { safeDiv, wethToUsdc } from './uniswap';
import {
    safeLoadNuggNull,
    safeLoadOfferHelper,
    safeLoadUser,
    safeNewNugg,
    safeNewOfferHelper,
    safeNewSwapHelper,
} from './safeload';
import { handleBlock__every, onEpochGenesis } from './epoch';

import {
    safeNewUser,
    safeLoadNugg,
    safeLoadUserNull,
    safeLoadProtocol,
    safeLoadEpoch,
} from './safeload';
import { Epoch, NuggSnapshot, Protocol, User } from '../generated/schema';
import { cacheDotnugg, getDotnuggUserId, getItemURIs, getPremints } from './dotnugg';
import { handleEvent__Liquidate, handleEvent__Loan, handleEvent__Rebalance } from './loan';
import { handleEvent__OfferItem, handleEvent__ClaimItem, handleEvent__SellItem } from './itemswap';
import {
    handleEvent__Claim,
    handleEvent__Mint,
    handleEvent__Offer,
    handleEvent__OfferMint,
    handleEvent__PreMint,
    handleEvent__Rotate,
    handleEvent__Sell,
    makeIncrementX64,
    _transfer,
} from './swap';
import { b32toBigEndian, bigb, bigi, bigs } from './utils';

export {
    handleEvent__Transfer,
    handleEvent__Genesis,
    handleBlock__every,
    handleEvent__Rotate,
    handleEvent__Mint,
    handleEvent__Loan,
    handleEvent__Liquidate,
    handleEvent__Rebalance,
    handleEvent__Stake,
    handleEvent__OfferItem,
    handleEvent__ClaimItem,
    handleEvent__SellItem,
    handleEvent__Offer,
    handleEvent__Sell,
    handleEvent__Claim,
    handleEvent__OfferMint,
    handleEvent__PreMint,
};

export let ONE = BigInt.fromString('1');

export function mask(bits: number): BigInt {
    return BigInt.fromString('1')
        .leftShift(bits as u8)
        .minus(BigInt.fromString('1'));
}

function handleEvent__Genesis(event: Genesis): void {
    log.info('BRUH', []);
    log.info(
        `handleEvent__Genesis start
    [blocknum:{},dotnugg:{},early:{},interval:{},intervalOffset:{},offset:{},stake:{},xnuggftv1:{}]`,
        [
            event.params.blocknum.toString(),
            event.params.dotnugg.toHex(),
            event.params.early.toString(),
            event.params.interval.toString(),
            event.params.intervalOffset.toString(),
            event.params.offset.toString(),
            event.params.stake.toHexString(),
            event.params.xnuggftv1.toHexString(),
        ],
    );

    let proto = new Protocol('0x42069');

    proto.init = false;
    proto.nuggsNotCached = [];
    proto.totalSwaps = bigi(0);
    proto.totalUsers = bigi(0);

    proto.genesisBlock = event.params.blocknum;
    proto.interval = event.params.interval;

    proto.nuggftTotalEth = bigi(0);

    proto.priceUsdcWeth = bigi(0);
    proto.totalSwaps = bigi(0);
    proto.totalUsers = bigi(0);
    proto.totalNuggs = bigi(0);
    proto.totalItems = bigi(0);
    proto.totalLoans = bigi(0);

    proto.totalItemSwaps = bigi(0);
    proto.epochOffset = bigi(event.params.offset);
    proto.nuggftStakedEthPerShare = bigi(0);
    proto.nuggftStakedEth = bigi(0);
    proto.nuggftStakedUsd = bigi(0);
    proto.nuggftStakedUsdPerShare = bigi(0);
    proto.featureTotals = [0, 0, 0, 0, 0, 0, 0, 0];
    proto.nuggftStakedShares = bigi(0);

    let epoch = new Epoch('NOTLIVE');
    epoch.startblock = bigi(0);
    epoch.endblock = bigi(0);
    epoch.status = 'PENDING';
    epoch.idnum = bigi(0);
    epoch._activeItemSwaps = [];
    epoch._activeSwaps = [];
    epoch._upcomingActiveItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.shares = bigi(0);
    nil.save();
    proto.nextEpoch = epoch.id;
    proto.lastEpoch = epoch.id;
    proto.epoch = epoch.id;
    proto.dotnuggv1 = nil.id;
    proto.xnuggftv1 = nil.id;

    proto.nuggftUser = nil.id;
    proto.nuggftUser = nil.id;

    proto.nullUser = nil.id;
    proto.nuggsPendingRemoval = [];
    proto.dotnuggV1Processor = getDotnuggUserId(event.address).toHexString();
    proto.nuggsNotCached = [];

    proto.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let xnuggftv1 = safeNewUser(event.params.xnuggftv1);
    xnuggftv1.shares = bigi(0);
    xnuggftv1.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let dotnuggv1 = safeNewUser(event.params.dotnugg);
    dotnuggv1.shares = bigi(0);
    dotnuggv1.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let nuggft = safeNewUser(event.address);
    nuggft.shares = bigi(0);
    nuggft.save();

    proto.nuggftUser = nuggft.id;
    proto.dotnuggv1 = dotnuggv1.id;
    // proto.xnuggftv1 = xnuggftv1.id;

    proto.save();

    getItemURIs(event.params.xnuggftv1);

    onEpochGenesis(
        event.block,
        event.params.blocknum,
        event.params.interval,
        bigi(event.params.offset),
    );

    getPremints(event, event.address, nuggft, event.block);

    _stake(event.params.stake);

    log.info('handleEvent__Genesis end {}', [proto.epoch]);
}

function handleEvent__Stake(event: Stake): void {
    _stake(event.params.stake);
}

export function _epsFromStake(cache: BigInt): BigInt {
    let eth = cache.rightShift(96).bitAnd(mask(96));
    let shares = cache.rightShift(192);

    return safeDiv(eth, shares);
}

export const _mspFromStake = (cache: BigInt): BigInt => {
    let eth = cache.rightShift(96).bitAnd(mask(96));
    let shares = cache.rightShift(192);

    const ethPerShare = safeDiv(eth.times(BigInt.fromI64(10).pow(18)), shares);
    const protocolFee = ethPerShare.div(BigInt.fromString('1'));
    const premium = ethPerShare.times(shares).div(BigInt.fromString('2000'));
    const final = ethPerShare.plus(protocolFee).plus(premium);

    return final.div(BigInt.fromI64(10).pow(18));
};

export function _stake(cache: Bytes): void {
    let agency = b32toBigEndian(cache);

    // let protocolEth = event.params.stake.bitAnd(mask(96));
    let eth = agency.rightShift(96).bitAnd(mask(96));
    let shares = agency.rightShift(192);

    log.info('handleEvent__Stake start [Bytes:{}] [Hex:{}] [eth:{}] [shares:{}]', [
        cache.toHexString(),
        agency.toHexString(),
        eth.toString(),
        shares.toString(),
    ]);

    let proto = safeLoadProtocol();

    proto.nuggftStakedEth = eth;
    proto.nuggftStakedShares = shares;
    proto.nuggftStakedEthPerShare = safeDiv(eth, shares);

    proto.save();

    log.info('handleEvent__Stake end', []);
}

function handleEvent__Transfer(event: Transfer): void {
    _transfer(event.params._from, event.params._to, event.params._tokenId, event.block);
}

export function _mint(
    tokenId: i32,
    agency: BigInt,
    hash: Bytes,
    value: BigInt,
    stake: BigInt,
    block: ethereum.Block,
): void {
    log.debug('handleEvent__Mint start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(bigi(tokenId));

    if (nugg === null) {
        nugg = safeNewNugg(
            bigi(tokenId),
            agency.bitAnd(mask(160)).toHexString(),
            bigs(proto.epoch),
            block,
        );
    }

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    nugg.numSwaps = BigInt.fromString('1');

    nugg.save();
    swap.eth = bigi(0); // handled by Mint or Offer
    swap.ethUsd = bigi(0); // handled by Mint or Offer

    swap.top = bigi(0); // handled by Mint or Offer
    swap.topUsd = bigi(0);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.endingEpoch = BigInt.fromString(proto.epoch);
    swap.epoch = proto.epoch;
    swap.startingEpoch = proto.epoch;
    swap.nextDelegateType = 'None';

    const msp = _mspFromStake(stake);
    swap.bottom = msp;
    swap.bottomUsd = msp;
    swap.startUnix = block.timestamp;

    swap.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = true;
    // offer.eth = bigi(0); // handled by Mint or Offer
    // offer.ethUsd = bigi(0);
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.txhash = hash.toHexString();
    // offer.save();

    // let offer = safeLoadOfferHelper(swap, user);
    swap.top = value;
    swap.topUsd = value;
    offer.eth = value;
    offer.ethUsd = value;
    offer.incrementX64 = makeIncrementX64(value, msp);

    swap.save();
    offer.save();

    log.debug('handleEvent__Mint end', []);
}

// 6286335;
// 6286336;
// {
//     offers (first:1000, where:{incrementX64_not:0}){
//       id
//       incrementX64
//     }
//   }
