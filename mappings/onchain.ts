import { Address, ethereum, Bytes, BigInt } from '@graphprotocol/graph-ts';
import { log } from 'matchstick-as';

import { NuggftV1, Genesis } from '../generated/NuggftV1/NuggftV1';
import { User, Nugg, Protocol, NuggItem } from '../generated/schema';
import { xNuggftV1 } from '../generated/NuggftV1/xNuggftV1';

import { _sell } from './handlers/sell';
import { _sellItem } from './handlers/sellItem';
import { _mint } from './handlers/mint';
import { bigi, bighs, mask, difference, safeDiv, addrs } from './utils';
import {
    safeAddNuggToProtcol,
    safeLoadProtocol,
    safeNewItem,
    safeSetNewActiveItemSnapshot,
    safeNewActiveNuggSnapshot,
    safeLoadItem,
    safeLoadNuggItemHelperNull,
    safeNewNuggItem,
    safeLoadNuggItemHelper,
} from './safeload';

export function getDotnuggUserId(nuggftAddress: Address): Address {
    const nuggft = NuggftV1.bind(nuggftAddress);
    const callResult = nuggft.dotnuggv1();
    return callResult;
}

export function getPremints(
    event: Genesis,
    nuggftAddress: Address,
    owner: User,
    block: ethereum.Block,
): void {
    log.info('handleEvent__Write start ', []);

    const nuggft = NuggftV1.bind(nuggftAddress);

    const res = nuggft.premintTokens();

    const first = res.value0;
    const last = res.value1;

    const eps = nuggft.eps();

    for (let i = first; i <= last; i++) {
        const nugg = safeNewNugg(bigi(i), owner.id, bigi(1), event.block);

        nugg.pendingClaim = true;
        nugg.updatedAt = event.block.number;

        nugg.save(); // OK

        const agency = bigi(1).leftShift(254).plus(bighs(owner.id));

        _mint(i, agency, event.transaction.hash, eps, BigInt.zero(), block);

        _sellItem(event, BigInt.zero(), i, nugg._tmp, BigInt.zero());

        _sell(event, BigInt.zero(), i);
    }
}

export const _mspFromStake = (cache: BigInt): BigInt => {
    const eth = cache.rightShift(96).bitAnd(mask(96));
    const shares = cache.rightShift(192);

    const ethPerShare = safeDiv(eth.times(BigInt.fromI64(10).pow(18)), shares);
    const protocolFee = ethPerShare.div(BigInt.fromString('1'));
    const premium = ethPerShare.times(shares).div(BigInt.fromString('2000'));
    const final = ethPerShare.plus(protocolFee).plus(premium);

    return final.div(BigInt.fromI64(10).pow(18));
};

export function _epsFromStake(cache: BigInt): BigInt {
    const eth = cache.rightShift(96).bitAnd(mask(96));
    const shares = cache.rightShift(192);

    return safeDiv(eth, shares);
}

export function safeNewNugg(
    id: BigInt,
    userId: string,
    epoch: BigInt,
    block: ethereum.Block,
): Nugg {
    let loaded = new Nugg(id.toString());
    loaded.idnum = id.toI32();
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.lastTransfer = epoch.toI32();
    loaded.pendingClaim = false;
    loaded.dotnuggRawCache = '';
    loaded._tmp = 0;
    loaded._pickups = [];
    loaded._items = [];
    loaded._displayed = [];
    loaded.live = false;
    loaded.updatedAt = block.number;

    loaded.save(); // OK

    safeAddNuggToProtcol(block);

    loaded = updateProof(loaded, bigi(0), true, block);

    loaded = cacheDotnugg(loaded, block.number);

    return loaded;
}

export function update__iloop(proto: Protocol | null, block: ethereum.Block): Protocol {
    log.info('handleEvent__Write start ', []);

    if (proto == null) proto = safeLoadProtocol();

    const xnuggftv1 = xNuggftV1.bind(addrs(proto.xnuggftv1));

    const res = xnuggftv1.try_iloop();

    if (res.reverted) {
        log.error('xnuggftv1.iloop() reverted', []);
        return proto;
    }

    proto.iloop = res.value.toHexString();
    proto.updatedAt = block.number;

    proto.save(); // OK

    return proto;
}

