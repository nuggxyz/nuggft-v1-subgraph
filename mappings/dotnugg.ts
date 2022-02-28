import { Address, BigInt, log } from '@graphprotocol/graph-ts';
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
            let itemId = (i << 8) | j;
            let callResult = nuggft.try_itemURI((i << 8) | j);

            let item = safeNewItem(bigi(itemId));
            item.count = bigi(0);
            item.dotnuggRawCache = callResult.reverted ? 'oops' : callResult.value;
            item.feature = bigi(i);
            item.position = bigi(j);
            item.save();
        }
    }
}

export function cacheDotnugg(nugg: Nugg): void {
    let proto = safeLoadProtocol();

    let dotnugg = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    let callResult = dotnugg.try_imageURI(nugg.idnum);

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
            let tmp = proto.nuggsNotCached;
            // tmp.push(nugg.id);
            // proto.nuggsNotCached = tmp;
            // proto.save();
        }

        log.info('cacheDotnugg reverted with default resolver', []);
    }

    nugg.save();
}

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.staked();
    proto.nuggftStakedShares = nuggft.shares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}

export function updateProof(nugg: Nugg): void {
    let proto = safeLoadProtocol();
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    let res = nuggft.try_proofOf(nugg.idnum);

    if (!res.reverted) {
        let proof = res.value;

        let items: i32[] = [];

        do {
            let curr = proof.bitAnd(BigInt.fromString('65535')).toI32();
            if (curr != 0) {
                items.push(curr);
            }
        } while (!(proof = proof.rightShift(16)).isZero());

        let toCreate = difference(items, nugg._items);

        let toDelete = difference(nugg._items, items);

        for (let i = 0; i < toCreate.length; i++) {
            let item = safeLoadItemNull(BigInt.fromI32(toCreate[i]));
            if (item == null) {
                item = safeNewItem(BigInt.fromI32(toCreate[i]));
                item.count = BigInt.fromString('0');
                item.save();
            }
            item = item as Item;
            let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

            if (nuggItem == null) {
                nuggItem = safeNewNuggItem(nugg, item);
                nuggItem.count = BigInt.fromString('0');
                nuggItem.item = item.id;
                nuggItem.nugg = nugg.id;
            }
            nuggItem = nuggItem as NuggItem;

            nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
            nuggItem.save();
        }

        for (let i = 0; i < toDelete.length; i++) {
            let item = safeLoadItem(BigInt.fromI32(toDelete[i]));

            let nuggItem = safeLoadNuggItemHelper(nugg, item);

            nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

            nuggItem.save();
        }

        nugg._items = items;

        nugg.save();
    }

    proto.save();
}
export function difference(arr1: i32[], arr2: i32[]): i32[] {
    // var set1 = new Set<BigInt>(arr1);
    // var set2 = new Set<BigInt>(arr2);
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
