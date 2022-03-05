import { ethereum, BigInt, store, log } from '@graphprotocol/graph-ts';
import { Epoch, Protocol } from '../generated/schema';
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
    safeLoadActiveSwap,
    safeNewNuggNoCache,
    safeLoadNuggNull,
    unsafeLoadItem,
    safeRemoveItemActiveSwap,
    safeSetItemActiveSwap,
    unsafeSetItemActiveSwap,
} from './safeload';
import { safeDiv } from './uniswap';
import { unsafeLoadNuggItem, safeSetNuggActiveSwap } from './safeload';
import { cacheDotnugg } from './dotnugg';
import { bigi } from './utils';

export function onEpochGenesis(
    block: ethereum.Block,
    genesisBlock: BigInt,
    interval: BigInt,
    offset: BigInt,
): void {
    let proto = safeLoadProtocol();

    proto.genesisBlock = genesisBlock;
    proto.interval = interval;
    proto.init = true;
    proto.epochOffset = offset;
    proto.save();

    let currentEpochId = getCurrentEpoch(
        proto.genesisBlock,
        proto.interval,
        block.number,
        proto.epochOffset,
    );

    onEpochInit(currentEpochId, proto);
    onSwapInit(currentEpochId, proto);
    cacheDotnugg(safeLoadNugg(currentEpochId), block.number.toI32());
    onEpochStart(currentEpochId, proto);

    onEpochInit(currentEpochId.plus(BigInt.fromString('1')), proto);
    onEpochInit(currentEpochId.plus(BigInt.fromString('2')), proto);
}
export function onSwapInit(id: BigInt, proto: Protocol): void {
    let nextEpoch = safeLoadEpoch(id);

    let nextNugg = safeNewNuggNoCache(id, proto.nullUser);

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

    nextSwap.save();

    safeSetNuggActiveSwap(nextNugg, nextSwap);
}
export function onEpochStart(id: BigInt, proto: Protocol): void {
    log.info('onEpochStart IN', []);
    let nextEpoch = safeLoadEpoch(id);

    let nextNugg = safeLoadNugg(id);

    let nextSwap = safeLoadActiveSwap(nextNugg);

    nextEpoch.status = 'ACTIVE';

    let _s = nextEpoch._activeSwaps as string[];
    _s.push(nextSwap.id as string);
    nextEpoch._activeSwaps = _s as string[];

    let swaps = nextEpoch._upcomingActiveItemSwaps as string[];

    for (let index = 0; index < swaps.length; index++) {
        let itemswap = unsafeLoadItemSwap(swaps[index]);
        unsafeSetItemActiveSwap(itemswap.sellingItem, itemswap);
    }

    nextEpoch._upcomingActiveItemSwaps = [];
    nextEpoch.save();

    proto.epoch = nextEpoch.id;
    proto.defaultActiveNugg = nextNugg.id;
    proto.save();
    log.info('onEpochStart OUT', []);
}

export function onEpochInit(id: BigInt, proto: Protocol): Epoch {
    log.info('onEpochInit IN', []);

    let newEpoch = safeNewEpoch(id);

    newEpoch.endblock = getEndBlockFromEpoch(
        id,
        proto.genesisBlock,
        proto.interval,
        proto.epochOffset,
    );
    newEpoch.startblock = getStartBlockFromEpoch(
        id,
        proto.genesisBlock,
        proto.interval,
        proto.epochOffset,
    );
    newEpoch.status = 'PENDING';
    newEpoch._activeItemSwaps = [];
    newEpoch._upcomingActiveItemSwaps = [];

    newEpoch.save();
    log.info('onEpochInit OUT', []);

    return newEpoch;
}

