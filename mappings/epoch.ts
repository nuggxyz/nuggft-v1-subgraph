import { ethereum, BigInt, store, log } from '@graphprotocol/graph-ts';
import { Epoch, Protocol } from '../generated/schema';
import {
    safeLoadActiveEpoch,
    safeLoadEpoch,
    safeLoadProtocol,
    safeNewEpoch,
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
    unsafeIncrementItemActiveSwap,
    safeRemoveNuggFromProtcol,
} from './safeload';
import { safeDiv } from './uniswap';
import { unsafeLoadNuggItem, safeSetNuggActiveSwap } from './safeload';
import { cacheDotnugg, updateProof } from './dotnugg';
import { addrs, bigi, bigs } from './utils';
import { _transfer } from './swap';

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

    let nugg = safeLoadNugg(currentEpochId);

    updateProof(nugg, bigi(0), true);
    cacheDotnugg(nugg, block.number.toI32());
    onEpochStart(currentEpochId, proto, block);

    onEpochInit(currentEpochId.plus(BigInt.fromString('1')), proto);
    onEpochInit(currentEpochId.plus(BigInt.fromString('2')), proto);
}
export function onSwapInit(id: BigInt, proto: Protocol): void {
    log.info('onSwapInit IN {}', [id.toString()]);

    let nextEpoch = safeLoadEpoch(id);

    let nextNugg = safeNewNuggNoCache(id, proto.nullUser);

    let nextSwap = safeNewSwapHelper(nextNugg);

    nextSwap.epoch = nextEpoch.id;
    nextSwap.startingEpoch = nextEpoch.id;
    nextSwap.endingEpoch = BigInt.fromString(nextEpoch.id);
    nextSwap.eth = bigi(0);
    nextSwap.ethUsd = bigi(0);
    nextSwap.owner = proto.nullUser;
    nextSwap.leader = proto.nullUser;
    nextSwap.nugg = nextNugg.id;
    nextSwap.nextDelegateType = 'Mint';
    nextSwap.bottom = bigi(0);
    nextSwap.bottomUsd = bigi(0);

    nextSwap.save();

    safeSetNuggActiveSwap(nextNugg, nextSwap);
    log.info('onSwapInit OUT {}', [id.toString()]);
}
export function onEpochStart(id: BigInt, proto: Protocol, block: ethereum.Block): void {
    log.info('onEpochStart IN [id:{}]', [id.toString()]);
    let nextEpoch = safeLoadEpoch(id);
    // let nextNextEpoch = safeLoadEpoch(id.plus(bigi(1)));

    let nextNugg = safeLoadNugg(id);

    let nextSwap = safeLoadActiveSwap(nextNugg);

    nextEpoch.status = 'ACTIVE';
    nextEpoch.starttime = block.timestamp;

    let _s = nextEpoch._activeSwaps as string[];
    _s.push(nextSwap.id as string);
    nextEpoch._activeSwaps = _s as string[];

    let swaps = nextEpoch._upcomingActiveItemSwaps as string[];

    nextEpoch._activeItemSwaps = swaps;

    for (let index = 0; index < swaps.length; index++) {
        let itemswap = unsafeLoadItemSwap(swaps[index]);
        unsafeIncrementItemActiveSwap(itemswap.sellingItem);
    }

    nextEpoch._upcomingActiveItemSwaps = [];
    nextEpoch.save();
    proto.epoch = nextEpoch.id;
    proto.nextEpoch = id.plus(bigi(1)).toString();
    proto.defaultActiveNugg = nextNugg.id;
    proto.save();
    log.info('onEpochStart OUT {}', [id.toString()]);
}

export function onEpochInit(id: BigInt, proto: Protocol): Epoch {
    log.info('onEpochInit IN {}', [id.toString()]);

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
    log.info('onEpochInit OUT {}', [id.toString()]);

    return newEpoch;
}

