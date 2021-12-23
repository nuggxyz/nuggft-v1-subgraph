import { Address, ethereum, log } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { SetProof, PopItem, PushItem, Genesis, StakeEth, UnStakeEth, Transfer } from '../generated/local/NuggFT/NuggFT';
import { store } from '@graphprotocol/graph-ts';
import { invariant, safeDiv, wethToUsdc } from './uniswap';
import { safeLoadNuggNull, safeLoadUser, safeNewNugg } from './safeload';
import { onEpochGenesis } from './epoch';
import { handleDelegateMint, handleSwapClaim, handleDelegateOffer, handleSwapStart, handleDelegateCommit } from './swap';
import { handleSwapClaimItem, handleDelegateOfferItem, handleSwapItemStart, handleDelegateCommitItem } from './itemswap';

import { handlePayoff, handleTakeLoan, handleRebalance } from './loan';

import {
    safeNewUser,
    safeLoadNugg,
    safeLoadUserNull,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadProtocol,
    safeLoadNuggItemHelperNull,
    safeNewNuggItem,
    safeNewItem,
    safeLoadItemNull,
} from './safeload';
import { Epoch, Nugg, Protocol, User } from '../generated/local/schema';
import { handleBlock } from './epoch';
export {
    handleDelegateMint,
    handleDelegateCommit,
    handleDelegateCommitItem,
    handleTransfer,
    handleSwapClaim,
    handleSwapClaimItem,
    handleDelegateOffer,
    handleDelegateOfferItem,
    handleSwapStart,
    handleSwapItemStart,
    handlePopItem,
    handleSetProof,
    handlePushItem,
    handleStakeEth,
    handleUnStakeEth,
    handleBlock,
    handlePayoff,
    handleTakeLoan,
    handleRebalance,
};

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesisNuggFT start ', []);

    let proto = new Protocol('0x42069');

    proto.init = false;
    proto.lastBlock = event.block.number;

    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');

    proto.genesisBlock = BigInt.fromString('0');
    proto.interval = BigInt.fromString('0');

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

    log.info('handleGenesisNuggFT end', [proto.epoch]);
}

function updateStakedEthPerShare(proto: Protocol): void {
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.nuggftStakedUsdPerShare = wethToUsdc(proto.nuggftStakedEthPerShare);

    proto.save();
}

function handleStakeEth(event: StakeEth): void {
    log.info('handleStake start', []);

    let proto = safeLoadProtocol('0x42069');

    proto.nuggftStakedEth = proto.nuggftStakedEth.plus(event.params.stake);
    proto.nuggftStakedUsd = wethToUsdc(proto.nuggftStakedEth);
    proto.save();

    updateStakedEthPerShare(proto);
    log.info('handleStake end', []);
}

function handleUnStakeEth(event: UnStakeEth): void {
    log.info('handleUnStake start', []);

    let proto = safeLoadProtocol('0x42069');

    proto.nuggftStakedEth = proto.nuggftStakedEth.minus(event.params.stake);
    proto.nuggftStakedUsd = wethToUsdc(proto.nuggftStakedEth);

    proto.save();

    updateStakedEthPerShare(proto);
    log.info('handleUnStake end', []);
}

function handleSetProof(event: SetProof): void {
    log.info('handleSetProof start', []);
    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNuggNull(event.params.tokenId);

    if (nugg == null) {
        nugg = safeNewNugg(event.params.tokenId);
        nugg.user = proto.nullUser;
        nugg.save();
        // sendingUser = safeLoadUser(Address.fromString(proto.nullUser));
    } else {
        // sendingUser = safeLoadUser(Address.fromString(nugg.user));
    }

    for (let i = 0; i < event.params.items.length; i++) {
        let item = safeLoadItemNull(BigInt.fromI32(event.params.items[i]));
        if (item == null) {
            item = safeNewItem(BigInt.fromI32(event.params.items[i]));
            item.count = BigInt.fromString('0');
        }
        let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

        if (nuggItem == null) {
            nuggItem = safeNewNuggItem(nugg, item);
            nuggItem.count = BigInt.fromString('0');
        }

        nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
        item.count = item.count.plus(BigInt.fromString('1'));

        nuggItem.item = item.id;
        nuggItem.nugg = nugg.id;

        item.save();
        nuggItem.save();
    }

    log.info('handleSetProof end', []);
}

function handleTransfer(event: Transfer): void {
    log.info('handleTransfer start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNuggNull(event.params.tokenId);

    let sendingUser: User;

    if (nugg == null) {
        nugg = safeNewNugg(event.params.tokenId);
        sendingUser = safeLoadUser(Address.fromString(proto.nullUser));
    } else {
        sendingUser = safeLoadUser(Address.fromString(nugg.user));
    }

    let user = safeLoadUserNull(event.params.to);

    if (user == null) {
        user = safeNewUser(event.params.to);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    if (sendingUser.id !== proto.nullUser) {
        sendingUser.shares = sendingUser.shares.minus(BigInt.fromString('1'));
    }
    if (user.id === proto.nullUser) {
        nugg.burned = true;
    } else {
        user.shares = user.shares.plus(BigInt.fromString('1'));
    }

    nugg.user = user.id;

    user.save();
    nugg.save();
    sendingUser.save();

    log.info('handleTransfer end', []);
}

function handlePushItem(event: PushItem): void {
    log.info('handlePushItem start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItemNull(BigInt.fromI32(event.params.itemId));

    if (item == null) {
        item = safeNewItem(BigInt.fromI32(event.params.itemId));
        item.count = BigInt.fromString('1');
        item.save();
    }

    let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

    if (nuggItem == null) {
        nuggItem = safeNewNuggItem(nugg, item);
        nuggItem.count = BigInt.fromString('0');
    }

    nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

    nuggItem.save();
}

function handlePopItem(event: PopItem): void {
    log.info('handlePopItem start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItem(BigInt.fromI32(event.params.itemId));

    let nuggItem = safeLoadNuggItemHelper(nugg, item);

    nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

    if (nuggItem.count == BigInt.fromString('0')) {
        store.remove('NuggItem', nuggItem.id);
    } else {
        nuggItem.save();
    }

    log.info('handlePopItem end', []);
}
