import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';
import { DotnuggV1Processor } from '../generated/local/NuggFT/DotnuggV1Processor';
import { NuggFT } from '../generated/local/NuggFT/NuggFT';
import { Item, Nugg, NuggItem, User } from '../generated/local/schema';
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
    let callResult = dotnugg.try_dotnuggToString(
        Address.fromString(proto.nuggftUser),
        nugg.idnum,
        Address.fromString(nugg.resolver),
        63,
        0,
    );

    if (!callResult.reverted) {
        // nugg.dotnuggRawCache = callResult.value.value1.map<string>((x: BigInt): string => x.toHexString()).join('');
        nugg.dotnuggRawCache = callResult.value.value1;
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

        // log.info('ABCD2 ' + svg.length.toString(), []);

        nugg.dotnuggSvgCache = [];

        // log.info('ABCD3 ' + svg.length.toString(), []);

        log.info('cacheDotnugg updated dotnugg cache', []);
    } else {
        if (nugg.dotnuggRawCache == null || nugg.dotnuggRawCache == '') {
            nugg.dotnuggRawCache = 'ERROR_WITH_DOTNUGG_CACHE: try getting data on chain';
            nugg.dotnuggSvgCache = [];
            let tmp = proto.nuggsNotCached;
            tmp.push(nugg.id);
            proto.nuggsNotCached = tmp;
            proto.save();
        }

        log.info('cacheDotnugg reverted with default resolver', []);
    }

    nugg.save();
}

// function decompressA(a: BigInt): BigInt {
//     if (a.equals(BigInt.fromString('7'))) return BigInt.fromString('255');
//     else return a.times(BigInt.fromString('36'));
// }

// function getPixelAt(arr: BigInt[], x: u32, y: u32, width: u32): BigInt {
//     const index = BigInt.fromI32(x + y * width);

//     const pix = arr[i32(Math.floor(index.div(BigInt.fromI32(6)).toI32()))].rightShift(
//         u8(
//             BigInt.fromI32(42)
//                 .times(index.mod(BigInt.fromI32(6)))
//                 .toI32(),
//         ),
//     );

//     const a = decompressA(pix.bitAnd(BigInt.fromString('7')));
//     const rgb_ = pix.leftShift(5).bitAnd(BigInt.fromString('4294967040'));
//     return rgb_.bitOr(a);

// const val = arr[Math.floor(index / 6)].rightShift(42 * (index % 6)).bitAnd(BigInt.fromString('0xffffffffff'));

// const c2 = color.replace('0x', '').padStart(8, '0');

// return c2;

// {
//     color: color2 === '#00000000' ? 'nope' : color2,
//     id: val.shr(27).and('0xff').toNumber(),
//     z: val.shr(35).and('0xf').toNumber(),
//     feature: val.shr(39).and('0x7').toNumber(),
// };
// }

// function getPixelAt2(arr: BigInt[], x: u32, y: u32, width: u32): BigInt {
//     const index = BigInt.fromString((x + y * width).toString());

//     const pix__ = arr[index.div(BigInt.fromString('6')).toI32()].rightShift(u8(42 * index.mod(BigInt.fromString('6')).toI32()));

//     const pix = pix__.bitAnd(BigInt.fromString('4294967295'));

//     const a = decompressA(pix.bitAnd(BigInt.fromI32(7)));

//     const rgb__ = pix.leftShift(5);
//     const col__ = rgb__.bitOr(a);

//     // const val = arr[Math.floor(index / 6)].rightShift(42 * (index % 6)).bitAnd(BigInt.fromString('0xffffffffff'));

//     return col__;
// }

// function drawSvg(_input: BigInt[]): BigInt[] {
//     const usethis: BigInt[] = [];

//     log.info('herehehehe ' + _input.length.toString(), []);

//     for (var i = 0; i < _input.length; i++) {
//         // console.log(_input[i]._hex);

//         // byteLen += _input[i]._hex.length;

//         let numzeros = _input[i].bitAnd(BigInt.fromI32(0xf));

//         if (numzeros.equals(BigInt.fromI32(0xf))) {
//             numzeros = _input[i++].rightShift(4);
//         }

//         for (var j = 0; j < numzeros.toI32(); j++) {
//             usethis.push(BigInt.fromI32(0));
//         }

//         usethis.push(_input[i].rightShift(4));
//     }

//     const width: u8 = 63;
//     const height: u8 = 63;

//     log.info('c ', []);

//     let last = getPixelAt(usethis, 0, 0, width);
//     let count: u8 = 1;

//     let mapper: string[] = [];

//     let res2: BigInt[] = [];

//     for (let y: u8 = 0; y < height; y++) {
//         for (let x: u8 = 0; x < width; x++) {
//             if (y == 0 && x == 0) x++;
//             let curr = getPixelAt(usethis, x, y, width);
//             if (curr.equals(last)) {
//                 count++;
//                 continue;
//             } else {
//                 // if (curr != 0) {
//                 if (!mapper.includes(last.toString())) {
//                     mapper.push(last.toString());
//                 }
//                 res2.push(getRekt2(u8(mapper.indexOf(last.toString())), x - count, y, count));
//                 // }
//                 last = curr;
//                 count = 1;
//             }
//         }

//         // if (last != 0) {
//         if (!mapper.includes(last.toString())) {
//             mapper.push(last.toString());
//         }
//         res2.push(getRekt2(u8(mapper.indexOf(last.toString())), width - count, y, count));
//         // }
//         last = BigInt.fromString('0');
//         count = 0;
//     }
//     log.info('c ', []);

//     // mapper.push(0);
//     // mapper.concat();
//     // res2 =
//     //     .concat([BigInt.fromI32(0)])
//     //     .concat();

//     log.info('ABCD ' + res2.length.toString(), []);

//     return [BigInt.fromI32(mapper.length)].concat(mapper.map<BigInt>((x) => BigInt.fromString(x)).concat(res2.filter((x) => !x.isZero())));
// }

// const getRekt2 = (color: u8, x: u8, y: u8, xlen: u8): BigInt => {
//     let res: u32 = 0;

//     // if (color == 0) return BigInt.fromI32(0);

//     res |= u32(color); // 8 bits
//     res |= u32(x) << 8; // 6 bits
//     res |= u32(y) << 16; // 6 bits
//     res |= u32(xlen) << 24; // 6 bits
//     // res |= ylen  --- always 1 * zoom

//     return BigInt.fromString(res.toString());
// };

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.stakedEth();
    proto.nuggftStakedShares = nuggft.stakedShares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}

export function getCurrentUserOffer(user: User, nugg: Nugg): BigInt {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));
    let res = nuggft.valueForDelegate(Address.fromString(user.id), BigInt.fromString(nugg.id));
    return res.value1;
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
