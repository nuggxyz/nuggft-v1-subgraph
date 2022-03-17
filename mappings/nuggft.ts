import { Address, log, Bytes } from '@graphprotocol/graph-ts';
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

import { safeNewUser, safeLoadNugg, safeLoadUserNull, safeLoadProtocol } from './safeload';
import { Epoch, Protocol, User } from '../generated/schema';
import { cacheDotnugg, getDotnuggUserId, getItemURIs } from './dotnugg';
import { handleEvent__Liquidate, handleEvent__Loan, handleEvent__Rebalance } from './loan';
import { handleEvent__OfferItem, handleEvent__ClaimItem, handleEvent__SellItem } from './itemswap';
import {
    handleEvent__Claim,
    handleEvent__Mint,
    handleEvent__Offer,
    handleEvent__OfferMint,
    handleEvent__Rotate,
    handleEvent__Sell,
} from './swap';
import { b32toBigEndian, bigb, bigi } from './utils';
import { handleEvent__TransferItem } from './swap';

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
    handleEvent__TransferItem,
};

export let ONE = BigInt.fromString('1');

export function mask(bits: number): BigInt {
    return BigInt.fromString('1')
        .leftShift(bits as u8)
        .minus(BigInt.fromString('1'));
}

function handleEvent__Genesis(event: Genesis): void {
    log.info('handleEvent__Genesis start ', []);

    let proto = new Protocol('0x42069');

    proto.init = false;
    proto.lastBlock = event.block.number;
    proto.nuggsNotCached = [];
    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');

    proto.genesisBlock = event.params.blocknum;
    proto.interval = event.params.interval;

    proto.xnuggTotalSupply = BigInt.fromString('0');
    proto.xnuggTotalEth = BigInt.fromString('0');
    proto.nuggftTotalEth = BigInt.fromString('0');

    proto.tvlEth = BigInt.fromString('0');
    proto.tvlUsd = BigInt.fromString('0');

    proto.priceUsdcWeth = BigInt.fromString('0');
    proto.priceWethXnugg = BigInt.fromString('0');
    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');
    proto.totalNuggs = BigInt.fromString('0');
    proto.totalItems = BigInt.fromString('0');
    proto.totalItemSwaps = BigInt.fromString('0');

    proto.nuggftStakedEthPerShare = BigInt.fromString('0');
    proto.nuggftStakedEth = BigInt.fromString('0');
    proto.nuggftStakedUsd = BigInt.fromString('0');
    proto.nuggftStakedUsdPerShare = BigInt.fromString('0');

    proto.nuggftStakedShares = BigInt.fromString('0');

    let epoch = new Epoch('NOTLIVE');
    epoch.startblock = BigInt.fromString('0');
    epoch.endblock = BigInt.fromString('0');
    epoch.status = 'PENDING';
    epoch._activeItemSwaps = [];
    epoch._activeSwaps = [];
    epoch._upcomingActiveItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.xnugg = BigInt.fromString('0');
    nil.ethin = BigInt.fromString('0');
    nil.ethout = BigInt.fromString('0');
    nil.shares = BigInt.fromString('0');
    nil.save();

    proto.epoch = epoch.id;
    proto.xnuggUser = nil.id;
    proto.nuggftUser = nil.id;
    proto.nullUser = nil.id;

    proto.dotnuggV1Processor = getDotnuggUserId(event.address).toHexString();

    proto.save();

    let nuggft = safeNewUser(event.address);

    nuggft.xnugg = BigInt.fromString('0');
    nuggft.ethin = BigInt.fromString('0');
    nuggft.ethout = BigInt.fromString('0');
    nuggft.shares = BigInt.fromString('0');

    //     nuggft.nuggs = [];
    //     nuggft.offers = [];
    nuggft.save();

    proto.nuggftUser = nuggft.id;

    proto.save();

    getItemURIs(event.address);

    onEpochGenesis(
        event.block,
        event.params.blocknum,
        event.params.interval,
        bigi(event.params.offset),
    );

    log.info('handleEvent__Genesis end', [proto.epoch]);
}

function handleEvent__Stake(event: Stake): void {
    _stake(event.params.cache);
}

