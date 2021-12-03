import { ethereum, BigInt } from '@graphprotocol/graph-ts';
import { Epoch, Protocol } from '../generated/local/schema';
import {
    safeLoadActiveEpoch,
    safeLoadEpoch,
    safeLoadProtocol,
    safeNewEpoch,
    safeNewNugg,
    safeNewSwapHelper,
    safeLoadSwapHelper,
    unsafeLoadSwap,
    safeLoadNugg,
    unsafeLoadItemSwap,
    safeRemoveNuggActiveSwap,
    safeRemoveNuggItemActiveSwap,
} from './safeload';
import { safeDiv } from './uniswap';
import { unsafeLoadNuggItem, safeSetNuggActiveSwap } from './safeload';

export function onEpochGenesis(block: ethereum.Block, genesisBlock: BigInt, interval: BigInt): void {
    let proto = safeLoadProtocol('0x42069');

    proto.genesisBlock = genesisBlock;
    proto.interval = interval;
    proto.init = true;

    let currentEpochId = getCurrentEpoch(proto.genesisBlock, proto.interval, block.number);

    onEpochInit(currentEpochId, proto);

    onEpochStart(currentEpochId, proto);

    onEpochInit(currentEpochId.plus(BigInt.fromString('1')), proto);
    onEpochInit(currentEpochId.plus(BigInt.fromString('2')), proto);
}

export function onEpochStart(id: BigInt, proto: Protocol): void {
    let nextEpoch = safeLoadEpoch(id);
    let nextNugg = safeLoadNugg(id);
    let nextSwap = safeLoadSwapHelper(nextNugg, id);

    nextEpoch.status = 'ACTIVE';

    let _s = nextEpoch._activeSwaps as string[];
    _s.push(nextSwap.id as string);
    nextEpoch._activeSwaps = _s as string[];
    nextEpoch.save();

    safeSetNuggActiveSwap(nextNugg, nextSwap);

    proto.epoch = nextEpoch.id;
    proto.defaultActiveNugg = nextNugg.id;
    proto.save();
}

export function onEpochInit(id: BigInt, proto: Protocol): Epoch {
    let newEpoch = safeNewEpoch(id);

    let nugg = safeNewNugg(id);

    let swap = safeNewSwapHelper(nugg, id);

    nugg.user = proto.nullUser;

    // safeSetNuggActiveSwap(nugg, swap);

    nugg.save();

    newEpoch.endblock = getEndBlockFromEpoch(id, proto.genesisBlock, proto.interval);
    newEpoch.startblock = getStartBlockFromEpoch(id, proto.genesisBlock, proto.interval);
    newEpoch.status = 'PENDING';
    newEpoch._activeItemSwaps = [];

    swap.epoch = newEpoch.id;
    swap.eth = BigInt.fromString('0');
    swap.ethUsd = BigInt.fromString('0');
    swap.owner = proto.nullUser;
    swap.leader = proto.nullUser;
    swap.nugg = nugg.id;

    swap.save();

    newEpoch.save();

    return newEpoch;
}

export function onEpochClose(epoch: Epoch, proto: Protocol): void {
    let swaps = epoch._activeSwaps;

    for (var i = 0; i < swaps.length; i++) {
        let s = unsafeLoadSwap(swaps[i]);
        let nugg = safeLoadNugg(BigInt.fromString(s.nugg));
        safeRemoveNuggActiveSwap(nugg);
    }

    let itemswaps = epoch._activeItemSwaps;

    for (var j = 0; j < itemswaps.length; j++) {
        let s = unsafeLoadItemSwap(itemswaps[i]);
        let nuggitem = unsafeLoadNuggItem(s.sellingNuggItem);
        safeRemoveNuggItemActiveSwap(nuggitem);
    }

    epoch._activeItemSwaps = [];
    epoch._activeSwaps = [];
    epoch.status = 'OVER';
    epoch.save();
}

export function handleBlock(block: ethereum.Block): void {
    let proto = Protocol.load('0x42069');
    if (proto == null) return;

    let currentEpochId = getCurrentEpoch(proto.genesisBlock, proto.interval, block.number);

    let epoch = safeLoadActiveEpoch();

    if (proto.init && BigInt.fromString(epoch.id).notEqual(currentEpochId)) {
        onEpochClose(epoch, proto);

        onEpochStart(currentEpochId, proto);

        onEpochInit(currentEpochId.plus(BigInt.fromString('2')), proto);
    }
}

export function getCurrentEpoch(genesis: BigInt, interval: BigInt, blocknum: BigInt): BigInt {
    let diff = blocknum.plus(BigInt.fromString('1')).minus(genesis);
    return safeDiv(diff, interval);
}

export function getCurrentStartBlock(interval: BigInt, blocknum: BigInt): BigInt {
    let num = safeDiv(blocknum, interval).times(interval);
    return num;
}

export function getCurrentEndBlock(interval: BigInt, blocknum: BigInt): BigInt {
    let num = getCurrentStartBlock(interval, blocknum);
    return num.plus(interval).minus(BigInt.fromString('1'));
}

export function getStartBlockFromEpoch(epoch: BigInt, genesis: BigInt, interval: BigInt): BigInt {
    return epoch.times(interval).plus(genesis);
}

export function getEndBlockFromEpoch(epoch: BigInt, genesis: BigInt, interval: BigInt): BigInt {
    return getStartBlockFromEpoch(epoch.plus(BigInt.fromString('1')), genesis, interval).minus(BigInt.fromString('1'));
}
