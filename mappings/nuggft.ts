import { Address, log } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { Genesis, Mint, Stake, Transfer } from '../generated/local/NuggftV1/NuggftV1';
import { safeDiv, wethToUsdc } from './uniswap';
import {
    safeLoadNuggNull,
    safeLoadOfferHelper,
    safeLoadUser,
    safeNewNugg,
    safeNewOfferHelper,
    safeNewSwapHelper,
    unsafeLoadSwap,
} from './safeload';
import { handleBlock__every, onEpochGenesis } from './epoch';

import { safeNewUser, safeLoadNugg, safeLoadUserNull, safeLoadProtocol } from './safeload';
import { Epoch, Protocol, User } from '../generated/local/schema';
import { cacheDotnugg, getDotnuggUserId, updatedStakedSharesAndEth, updateProof } from './dotnugg';
import { DotnuggV1ConfigUpdated } from '../generated/local/NuggftV1/NuggftV1';
import { handleEvent__Liquidate, handleEvent__Loan, handleEvent__Rebalance } from './loan';
import { handleEvent__OfferItem, handleEvent__ClaimItem, handleEvent__SellItem } from './itemswap';
import { handleEvent__Claim, handleEvent__Offer, handleEvent__Sell } from './swap';

export {
    handleEvent__Transfer,
    handleEvent__Genesis,
    handleBlock__every,
    handleEvent__DotnuggV1ConfigUpdated,
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
};

export let ONE = BigInt.fromString('1');

function mask(bits: number): BigInt {
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

    // let xnugg = safeNewUser(event.address);
    // xnugg.xnugg = BigInt.fromString('0');
    // xnugg.save();

    // proto.xnuggUser = xnugg.id;

    // proto.save();

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

    onEpochGenesis(event.block, event.block.number, BigInt.fromString('69'));

    log.info('handleEvent__Genesis end', [proto.epoch]);
}

function handleEvent__Stake(event: Stake): void {
    log.info('handleEvent__Stake start', []);

    // let protocolEth = event.params.stake.bitAnd(mask(96));
    let eth = event.params.stake.rightShift(96).bitAnd(mask(96));
    let shares = event.params.stake.rightShift(192);

    let proto = safeLoadProtocol('0x42069');

    proto.nuggftStakedEth = eth;
    proto.nuggftStakedShares = shares;
    proto.nuggftStakedEthPerShare = safeDiv(eth, shares);

    proto.save();

    log.info('handleEvent__Stake end', []);
}

function handleEvent__Transfer(event: Transfer): void {
    log.info('handleEvent__Transfer start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNuggNull(event.params._tokenId);

    if (nugg == null) {
        nugg = safeNewNugg(event.params._tokenId, proto.nullUser);
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
    if (sender.id == proto.nullUser && receiver.id != proto.nuggftUser) {
        cacheDotnugg(nugg);

        let swap = safeNewSwapHelper(nugg);

        nugg.numSwaps = BigInt.fromString('1');

        nugg.save();

        swap.eth = BigInt.fromString('0'); // handled by Mint or Offer
        swap.ethUsd = wethToUsdc(swap.eth);
        swap.owner = proto.nullUser;
        swap.leader = receiver.id;
        swap.nugg = nugg.id;
        swap.endingEpoch = BigInt.fromString(proto.epoch);
        swap.epoch = proto.epoch;
        swap.startingEpoch = proto.epoch;
        swap.nextDelegateType = 'None';
        swap.save();

        // safeSetNuggActiveSwap(nugg, swap);

        let offer = safeNewOfferHelper(swap, receiver);

        offer.claimed = true;
        offer.eth = BigInt.fromString('0'); // handled by Mint or Offer
        offer.ethUsd = wethToUsdc(offer.eth);
        offer.owner = false;
        offer.user = receiver.id;
        offer.swap = swap.id;

        offer.save();

        updateProof(nugg);
    }

    nugg.user = receiver.id;
    nugg.lastUser = sender.id;

    receiver.save();
    nugg.save();
    sender.save();

    updatedStakedSharesAndEth();

    cacheDotnugg(nugg);

    log.info('handleEvent__Transfer end', []);
}

function handleEvent__Mint(event: Mint): void {
    log.info('handleEvent__Mint start', []);

    let nugg = safeLoadNugg(event.params.tokenId);
    let swap = unsafeLoadSwap(nugg.id + '-0');

    let user = safeLoadUser(Address.fromString(nugg.user));
    let offer = safeLoadOfferHelper(swap, user);

    swap.eth = event.params.value;
    swap.ethUsd = wethToUsdc(swap.eth);

    offer.eth = swap.eth;
    offer.ethUsd = swap.ethUsd;

    swap.save();
    offer.save();

    log.info('handleEvent__Mint end', []);
}

function handleEvent__DotnuggV1ConfigUpdated(event: DotnuggV1ConfigUpdated): void {
    log.info('handleEvent__DotnuggV1ConfigUpdated start', []);

    let nugg = safeLoadNugg(event.params.artifactId);

    cacheDotnugg(nugg);

    log.info('handleEvent__DotnuggV1ConfigUpdated end', []);
}
