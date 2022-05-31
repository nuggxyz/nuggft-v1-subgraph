import { Address, BigInt, Bytes, store, log, ethereum } from '@graphprotocol/graph-ts';
import { NuggftV1, Genesis } from '../generated/NuggftV1/NuggftV1';

import { Item, Nugg, NuggItem, User } from '../generated/schema';
import {
    safeLoadItem,
    safeLoadItemNull,
    safeLoadNuggItemHelper,
    safeLoadNuggItemHelperNull,
    safeLoadProtocol,
    safeNewActiveNuggSnapshot,
    safeNewItem,
    safeNewNuggItem,
    safeSetNewActiveItemSnapshot,
    safeSetNuggActiveSwap,
} from './safeload';
import { safeDiv } from './uniswap';
import { bighs, bigi, bigs, b32toBigEndian } from './utils';
import { safeNewNugg, safeNewItemSwap } from './safeload';
import { _epsFromStake, _mint } from './nuggft';
import { xNuggftV1 } from '../generated/NuggftV1/xNuggftV1';
import { _sell } from './swap';
import { _sellItem } from './itemswap';
import { LOSS } from './constants';

export function getDotnuggUserId(nuggftAddress: Address): Address {
    let nuggft = NuggftV1.bind(nuggftAddress);
    let callResult = nuggft.dotnuggv1();
    return callResult;
}

export function getPremints(
    event: Genesis,
    nuggftAddress: Address,
    owner: User,
    block: ethereum.Block,
): void {
    log.info('handleEvent__Write start ', []);

    let nuggft = NuggftV1.bind(nuggftAddress);

    let res = nuggft.premintTokens();

    let first = res.value0;
    let last = res.value1;

    let eps = nuggft.eps();

    for (let i = first; i <= last; i++) {
        let nugg = safeNewNugg(bigi(i), owner.id, bigi(1), event.block);

        nugg.pendingClaim = true;

        nugg.save();

        let agency = bigi(1).leftShift(254).plus(bighs(owner.id));

        _mint(i, agency, event.transaction.hash, eps, BigInt.zero(), block);

        _sellItem(event, BigInt.zero(), i, nugg._tmp, BigInt.zero());

        _sell(event, BigInt.zero(), i);
    }
}

export function getItemURIs(xnuggftAddress: Address): void {
    log.info('handleEvent__Write start ', []);

    let xnuggftv1 = xNuggftV1.bind(xnuggftAddress);

    for (let i = 0; i < 8; i++) {
        let amount = xnuggftv1.featureSupply(i).toI32();
        for (let j = 1; j < amount + 1; j++) {
            let itemId = i * 1000 + j;
            let callResult = xnuggftv1.try_imageSVG(bigi(itemId));
            let rarityResult = xnuggftv1.try_rarity(bigi(itemId));

            let item = safeNewItem(bigi(itemId));
            item.count = bigi(0);
            item.dotnuggRawCache = callResult.reverted ? 'ERROR' : callResult.value;

            item.feature = bigi(i);
            item.position = bigi(j);
            item.idnum = itemId;
            item.rarityX16 = rarityResult.reverted ? bigi(0) : bigi(rarityResult.value);
            item.save();

            if (!callResult.reverted) safeSetNewActiveItemSnapshot(item, callResult.value);
            else safeSetNewActiveItemSnapshot(item, 'ERROR');
        }
    }
    log.info('handleEvent__Write end ', []);
}

