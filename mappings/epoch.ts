import { ethereum, BigInt, store, log } from '@graphprotocol/graph-ts';
import { Epoch, Protocol } from '../generated/local/schema';
import {
    safeLoadActiveEpoch,
    safeLoadEpoch,
    safeLoadProtocol,
    safeNewEpoch,
    safeNewNugg,
    safeNewSwapHelper,
    unsafeLoadSwap,
    safeLoadNugg,
    unsafeLoadItemSwap,
    safeRemoveNuggActiveSwap,
    safeRemoveNuggItemActiveSwap,
} from './safeload';
import { safeDiv } from './uniswap';
import { unsafeLoadNuggItem, safeSetNuggActiveSwap } from './safeload';
import { cacheDotnugg } from './dotnugg';

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

    proto.save();
}

export function onEpochStart(id: BigInt, proto: Protocol): void {
    let nextEpoch = safeLoadEpoch(id);

    let nextNugg = safeNewNugg(id, proto.nullUser);

    let nextSwap = safeNewSwapHelper(nextNugg);

    nextSwap.epoch = nextEpoch.id;
    nextSwap.startingEpoch = nextEpoch.id;
    nextSwap.endingEpoch = BigInt.fromString(nextEpoch.id);
    nextSwap.eth = BigInt.fromString('0');
    nextSwap.ethUsd = BigInt.fromString('0');
    nextSwap.owner = proto.nullUser;
    nextSwap.leader = proto.nullUser;
    nextSwap.nugg = nextNugg.id;
    nextSwap.nextDelegateType = 'Mint';

    safeSetNuggActiveSwap(nextNugg, nextSwap);

    nextSwap.save();

    nextEpoch.status = 'ACTIVE';

    let _s = nextEpoch._activeSwaps as string[];
    _s.push(nextSwap.id as string);
    nextEpoch._activeSwaps = _s as string[];
    nextEpoch.save();

    proto.epoch = nextEpoch.id;
    proto.defaultActiveNugg = nextNugg.id;
    proto.save();
}

export function onEpochInit(id: BigInt, proto: Protocol): Epoch {
    let newEpoch = safeNewEpoch(id);

    newEpoch.endblock = getEndBlockFromEpoch(id, proto.genesisBlock, proto.interval);
    newEpoch.startblock = getStartBlockFromEpoch(id, proto.genesisBlock, proto.interval);
    newEpoch.status = 'PENDING';
    newEpoch._activeItemSwaps = [];

    newEpoch.save();

    return newEpoch;
}

export function onEpochClose(epoch: Epoch, proto: Protocol): void {
    let swaps = epoch._activeSwaps;

    for (var i = 0; i < swaps.length; i++) {
        let s = unsafeLoadSwap(swaps[i]);
        let nugg = safeLoadNugg(BigInt.fromString(s.nugg));
        log.error('wut', [nugg.user]);
        if (nugg.id == epoch.id && nugg.user == proto.nullUser) {
            store.remove('Nugg', nugg.id);
            store.remove('Swap', s.id);
        } else {
            safeRemoveNuggActiveSwap(nugg);
        }
        log.error('nope', [nugg.user]);
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

export function handleBlock__every(block: ethereum.Block): void {
    let proto = Protocol.load('0x42069');
    if (proto == null) return;

    let currentEpochId = getCurrentEpoch(proto.genesisBlock, proto.interval, block.number);

    let epoch = safeLoadActiveEpoch();

    // let startblock = getCurrentStartBlock(proto.interval, block.number)

    if (proto.init && epoch.idnum.notEqual(currentEpochId)) {
        onEpochClose(epoch, proto);

        onEpochStart(currentEpochId, proto);

        onEpochInit(currentEpochId.plus(BigInt.fromString('2')), proto);
    }

    proto.nuggsNotCached.forEach((id) => {
        cacheDotnugg(safeLoadNugg(BigInt.fromString(id)));
    });

    // switch()
}

let OFFSET = BigInt.fromString('3000');

export function getCurrentEpoch(genesis: BigInt, interval: BigInt, blocknum: BigInt): BigInt {
    let diff = blocknum.plus(BigInt.fromString('1')).minus(genesis);
    return safeDiv(diff, interval).plus(OFFSET);
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
    return epoch.minus(OFFSET).times(interval).plus(genesis);
}

export function getEndBlockFromEpoch(epoch: BigInt, genesis: BigInt, interval: BigInt): BigInt {
    return getStartBlockFromEpoch(epoch.plus(BigInt.fromString('1')), genesis, interval).minus(BigInt.fromString('1'));
}
