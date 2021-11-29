import { ethereum, BigInt } from '@graphprotocol/graph-ts';
import { Epoch, Protocol } from '../generated/local/schema';
import { safeLoadActiveEpoch, safeLoadEpoch, safeLoadProtocol, safeNewEpoch } from './safeload';
import { safeDiv } from './uniswap';

export function initEpochs(block: ethereum.Block, genesisBlock: BigInt, interval: BigInt): void {
    let proto = safeLoadProtocol('0x42069');

    proto.genesisBlock = genesisBlock;
    proto.interval = interval;
    proto.init = true;

    let currentEpochId = getCurrentEpoch(proto.genesisBlock, proto.interval, block.number);
    let currentEpoch = safeNewEpoch(currentEpochId);

    currentEpoch.endblock = getEndBlockFromEpoch(currentEpochId, proto.genesisBlock, proto.interval);
    currentEpoch.startblock = getStartBlockFromEpoch(currentEpochId, proto.genesisBlock, proto.interval);
    currentEpoch.status = 'ACTIVE';

    currentEpoch.save();

    proto.epoch = currentEpoch.id;

    proto.save();

    let newEpochIdA = currentEpochId.plus(BigInt.fromString('1'));
    let newEpochA = safeNewEpoch(newEpochIdA);

    newEpochA.endblock = getEndBlockFromEpoch(newEpochIdA, proto.genesisBlock, proto.interval);
    newEpochA.startblock = getStartBlockFromEpoch(newEpochIdA, proto.genesisBlock, proto.interval);
    newEpochA.status = 'PENDING';

    newEpochA.save();

    let newEpochIdB = currentEpochId.plus(BigInt.fromString('2'));
    let newEpochB = safeNewEpoch(newEpochIdB);

    newEpochB.endblock = getEndBlockFromEpoch(newEpochIdB, proto.genesisBlock, proto.interval);
    newEpochB.startblock = getStartBlockFromEpoch(newEpochIdB, proto.genesisBlock, proto.interval);
    newEpochB.status = 'PENDING';

    newEpochB.save();
}

export function handleBlock(block: ethereum.Block): void {
    let proto = Protocol.load('0x42069');
    if (proto == null) return;
    proto.lastBlock = block.number;
    proto.save();

    let epoch = safeLoadActiveEpoch();

    let currentEpochId = getCurrentEpoch(proto.genesisBlock, proto.interval, block.number);

    if (proto.init && BigInt.fromString(epoch.id).notEqual(currentEpochId)) {
        epoch.status = 'OVER';
        epoch.save();

        let nextEpoch = safeLoadEpoch(currentEpochId);
        nextEpoch.status = 'ACTIVE';
        nextEpoch.save();

        proto.epoch = nextEpoch.id;
        proto.save();

        let newEpochId = currentEpochId.plus(BigInt.fromString('2'));
        let newEpoch = safeNewEpoch(currentEpochId.plus(BigInt.fromString('2')));

        newEpoch.endblock = getEndBlockFromEpoch(newEpochId, proto.genesisBlock, proto.interval);
        newEpoch.startblock = getStartBlockFromEpoch(newEpochId, proto.genesisBlock, proto.interval);
        newEpoch.status = 'PENDING';

        newEpoch.save();
    }
}

export function getCurrentEpoch(genesis: BigInt, interval: BigInt, blocknum: BigInt): BigInt {
    let diff = blocknum.minus(genesis);
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