export function cacheDotnugg(nugg: Nugg, blocknum: BigInt): Nugg {
    log.info('cacheDotnugg start [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);

    let proto = safeLoadProtocol();

    log.info('A', []);

    let snap = safeNewActiveNuggSnapshot(nugg, nugg.user, blocknum);
    log.info('B', []);

    if (snap === null) {
        log.info('cacheDotnugg end (early) [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);

        return nugg;
    }
    log.info('C', []);

    // if (blockNum > 10276528) {
    let dotnugg = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    log.info('D', []);

    let callResult = dotnugg.try_imageSVG(bigi(nugg.idnum));
    log.info('E', []);

    let str = '';

    if (!callResult.reverted) {
        str = callResult.value;
    } else {
        let value = new Bytes(0);
        for (let a = 1; a <= 3; a++) {
            let callResult = dotnugg.try_image123(bigi(nugg.idnum), false, a, value);

            if (callResult.reverted) {
                log.error('cacheDotnugg reverted trying to 123 [NuggId:{}] [chunk:{}/3]', [
                    nugg.id,
                    a.toString(),
                ]);
                snap.chunk = 'ERROR';
                snap.chunkError = true;
                snap.save();

                nugg.dotnuggRawCache = 'ERROR';
                nugg.activeSnapshot = snap.id;
                nugg.save();

                return nugg;
            }

            value = callResult.value;
        }

        str = value.toString();
    }

    nugg.dotnuggRawCache = str;

    snap.chunk = str;
    snap.chunkError = false;
    snap.save();
    nugg.activeSnapshot = snap.id;

    nugg.save();
    log.info('cacheDotnugg end [Nugg:{},blocknum:{}]', [nugg.id, blocknum.toString()]);

    return nugg;
}

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.staked();
    proto.nuggftStakedShares = nuggft.shares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}

export function updateProof(
    nugg: Nugg,
    preload: BigInt,
    incrementItemCount: boolean,
    block: ethereum.Block,
): Nugg {
    log.debug('updateProof IN args:[{}]', [nugg.id]);
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    let tmpFeatureTotals = proto.featureTotals;

    if (preload.equals(BigInt.zero())) {
        let res = nuggft.try_proofOf(nugg.idnum);

        if (res.reverted) return nugg;

        preload = res.value;
    }

    let proof = preload;

    let items: i32[] = [];

    let _displayed: i32[] = [];
    let seen = [false, false, false, false, false, false, false, false];

    let index = 0;
    let aWittleBittyHack = 0;
    do {
        let curr = proof.bitAnd(BigInt.fromString('65535'));
        if (!curr.isZero()) {
            items.push(curr.toI32());
            let feature = curr.div(bigi(1000)).toI32();
            if (index < 8 && !seen[feature]) {
                _displayed.push(curr.toI32());
                seen[feature] = true;
            } else if (index === 9) {
                aWittleBittyHack = curr.toI32();
            }
        }
        index++;
    } while (!(proof = proof.rightShift(16)).isZero());

    let toCreate = difference(items, nugg._items);

    let toDelete = difference(nugg._items, items);

    for (let i = 0; i < toCreate.length; i++) {
        let item = safeLoadItem(BigInt.fromI32(toCreate[i]));

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
            let feature = bigi(item.idnum).div(bigi(1000)).toI32();

            tmpFeatureTotals[feature]++;
            item.count = item.count.plus(BigInt.fromString('1'));
            item.save();
        }

        // if (_displayed.includes(toCreate[i]))

        nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
        nuggItem.displayed = false;
        nuggItem.save();
    }

    for (let i = 0; i < toDelete.length; i++) {
        let item = safeLoadItem(BigInt.fromI32(toDelete[i]));
        let nuggItem = safeLoadNuggItemHelper(nugg, item);
        nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));
        nuggItem.displayed = false;
        nuggItem.save();
    }
    nugg._tmp = aWittleBittyHack;
    nugg._items = items;
    nugg.proof = preload;
    nugg._displayed = _displayed;

    nugg.save();
    proto.featureTotals = tmpFeatureTotals;
    proto.save();

    for (let i = 0; i < items.length; i++) {
        let item = safeLoadItem(bigi(items[i]));

        let nuggItem = safeLoadNuggItemHelper(nugg, item);
        if (_displayed.includes(items[i])) {
            if (!nuggItem.displayed) {
                nuggItem.displayed = true;
                nuggItem.displayedSinceBlock = block.number;
                nuggItem.displayedSinceUnix = block.timestamp;
                nuggItem.save();
            }
        } else {
            if (nuggItem.displayed) {
                nuggItem.displayed = false;
                nuggItem.displayedSinceBlock = null;
                nuggItem.displayedSinceUnix = null;
                nuggItem.save();
            }
        }
    }
    log.debug('updateProof OUT args:[{}]', [nugg.id]);

    return nugg;
}
export function difference(arr1: i32[], arr2: i32[]): i32[] {
    let tmp: i32[] = [];
    for (let i = 0; i < arr1.length; i++) {
        if (!arr2.includes(arr1[i])) {
            tmp.push(arr1[i]);
        }
    }
    return tmp;
}

export function duplicates(arr1: BigInt[]): BigInt[] {
    return arr1.filter((item, index) => arr1.indexOf(item) !== index);
}