export function onEpochClose(epoch: Epoch, proto: Protocol, block: ethereum.Block): void {
    log.info('onEpochClose IN {}', [epoch.id]);

    let swaps = epoch._activeSwaps;

    let workingRemoval = proto.nuggsPendingRemoval;

    for (let i = 0; i < proto.nuggsPendingRemoval.length; i++) {
        let nugg = safeLoadNugg(bigs(workingRemoval[i]));

        safeRemoveNuggFromProtcol(nugg);

        // let itm = nugg._items;

        // for (let abc = 0; abc < itm.length; abc++) {
        //     store.remove('NuggItem', `${itm[abc]}-${workingRemoval[i]}`);
        // }
        // store.remove('Nugg', workingRemoval[i]);
        // store.remove('Swap', workingRemoval[i] + '-0');
        // TODO maybe we kill the cached svg here too?\
    }

    workingRemoval = [];

    for (let i = 0; i < swaps.length; i++) {
        let s = unsafeLoadSwap(swaps[i]);
        let nugg = safeLoadNugg(BigInt.fromString(s.nugg));
        if (nugg.id == epoch.id && nugg.user == proto.nullUser) {
            workingRemoval.push(nugg.id);
        } else {
            nugg = safeRemoveNuggActiveSwap(nugg);
            nugg = _transfer(addrs(proto.nuggftUser), addrs(s.leader), bigs(nugg.id));
            nugg.pendingClaim = true;
            nugg.save();
        }
    }

    proto.nuggsPendingRemoval = workingRemoval;

    // let nuggItemSwaps = epoch._activeNuggItemSwaps;

    // for (let j = 0; j < nuggItemSwaps.length; j++) {
    //     let s = unsafeLoadItemSwap(nuggItemSwaps[j]);
    //     let nuggitem = unsafeLoadNuggItem(s.sellingNuggItem);
    //     safeRemoveNuggItemActiveSwap(nuggitem);
    // }

    let itemswaps = epoch._activeItemSwaps;

    // log.warning('BBB: ' + itemswaps.join('='), []);
    for (let j = 0; j < itemswaps.length; j++) {
        let s = unsafeLoadItemSwap(itemswaps[j]);
        let nuggitem = unsafeLoadNuggItem(s.sellingNuggItem);

        let item = unsafeLoadItem(s.sellingItem);
        safeRemoveItemActiveSwap(item);
        safeRemoveNuggItemActiveSwap(nuggitem);
    }
    epoch.endtime = block.timestamp;
    epoch._activeItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch._activeSwaps = [];
    epoch.status = 'OVER';

    epoch.save();

    proto.lastEpoch = epoch.id;
    proto.save();
    log.info('onEpochClose OUT {}', [epoch.id]);
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
    // log.warning(check.toString(), []);

    switch (check.toI32()) {
        case 0:
            // if (safeLoadNuggNull(currentEpochId.plus(bigi(1))) == null) {
            //     onSwapInit(currentEpochId.plus(bigi(1)), proto);
            // }

            // must be called before on epoch start
            onEpochClose(epoch, proto, block);

            onEpochStart(currentEpochId, proto, block);

            onEpochInit(currentEpochId.plus(bigi(2)), proto);
            break;
        case 1: {
            let nugg = safeLoadNuggNull(currentEpochId.plus(bigi(1)));
            if (nugg == null) {
                onSwapInit(currentEpochId.plus(bigi(1)), proto);
                nugg = safeLoadNugg(currentEpochId.plus(bigi(1)));
            }
            cacheDotnugg(nugg, 0);
            updateProof(nugg, bigi(0), true);
            break;
        }
        case 12:
            onSwapInit(currentEpochId.plus(bigi(1)), proto);

            let nugg = safeLoadNuggNull(currentEpochId.plus(bigi(1)));
            if (nugg == null) {
                onSwapInit(currentEpochId.plus(bigi(1)), proto);
                nugg = safeLoadNugg(currentEpochId.plus(bigi(1)));
            }
            cacheDotnugg(nugg, 0);
            updateProof(nugg, bigi(0), true);
            break;
        // case 12:
        //     onSwapInit(currentEpochId.plus(bigi(1)), proto);
        //     break;
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
