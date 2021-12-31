import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { DotnuggV1Processor } from '../generated/local/NuggFT/DotnuggV1Processor';
import { NuggFT } from '../generated/local/NuggFT/NuggFT';
import { Item, Nugg, NuggItem } from '../generated/local/schema';
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

export function getDotnuggUserId(nuggftAddress: Address): Address {
    let nuggft = NuggFT.bind(nuggftAddress);
    let callResult = nuggft.dotnuggV1Processor();
    return callResult;
}

export function cacheDotnugg(nugg: Nugg): void {
    let proto = safeLoadProtocol('0x42069');

    let dotnugg = DotnuggV1Processor.bind(Address.fromString(proto.dotnuggV1Processor));
    let callResult = dotnugg.try_dotnuggToRaw(Address.fromString(proto.nuggftUser), nugg.idnum, Address.fromString(nugg.resolver), 45, 10);

    if (callResult.reverted) {
        log.info('cacheDotnugg reverted with user defined resolver', []);

        callResult = dotnugg.try_dotnuggToRaw(Address.fromString(proto.nuggftUser), nugg.idnum, Address.fromString(proto.nullUser), 45, 10);
    }

    if (!callResult.reverted) {
        nugg.dotnuggRawCache = callResult.value.value1.map<string>((x: BigInt): string => x.toHexString()).join('');

        log.info('cacheDotnugg updated dotnugg cache', []);
    } else {
        if (nugg.dotnuggRawCache === null || nugg.dotnuggRawCache === '') {
            nugg.dotnuggRawCache = 'ERROR_WITH_DOTNUGG_CACHE: try getting data on chain';
        }

        log.info('cacheDotnugg reverted with default resolver', []);
    }

    nugg.save();
}
// nuggs (first:5) {
//     dotnuggRawCache
//   }

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.stakedShares();
    proto.nuggftStakedShares = nuggft.stakedShares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}

export function updateProof(nugg: Nugg): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));

    let res = nuggft.try_proofToDotnuggMetadata(nugg.idnum);

    if (!res.reverted) {
        let proof = res.value.value0;

        let items: i32[] = [];

        items.push(proof.bitAnd(BigInt.fromString('7')).toI32());

        proof = proof.rightShift(3);

        do {
            let curr = proof.bitAnd(BigInt.fromString('2047')).toI32();
            if (curr != 0) {
                items.push(curr);
            }
        } while (!(proof = proof.rightShift(11)).isZero());

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
