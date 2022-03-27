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

import {
    safeNewUser,
    safeLoadNugg,
    safeLoadUserNull,
    safeLoadProtocol,
    safeLoadEpoch,
} from './safeload';
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
    proto.totalItemSwaps = bigi(0);

    proto.nuggftStakedEthPerShare = bigi(0);
    proto.nuggftStakedEth = bigi(0);
    proto.nuggftStakedUsd = bigi(0);
    proto.nuggftStakedUsdPerShare = bigi(0);

    proto.nuggftStakedShares = bigi(0);

    let epoch = new Epoch('NOTLIVE');
    epoch.startblock = bigi(0);
    epoch.endblock = bigi(0);
    epoch.status = 'PENDING';
    epoch._activeItemSwaps = [];
    epoch._activeSwaps = [];
    epoch._upcomingActiveItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.shares = bigi(0);
    nil.save();

    proto.epoch = epoch.id;
    proto.nuggftUser = nil.id;
    proto.nullUser = nil.id;
    proto.nuggsPendingRemoval = [];
    proto.dotnuggV1Processor = getDotnuggUserId(event.address).toHexString();

    proto.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let nuggft = safeNewUser(event.address);
    nuggft.shares = bigi(0);
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
    _transfer(event.params._from, event.params._to, event.params._tokenId);
}

export function _mint(event: Mint): void {
    log.info('handleEvent__Mint start', []);

    let proto = safeLoadProtocol();

    let nugg = safeLoadNuggNull(event.params.tokenId);

    if (nugg === null) {
        let agency = b32toBigEndian(event.params.agency);
        nugg = safeNewNugg(
            event.params.tokenId,
            agency.bitAnd(mask(160)).toHexString(),
            bigs(proto.epoch),
        );
    }

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    nugg.numSwaps = BigInt.fromString('1');

    nugg.save();

    swap.eth = bigi(0); // handled by Mint or Offer
    swap.ethUsd = bigi(0);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.endingEpoch = BigInt.fromString(proto.epoch);
    swap.epoch = proto.epoch;
    swap.startingEpoch = proto.epoch;
    swap.nextDelegateType = 'None';
    swap.bottom = bigi(0);
    swap.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = true;
    // offer.eth = bigi(0); // handled by Mint or Offer
    // offer.ethUsd = bigi(0);
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;
    offer.txhash = event.transaction.hash.toHexString();
    // offer.save();

    // let offer = safeLoadOfferHelper(swap, user);
    swap.eth = event.params.value;
    swap.ethUsd = event.params.value;
    offer.eth = event.params.value;
    offer.ethUsd = event.params.value;

    swap.save();
    offer.save();

    log.info('handleEvent__Mint end', []);
}

// 6286335;
// 6286336;
