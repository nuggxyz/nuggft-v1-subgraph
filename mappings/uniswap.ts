import { BigInt } from '@graphprotocol/graph-ts';

import { Protocol } from '../generated/schema';

import { safeDiv } from './utils';

export function wethToUsdc(num: BigInt): BigInt {
    const proto = Protocol.load('0x42069');
    if (proto == null) {
        return BigInt.fromString('0');
    }
    const res = num.times(proto.priceUsdcWeth);
    return res.div(ONEe18);
}

let ONEe18 = BigInt.fromI32(10).pow(18);
const ONEe36 = BigInt.fromI32(10).pow(18 * 2 + 12);

const Q192 = BigInt.fromI32(2).pow(192);

export function sqrtPriceX96(prc: BigInt): BigInt {
    const num = prc.times(prc).times(ONEe18);
    const denom = Q192;
    const price1 = num.div(denom);
    const price0 = safeDiv(ONEe36, price1);
    return price0;
}
