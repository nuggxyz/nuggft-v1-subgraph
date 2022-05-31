import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';

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
    return Address.fromString('0x' + num.toHex().replace('0x', '').padStart(40, '0'));
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
    const abc = Bytes.fromUint8Array(num.reverse());
    return BigInt.fromUnsignedBytes(abc);
    // // return changetype<BigInt>(num.reverse());

    // num.to
    // return BigInt.fromByteArray(Bytes.fromHexString(num.toHexString()));
}

export const MAX_UINT160 = BigInt.fromString('1').leftShift(160).minus(BigInt.fromString('1'));