export function onEpochClose(epoch: Epoch, proto: Protocol): void {
    log.info('onEpochClose IN', []);

    let swaps = epoch._activeSwaps;
    log.warning('onEpochClose A: ' + swaps.join('='), []);

    for (let i = 0; i < swaps.length; i++) {
        log.warning('onEpochClose B: ' + i.toString(), []);
        let s = unsafeLoadSwap(swaps[i]);
        let nugg = safeLoadNugg(BigInt.fromString(s.nugg));
        if (nugg.id == epoch.id && nugg.user == proto.nullUser) {
            store.remove('Nugg', nugg.id);
            store.remove('Swap', s.id);
        } else {
            safeRemoveNuggActiveSwap(nugg);
        }
    }

    let nuggItemSwaps = epoch._activeNuggItemSwaps;
    log.warning('AAA: ' + nuggItemSwaps.join('='), []);

    for (let j = 0; j < nuggItemSwaps.length; j++) {
        let s = unsafeLoadItemSwap(nuggItemSwaps[j]);
        let nuggitem = unsafeLoadNuggItem(s.sellingNuggItem);
        safeRemoveNuggItemActiveSwap(nuggitem);
    }

    let itemswaps = epoch._activeItemSwaps;

    log.warning('BBB: ' + itemswaps.join('='), []);
    for (let j = 0; j < itemswaps.length; j++) {
        let s = unsafeLoadItemSwap(itemswaps[j]);

        let item = unsafeLoadItem(s.sellingItem);
        safeRemoveItemActiveSwap(item);
    }

    epoch._activeItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch._activeSwaps = [];
    epoch.status = 'OVER';
    epoch.save();
    log.info('onEpochClose OUT', []);
}

export function handleBlock__every(block: ethereum.Block): void {
    let proto = Protocol.load('0x42069');
    if (proto == null || !proto.init) return;

    let currentEpochId = getCurrentEpoch(
        proto.genesisBlock,
        proto.interval,
        block.number,
        proto.epochOffset,
    );

    let epoch = safeLoadActiveEpoch();

    // let startblock = getCurrentStartBlock(proto.interval, block.number)

    let check = epoch.endblock.minus(block.number);
    log.warning(check.toString(), []);

    switch (check.toI32()) {
        case 0:
            onEpochClose(epoch, proto);

            onEpochStart(currentEpochId, proto);

            onEpochInit(currentEpochId.plus(bigi(2)), proto);
            break;
        case 4:
            let nugg = safeLoadNuggNull(currentEpochId.plus(bigi(1)));
            if (nugg == null) {
                onSwapInit(currentEpochId.plus(bigi(1)), proto);
                nugg = safeLoadNugg(currentEpochId.plus(bigi(1)));
            }
            cacheDotnugg(nugg, block.number.toI32());
            break;
        case 16:
            onSwapInit(currentEpochId.plus(bigi(1)), proto);
            break;
    }

    // if (block.number.toI32() === 10276528)
    //     for (let i = 0; i < proto.nuggsNotCached.length; i++) {
    //         // proto.nuggsNotCached.forEach((id) => {
    //         let nugg = safeLoadNuggNull(BigInt.fromString(proto.nuggsNotCached[i]));
    //         if (nugg !== null) {
    //             cacheDotnugg(nugg, block.number.toI32());
    //         }
    //     }

    // switch()
}

export function getCurrentEpoch(
    genesis: BigInt,
    interval: BigInt,
    blocknum: BigInt,
    offset: BigInt,
): BigInt {
    let diff = blocknum.plus(BigInt.fromString('1')).minus(genesis);
    return safeDiv(diff, interval).plus(offset);
}

export function getCurrentStartBlock(interval: BigInt, blocknum: BigInt): BigInt {
    let num = safeDiv(blocknum, interval).times(interval);
    return num;
}

export function getCurrentEndBlock(interval: BigInt, blocknum: BigInt): BigInt {
    let num = getCurrentStartBlock(interval, blocknum);
    return num.plus(interval).minus(BigInt.fromString('1'));
}

export function getStartBlockFromEpoch(
    epoch: BigInt,
    genesis: BigInt,
    interval: BigInt,
    offset: BigInt,
): BigInt {
    return epoch.minus(offset).times(interval).plus(genesis);
}

export function getEndBlockFromEpoch(
    epoch: BigInt,
    genesis: BigInt,
    interval: BigInt,
    offset: BigInt,
): BigInt {
    return getStartBlockFromEpoch(
        epoch.plus(BigInt.fromString('1')),
        genesis,
        interval,
        offset,
    ).minus(BigInt.fromString('1'));
}
