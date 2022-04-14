import { Address, BigInt, Bytes, store, log } from '@graphprotocol/graph-ts';
import { NuggftV1 } from '../generated/NuggftV1/NuggftV1';

import { Item, Nugg, NuggItem } from '../generated/schema';
import {
    safeLoadItem,
    safeLoadItemNull,
    safeLoadNuggItemHelper,
    safeLoadNuggItemHelperNull,
    safeLoadProtocol,
    safeNewItem,
    safeNewNuggItem,
} from './safeload';
import { safeDiv } from './uniswap';
import { bigi } from './utils';

export function getDotnuggUserId(nuggftAddress: Address): Address {
    let nuggft = NuggftV1.bind(nuggftAddress);
    let callResult = nuggft.dotnuggV1();
    return callResult;
}

export function getItemURIs(nuggftAddress: Address): void {
    log.info('handleEvent__Write start ', []);

    let nuggft = NuggftV1.bind(nuggftAddress);

    for (let i = 0; i < 8; i++) {
        let amount = nuggft.featureLength(i);
        for (let j = 1; j < amount + 1; j++) {
            let itemId = i * 1000 + j;
            let callResult = nuggft.try_itemURI(bigi(itemId));
            let rarityResult = nuggft.try_rarity(i, j);

            let item = safeNewItem(bigi(itemId));
            item.count = bigi(0);
            item.dotnuggRawCache = callResult.reverted ? 'oops' : callResult.value;
            item.feature = bigi(i);
            item.position = bigi(j);
            item.idnum = itemId;
            item.rarityX16 = rarityResult.reverted ? bigi(0) : bigi(rarityResult.value);
            item.save();
        }
    }
}

export function cacheDotnugg(nugg: Nugg, blockNum: i32): void {
    let proto = safeLoadProtocol();

    // if (blockNum > 10276528) {
    let dotnugg = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    let callResult = dotnugg.try_imageURI(bigi(nugg.idnum));

    let arr: string[] = [];

    // if (callResult.reverted) {
    //     for (var i = 0; i < 5; i++) {
    //         log.warning('trying chunk for nugg: ' + nugg.id, [i.toString()]);
    //         callResult = dotnugg.try_chunk(
    //             Address.fromString(proto.nuggftUser),
    //             nugg.idnum,
    //             Address.fromString(nugg.resolver),
    //             false,
    //             false,
    //             false,
    //             true,
    //             Bytes.empty(),
    //             5,
    //             i,
    //         );

    //         if (callResult.reverted) break;

    //         arr.push(callResult.value);
    //     }
    // } else {
    //     arr.push(callResult.value);
    // }

    if (!callResult.reverted) {
        arr.push(callResult.value);

        // nugg.dotnuggRawCache = callResult.value.value1.map<string>((x: BigInt): string => x.toHexString()).join('');
        nugg.dotnuggRawCache = '';
        // const svg = drawSvg(callResult.value.value1);
        if (proto.nuggsNotCached.includes(nugg.id)) {
            let tmp: string[] = [];
            for (let i = 0; i < proto.nuggsNotCached.length; i++) {
                if (proto.nuggsNotCached[i] != nugg.id) {
                    tmp.push(proto.nuggsNotCached[i]);
                }
            }
            proto.nuggsNotCached = tmp;
            proto.save();
        }

        nugg.dotnuggRawCache = arr.join('');
        nugg.dotnuggSvgCache = [];
        // log.info('ABCD2 ' + svg.length.toString(), []);
        // if (arr.length == 1) {
        //     nugg.dotnuggRawCache = callResult.value;
        //     nugg.dotnuggSvgCache = [];
        // } else {
        //     nugg.dotnuggRawCache = '';
        //     nugg.dotnuggSvgCache = arr;
        // }

        // log.info('ABCD3 ' + svg.length.toString(), []);

        log.info('cacheDotnugg updated dotnugg cache', []);
    } else {
        if (nugg.dotnuggRawCache == null || nugg.dotnuggRawCache == '') {
            nugg.dotnuggRawCache = 'ERROR_WITH_DOTNUGG_CACHE: try getting data on chain';
            nugg.dotnuggSvgCache = [];
            let tmp = proto.nuggsNotCached as string[];
            tmp.push(nugg.id as string);
            proto.nuggsNotCached = tmp as string[];
            proto.save();
        }

        log.info('cacheDotnugg reverted with default resolver', []);
    }

    nugg.save();
    // } else {
    //     let tmp = proto.nuggsNotCached as string[];
    //     tmp.push(nugg.id as string);
    //     proto.nuggsNotCached = tmp as string[];
    //     proto.save();
    // }
}

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.staked();
    proto.nuggftStakedShares = nuggft.shares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}

export function updateProof(nugg: Nugg, preload: BigInt, incrementItemCount: boolean): void {
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    if (preload.equals(BigInt.fromI32(0))) {
        let res = nuggft.try_proofOf(nugg.idnum);

        if (res.reverted) return;

        preload = res.value;
    }

    let proof = preload;

    let items: i32[] = [];

    let _displayed: i32[] = [];
    let seen = [false, false, false, false, false, false, false, false];

    let index = 0;

    do {
        let curr = proof.bitAnd(BigInt.fromString('65535'));
        if (!curr.isZero()) {
            items.push(curr.toI32());
            let feature = curr.div(bigi(1000)).toI32();
            if (index < 8 && !seen[feature]) {
                _displayed.push(curr.toI32());
                seen[feature] = true;
            }
        }
        index++;
    } while (!(proof = proof.rightShift(16)).isZero());

    let toCreate = difference(items, nugg._items);

    let toDelete = difference(nugg._items, items);

    for (let i = 0; i < toCreate.length; i++) {
        let item = safeLoadItem(BigInt.fromI32(toCreate[i]));

        // if (item === null) {
        //     item = safeNewItem(BigInt.fromI32(toCreate[i]));
        //     item.count = BigInt.fromString('0');
        //     item.save();
        // }
        // item = item as Item;
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
        // if (nuggItem.count.isZero()) {
        nuggItem.displayed = false;
        // }
        nuggItem.save();
        // }
    }

    nugg._items = items;

    nugg.save();

    proto.save();

    for (let i = 0; i < items.length; i++) {
        let item = safeLoadItem(bigi(items[i]));

        let nuggItem = safeLoadNuggItemHelper(nugg, item);
        if (_displayed.includes(items[i])) {
            if (!nuggItem.displayed) {
                nuggItem.displayed = true;
                nuggItem.save();
            }
        } else {
            if (nuggItem.displayed) {
                nuggItem.displayed = false;
                nuggItem.save();
            }
        }
    }
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
