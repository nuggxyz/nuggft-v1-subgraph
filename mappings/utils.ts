import { BigInt, Bytes, Address, log } from '@graphprotocol/graph-ts';

export function bigi(num: i32): BigInt {
    return BigInt.fromI32(num);
}

export function bigs(num: string): BigInt {
    return BigInt.fromString(num);
}

export function bigb(num: Bytes): BigInt {
    return b32toBigEndian(num);
}

export function addr_i(num: BigInt): Address {
    return Address.fromString(`0x${num.toHex().replace('0x', '').padStart(40, '0')}`);
}

export function bighs(num: string): BigInt {
    return BigInt.fromByteArray(Bytes.fromHexString(num));
}

export function addr_b(num: Bytes): Address {
    return Address.fromString(bigb(num).toHexString());
}
export function addrs(num: string): Address {
    return Address.fromString(num);
}
export function b32toBigEndian(num: Bytes): BigInt {
    const val = Bytes.fromUint8Array(num.reverse());
    return BigInt.fromUnsignedBytes(val);
}

export const MAX_UINT160 = BigInt.fromString('1').leftShift(160).minus(BigInt.fromString('1'));

export function difference(arr1: i32[], arr2: i32[]): i32[] {
    const tmp: i32[] = [];
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

export const ONE = BigInt.fromString('1');

export function mask(bits: number): BigInt {
    return BigInt.fromString('1')
        .leftShift(bits as u8)
        .minus(BigInt.fromString('1'));
}

export function makeIncrementX64(lead: BigInt, last: BigInt): BigInt {
    log.info('makeIncrementX64 [lead:{},last:{}]', [lead.toString(), last.toString()]);

    if (last.isZero()) return last;

    const a = lead.minus(last);
    const b = a.times(mask(64));
    return b.div(last);
}

export function invariant(test: boolean, error: string): void {
    if (!test) {
        log.debug(error, []);
        log.critical(error, []);
    }
}

export function panicFatal(error: string): void {
    log.error(error, []);
    log.critical(error, []);
}

export function panic(error: string): void {
    log.debug(error, []);
    log.critical(error, []);
}

export function safeDiv(amount0: BigInt, amount1: BigInt): BigInt {
    if (amount1.equals(BigInt.fromString('0'))) {
        return BigInt.fromString('0');
    }
    return amount0.div(amount1);
}
