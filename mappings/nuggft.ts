import { log } from '@graphprotocol/graph-ts';
import { BigInt } from '@graphprotocol/graph-ts';
import { SetProof, PopItem, PushItem, Genesis, StakeEth, UnStakeEth } from '../generated/local/NuggFT/NuggFT';
import { Transfer } from '../generated/local/NuggFT/NuggFT';
import { store } from '@graphprotocol/graph-ts';
import { invariant, safeDiv, wethToUsdc } from './uniswap';
import { safeNewNugg } from './safeload';
import { onEpochGenesis } from './epoch';
import { handleMint, handleClaim, handleOffer, handleSwap } from './swap';
import { handleClaimItem, handleOfferItem, handleSwapItem } from './itemswap';
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
import { Epoch, Protocol, User } from '../generated/local/schema';
import { handleBlock } from './epoch';

export {
    handleMint,
    handleTransfer,
    handleClaim,
    handleClaimItem,
    handleOffer,
    handleOfferItem,
    handleSwap,
    handleSwapItem,
    handlePopItem,
    handleSetProof,
    handlePushItem,
    handleStakeEth,
    handleUnStakeEth,
    handleBlock,
};

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesisNuggFT start', []);

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
    //     nuggft.nuggs = [];
    //     nuggft.offers = [];
    nuggft.save();

    proto.nuggftUser = nuggft.id;

    proto.save();

    onEpochGenesis(event.block, event.block.number, BigInt.fromString('25'));

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

    proto.nuggftStakedEth = proto.nuggftStakedEth.plus(event.params.amount);
    proto.nuggftStakedUsd = wethToUsdc(proto.nuggftStakedEth);
    proto.save();

    updateStakedEthPerShare(proto);
    log.info('handleStake end', []);
}

function handleUnStakeEth(event: UnStakeEth): void {
    log.info('handleUnStake start', []);

    let proto = safeLoadProtocol('0x42069');

    proto.nuggftStakedEth = proto.nuggftStakedEth.minus(event.params.amount);
    proto.nuggftStakedUsd = wethToUsdc(proto.nuggftStakedEth);

    proto.save();

    updateStakedEthPerShare(proto);
    log.info('handleUnStake end', []);
}

// function handleGenesis(event: Genesis): void {
//     log.info('handleGenesis start', []);

//     onEpochGenesis(event.block, event.block.number, BigInt.fromString('25'));

//     let proto = safeLoadProtocol('0x42069');

//     let nuggft = safeNewUser(event.address);

//     nuggft.xnugg = BigInt.fromString('0');
//     nuggft.ethin = BigInt.fromString('0');
//     nuggft.ethout = BigInt.fromString('0');
//     //     nuggft.nuggs = [];
//     //     nuggft.offers = [];
//     nuggft.save();

//     proto.nuggftUser = nuggft.id;

//     proto.save();

//     log.info('handleGenesis end', []);
// }

function handleSetProof(event: SetProof): void {
    log.info('handleSetProof start', []);

    // let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(event.params.tokenId);
    //     nugg.swaps = [];
    //     nugg.items = [];
    //     nugg.offers = [];

    for (let i = 0; i < event.params.items.length; i++) {
        let item = safeLoadItemNull(event.params.items[i]);
        if (item == null) {
            item = safeNewItem(event.params.items[i]);
            item.count = BigInt.fromString('0');
        }
        let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

        if (nuggItem == null) {
            nuggItem = safeNewNuggItem(nugg, item);
            nuggItem.count = BigInt.fromString('0');
            //             nuggItem.swaps = [];
        }

        nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
        item.count = item.count.plus(BigInt.fromString('1'));

        nuggItem.item = item.id;
        nuggItem.nugg = nugg.id;

        item.save();
        nuggItem.save();
    }

    // nugg.user = proto.nullUser;

    // nugg.save();

    log.info('handleSetProof end', []);
}

function handleTransfer(event: Transfer): void {
    log.info('handleTransfer start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let user = safeLoadUserNull(event.params.to);

    if (user == null) {
        user = safeNewUser(event.params.to);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        //         user.nuggs = [];
        //         user.offers = [];
        user.save();
    }

    nugg.user = user.id;

    nugg.save();

    log.info('handleTransfer end', []);
}

function handlePushItem(event: PushItem): void {
    log.info('handlePushItem start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItemNull(event.params.itemId);

    if (item == null) {
        item = safeNewItem(event.params.itemId);
        item.count = BigInt.fromString('1');
        item.save();
    }

    let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

    if (nuggItem == null) {
        nuggItem = safeNewNuggItem(nugg, item);
        nuggItem.count = BigInt.fromString('0');
        //         nuggItem.swaps = [];
    }

    nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

    nuggItem.save();
}

function handlePopItem(event: PopItem): void {
    log.info('handlePopItem start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggItem = safeLoadNuggItemHelper(nugg, item);

    nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

    if (nuggItem.count == BigInt.fromString('0')) {
        store.remove('NuggItem', nuggItem.id);
    } else {
        nuggItem.save();
    }

    log.info('handlePopItem end', []);
}
