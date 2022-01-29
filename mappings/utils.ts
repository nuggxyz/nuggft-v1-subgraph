import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';

export function bigi(num: i32): BigInt {
    return BigInt.fromI32(num);
}

export function bigb(num: Bytes): BigInt {
    return BigInt.fromUnsignedBytes(num);
}

export function addr_i(num: BigInt): Address {
    return Address.fromString(num.toHexString());
}

export function addr_b(num: Bytes): Address {
    return Address.fromString(bigb(num).toHexString());
}

export const MAX_UINT160 = BigInt.fromString('1').leftShift(160).minus(BigInt.fromString('1'));