export function update__tloop(proto: Protocol | null, block: ethereum.Block): Protocol {
    log.info('handleEvent__Write start ', []);

    if (proto == null) proto = safeLoadProtocol();

    const xnuggftv1 = xNuggftV1.bind(addrs(proto.xnuggftv1));

    const res = xnuggftv1.try_tloop();

    if (res.reverted) {
        log.error('xnuggftv1.tloop() reverted', []);
        return proto;
    }

    proto.tloop = res.value.toHexString();
    proto.updatedAt = block.number;

    proto.save(); // OK

    return proto;
}

export function getItemURIs(xnuggftAddress: Address, block: ethereum.Block): void {
    log.info('handleEvent__Write start ', []);

    const xnuggftv1 = xNuggftV1.bind(xnuggftAddress);

    for (let i = 0; i < 8; i++) {
        const amount = xnuggftv1.featureSupply(i).toI32();
        for (let j = 1; j < amount + 1; j++) {
            const itemId = i * 1000 + j;
            const callResult = xnuggftv1.try_imageSVG(bigi(itemId));
            const rarityResult = xnuggftv1.try_rarity(bigi(itemId));

            const item = safeNewItem(bigi(itemId), block);
            item.count = bigi(0);
            item.dotnuggRawCache = callResult.reverted ? 'ERROR' : callResult.value;

            item.feature = bigi(i);
            item.position = bigi(j);
            item.idnum = itemId;
            item.rarityX16 = rarityResult.reverted ? bigi(0) : bigi(rarityResult.value);
            item.updatedAt = block.number;

            item.save(); // OK

            if (!callResult.reverted) safeSetNewActiveItemSnapshot(item, callResult.value, block);
            else safeSetNewActiveItemSnapshot(item, 'ERROR', block);
        }
    }
    log.info('handleEvent__Write end ', []);
}