export function _stake(cache: Bytes): void {
    log.info('handleEvent__Stake start', []);

    let agency = b32toBigEndian(cache);

    // let protocolEth = event.params.stake.bitAnd(mask(96));
    let eth = agency.rightShift(96).bitAnd(mask(96));
    let shares = agency.rightShift(192);

    let proto = safeLoadProtocol();

    proto.nuggftStakedEth = eth;
    proto.nuggftStakedShares = shares;
    proto.nuggftStakedEthPerShare = safeDiv(eth, shares);

    proto.save();

    log.info('handleEvent__Stake end', []);
}

function handleEvent__Transfer(event: Transfer): void {
    log.info('handleEvent__Transfer start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(event.params._tokenId);

    if (nugg == null) {
        nugg = safeNewNugg(
            event.params._tokenId,
            proto.nullUser,
            event.block,
            BigInt.fromString(proto.epoch),
        );
    }

    let sender = safeLoadUser(event.params._from);

    let receiver = safeLoadUserNull(event.params._to);

    if (receiver == null) {
        receiver = safeNewUser(event.params._to);
        receiver.xnugg = BigInt.fromString('0');
        receiver.ethin = BigInt.fromString('0');
        receiver.ethout = BigInt.fromString('0');
        receiver.shares = BigInt.fromString('0');
        receiver.save();
    }

    if (sender.id != proto.nullUser) {
        sender.shares = sender.shares.minus(BigInt.fromString('1'));
    }

    if (receiver.id == proto.nullUser) {
        nugg.burned = true;
    } else {
        receiver.shares = receiver.shares.plus(BigInt.fromString('1'));
    }

    // if this is a mint
    // if (sender.id == proto.nullUser && receiver.id != proto.nuggftUser) {
    //     // cacheDotnugg(nugg);

    //     let swap = safeNewSwapHelper(nugg);

    //     nugg.numSwaps = BigInt.fromString('1');

    //     nugg.save();

    //     swap.eth = BigInt.fromString('0'); // handled by Mint or Offer
    //     swap.ethUsd = BigInt.fromString('0');
    //     swap.owner = proto.nullUser;
    //     swap.leader = receiver.id;
    //     swap.nugg = nugg.id;
    //     swap.endingEpoch = BigInt.fromString(proto.epoch);
    //     swap.epoch = proto.epoch;
    //     swap.startingEpoch = proto.epoch;
    //     swap.nextDelegateType = 'None';
    //     swap.save();

    //     // safeSetNuggActiveSwap(nugg, swap);

    //     let offer = safeNewOfferHelper(swap, receiver);

    //     offer.claimed = true;
    //     offer.eth = BigInt.fromString('0'); // handled by Mint or Offer
    //     offer.ethUsd = BigInt.fromString('0');
    //     offer.owner = false;
    //     offer.user = receiver.id;
    //     offer.swap = swap.id;

    //     offer.save();

    //     updateProof(nugg, );
    // }

    nugg.user = receiver.id;
    nugg.lastUser = sender.id;
    nugg.lastTransfer = BigInt.fromString(proto.epoch).toI32();

    receiver.save();
    nugg.save();
    sender.save();

    cacheDotnugg(nugg, event.block.number.toI32());

    log.info('handleEvent__Transfer end', []);
}

export function _mint(event: Mint): void {
    log.info('handleEvent__Mint start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(event.params.tokenId);

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    nugg.numSwaps = BigInt.fromString('1');

    nugg.save();

    swap.eth = BigInt.fromString('0'); // handled by Mint or Offer
    swap.ethUsd = BigInt.fromString('0');
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.endingEpoch = BigInt.fromString(proto.epoch);
    swap.epoch = proto.epoch;
    swap.startingEpoch = proto.epoch;
    swap.nextDelegateType = 'None';
    swap.save();

    let voffer = safeNewOfferHelper(swap, user);

    voffer.claimed = true;
    voffer.eth = BigInt.fromString('0'); // handled by Mint or Offer
    voffer.ethUsd = BigInt.fromString('0');
    voffer.owner = false;
    voffer.user = user.id;
    voffer.swap = swap.id;

    voffer.save();

    let offer = safeLoadOfferHelper(swap, user);
    log.info('B', []);

    swap.eth = event.params.value;
    swap.ethUsd = event.params.value;
    log.info('C', []);

    offer.eth = swap.eth;
    offer.ethUsd = swap.eth;
    log.info('D', []);

    swap.save();
    offer.save();

    log.info('handleEvent__Mint end', []);
}

// 6286335;
// 6286336;
