import { ethereum, log } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { Genesis, Transfer, SetDotnuggV1ResolverCall, AnchorCall, RotateCall } from '../generated/local/NuggFT/NuggFT';
import { wethToUsdc } from './uniswap';
import { safeLoadNuggNull, safeLoadUser, safeNewNugg, safeNewOfferHelper, safeNewSwapHelper } from './safeload';
import { handleBlock__every, onEpochGenesis } from './epoch';
import { handleCall__delegate, handleCall__claim, handleCall__swap } from './swap';
import { handleCall__delegateItem, handleCall__swapItem, handleCall__claimItem } from './itemswap';

import { safeNewUser, safeLoadNugg, safeLoadUserNull, safeLoadProtocol } from './safeload';
import { Epoch, Protocol, User } from '../generated/local/schema';
import { cacheDotnugg, getDotnuggUserId, updatedStakedSharesAndEth, updateProof } from './dotnugg';
import { handleCall__loan, handleCall__payoff, handleCall__rebalance } from './loan';
export {
    handleCall__delegateItem,
    handleCall__swapItem,
    handleCall__claimItem,
    handleCall__delegate,
    handleCall__swap,
    handleCall__claim,
    handleEvent__Transfer,
    handleEvent__Genesis,
    handleBlock__every,
    handleCall__rebalance,
    handleCall__loan,
    handleCall__payoff,
    handleCall__setDotnuggV1Resolver,
    handleCall__anchor,
    handleCall__rotate,
    handleBlock__call,
};

function handleBlock__call(block: ethereum.Block): void {
    // updatedStakedSharesAndEth();
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

function handleEvent__Transfer(event: Transfer): void {
    log.info('handleTransfer start', []);

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

        swap.eth = event.transaction.value;
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
        offer.eth = event.transaction.value;
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

    log.info('handleTransfer end', []);
}

function handleCall__setDotnuggV1Resolver(call: SetDotnuggV1ResolverCall): void {
    log.info('handleDotnuggV1ResolverUpdated start', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    cacheDotnugg(nugg);

    log.info('handleDotnuggV1ResolverUpdated end', []);
}

function handleCall__anchor(call: AnchorCall): void {
    log.info('handleCall__anchor start', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    cacheDotnugg(nugg);

    log.info('handleCall__anchor end', []);
}

function handleCall__rotate(call: RotateCall): void {
    log.info('handleCall__rotate start', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    cacheDotnugg(nugg);

    log.info('handleCall__rotate end', []);
}

// function handleSetProof(event: SetProof): void {
//     log.info('handleSetProof start', []);
//     let proto = safeLoadProtocol('0x42069');

//     let nugg = safeLoadNuggNull(event.params.tokenId);

//     if (nugg == null) {
//         nugg = safeNewNugg(event.params.tokenId, proto.nullUser);

//         // sendingUser = safeLoadUser(Address.fromString(proto.nullUser));
//     } else {
//         // sendingUser = safeLoadUser(Address.fromString(nugg.user));
//     }

//     if (nugg.dotnuggRawCache.startsWith('ERROR_WITH_DOTNUGG_CACHE')) {
//         cacheDotnugg(nugg);
//     }

//     for (let i = 0; i < event.params.items.length; i++) {
//         let item = safeLoadItemNull(BigInt.fromI32(event.params.items[i]));
//         if (item == null) {
//             item = safeNewItem(BigInt.fromI32(event.params.items[i]));
//             item.count = BigInt.fromString('0');
//         }
//         let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

//         if (nuggItem == null) {
//             nuggItem = safeNewNuggItem(nugg, item);
//             nuggItem.count = BigInt.fromString('0');
//         }

//         nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
//         item.count = item.count.plus(BigInt.fromString('1'));

//         nuggItem.item = item.id;
//         nuggItem.nugg = nugg.id;

//         item.save();
//         nuggItem.save();
//     }

//     nugg.save();

//     log.info('handleSetProof end', []);
// }

// function handlePushItem(event: PushItem): void {
//     log.info('handlePushItem start', []);

//     let nugg = safeLoadNugg(event.params.tokenId);

//     let item = safeLoadItemNull(BigInt.fromI32(event.params.itemId));

//     if (item == null) {
//         item = safeNewItem(BigInt.fromI32(event.params.itemId));
//         item.count = BigInt.fromString('1');
//         item.save();
//     }

//     let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

//     if (nuggItem == null) {
//         nuggItem = safeNewNuggItem(nugg, item);
//         nuggItem.count = BigInt.fromString('0');
//     }

//     nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

//     nuggItem.save();
// }

// function handlePopItem(event: PopItem): void {
//     log.info('handlePopItem start', []);

//     let nugg = safeLoadNugg(event.params.tokenId);

//     let item = safeLoadItem(BigInt.fromI32(event.params.itemId));

//     let nuggItem = safeLoadNuggItemHelper(nugg, item);

//     nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

//     if (nuggItem.count == BigInt.fromString('0')) {
//         store.remove('NuggItem', nuggItem.id);
//     } else {
//         nuggItem.save();
//     }

//     log.info('handlePopItem end', []);
// }

// function handleRotateItems(event: RotateItem): void {
//     log.info('handleRotateItems start', []);

//     let nugg = safeLoadNugg(event.params.tokenId);

//     cacheDotnugg(nugg);

//     log.info('handleRotateItems end', []);
// }

// function handleSetAchorOverrides(event: SetAnchorOverrides): void {
//     log.info('handleSetAchorOverrides start', []);

//     let nugg = safeLoadNugg(event.params.tokenId);

//     cacheDotnugg(nugg);
//     log.info('handleSetAchorOverrides end', []);
// }