export function cacheDotnugg(nugg: Nugg, blocknum: BigInt): Nugg {
    log.info('cacheDotnugg start [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);

    const proto = safeLoadProtocol();

    const snap = safeNewActiveNuggSnapshot(nugg, nugg.user, blocknum);
    if (snap === null) {
        log.info('cacheDotnugg end (early) [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);
        return nugg;
    }

    // if (blockNum > 10276528) {
    const dotnugg = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    const callResult = dotnugg.try_imageSVG(bigi(nugg.idnum));

    let str = '';

    if (!callResult.reverted) {
        str = callResult.value;
    } else {
        let value = new Bytes(0);
        for (let a = 1; a <= 3; a++) {
            const callResult2 = dotnugg.try_image123(bigi(nugg.idnum), false, a, value);

            if (callResult2.reverted) {
                log.error('cacheDotnugg reverted trying to 123 [NuggId:{}] [chunk:{}/3]', [
                    nugg.id,
                    a.toString(),
                ]);
                snap.chunk = 'ERROR';
                snap.chunkError = true;
                snap.updatedAt = blocknum;

                snap.save(); // OK

                nugg.dotnuggRawCache = 'ERROR';
                nugg.activeSnapshot = snap.id;
                nugg.updatedAt = blocknum;

                nugg.save(); // OK

                return nugg;
            }

            value = callResult2.value;
        }

        str = value.toString();
    }

    nugg.dotnuggRawCache = str;
    snap.updatedAt = blocknum;

    nugg.updatedAt = blocknum;

    snap.chunk = str;
    snap.chunkError = false;

    snap.save(); // OK
    nugg.activeSnapshot = snap.id;

    nugg.save(); // OK
    log.info('cacheDotnugg end [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);

    return nugg;
}

export function updatedStakedSharesAndEth(block: ethereum.Block): void {
    const proto = safeLoadProtocol();
    const nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.staked();
    proto.nuggftStakedShares = nuggft.shares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.updatedAt = block.number;
    proto.save(); // OK
}

export function updateProof(
    nugg: Nugg,
    preload: BigInt,
    incrementItemCount: boolean,
    block: ethereum.Block,
): Nugg {
    log.debug('updateProof IN args:[{}]', [nugg.id]);
    const proto = safeLoadProtocol();
    const nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    const tmpFeatureTotals = proto.featureTotals;

    if (preload.equals(BigInt.zero())) {
        const res = nuggft.try_proofOf(nugg.idnum);

        if (res.reverted) return nugg;

        preload = res.value;
    }

    let proof = preload;

    const items: i32[] = [];

    const _displayed: i32[] = [];
    const seen = [false, false, false, false, false, false, false, false];

    let index = 0;
    let aWittleBittyHack = 0;
    do {
        const curr = proof.bitAnd(BigInt.fromString('65535'));
        if (!curr.isZero()) {
            items.push(curr.toI32());
            const feature = curr.div(bigi(1000)).toI32();
            if (index < 8 && !seen[feature]) {
                _displayed.push(curr.toI32());
                seen[feature] = true;
            } else if (index === 9) {
                aWittleBittyHack = curr.toI32();
            }
        }
        index++;
    } while (!(proof = proof.rightShift(16)).isZero());

    const toCreate = difference(items, nugg._items);

    const toDelete = difference(nugg._items, items);

    for (let i = 0; i < toCreate.length; i++) {
        const item = safeLoadItem(BigInt.fromI32(toCreate[i]));

        let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

        if (nuggItem === null) {
            nuggItem = safeNewNuggItem(nugg, item);
            nuggItem.count = BigInt.fromString('0');
            nuggItem.item = item.id;
            nuggItem.nugg = nugg.id;
            nuggItem.displayed = false;
        }
        nuggItem = nuggItem as NuggItem;

        if (incrementItemCount) {
            const feature = bigi(item.idnum).div(bigi(1000)).toI32();

            tmpFeatureTotals[feature]++;
            item.count = item.count.plus(BigInt.fromString('1'));
            item.updatedAt = block.number;
            item.save(); // OK
        }

        // if (_displayed.includes(toCreate[i]))

        nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
        nuggItem.displayed = false;
        nuggItem.updatedAt = block.number;
        nuggItem.save(); // OK
    }

    for (let i = 0; i < toDelete.length; i++) {
        const item = safeLoadItem(BigInt.fromI32(toDelete[i]));
        const nuggItem = safeLoadNuggItemHelper(nugg, item);
        nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));
        nuggItem.displayed = false;
        nuggItem.updatedAt = block.number;
        nuggItem.save(); // OK
    }
    nugg._tmp = aWittleBittyHack;
    nugg._items = items;
    nugg.proof = preload;
    nugg._displayed = _displayed;
    nugg.updatedAt = block.number;
    nugg.save(); // OK
    proto.featureTotals = tmpFeatureTotals;
    proto.updatedAt = block.number;
    proto.save(); // OK

    for (let i = 0; i < items.length; i++) {
        const item = safeLoadItem(bigi(items[i]));

        const nuggItem = safeLoadNuggItemHelper(nugg, item);
        if (_displayed.includes(items[i])) {
            if (!nuggItem.displayed) {
                nuggItem.displayed = true;
                nuggItem.displayedSinceBlock = block.number;
                nuggItem.displayedSinceUnix = block.timestamp;
                nuggItem.updatedAt = block.number;
                nuggItem.save(); // OK
            }
        } else if (nuggItem.displayed) {
            nuggItem.displayed = false;
            nuggItem.displayedSinceBlock = null;
            nuggItem.displayedSinceUnix = null;
            nuggItem.updatedAt = block.number;
            nuggItem.save(); // OK
        }
    }
    log.debug('updateProof OUT args:[{}]', [nugg.id]);

    return nugg;
}

export const calculateMsp = (shares: BigInt, eth: BigInt): BigInt => {
    const ethPerShare = safeDiv(
        eth.times(BigInt.fromI64(10).pow(18)),

        shares,
    );
    const protocolFee = ethPerShare.div(BigInt.fromString('1'));
    const premium = ethPerShare.times(shares).div(BigInt.fromString('2000'));
    const final = ethPerShare.plus(protocolFee).plus(premium);

    return final.div(BigInt.fromI64(10).pow(18));
};

// export const prepSloop(epoch: BigInt, flag: 0 | 1 | 2 | 3, owner: BigInt, tokenId: BigInt, itemId: BigInt): BigInt {
//     let working = BigInt.fromI32(3);

//     working = working.leftShift(254)

//     working = working.bitOr(BigInt.fromI32(epoch.toI32()).leftShift(230));
// }
