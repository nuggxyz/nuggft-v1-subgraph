import { BigInt } from '@graphprotocol/graph-ts';

import { Protocol } from '../generated/local/schema';
import { Swap } from '../generated/local/UniswapV3PoolUsdc/UniswapV3Pool';

export function handleWethUsdcUniswap(event: Swap): void {
    let proto = Protocol.load('0x42069');
    if (proto != null) {
        proto.priceUsdcWeth = sqrtPriceX96(event.params.sqrtPriceX96);
        proto.save();
    }
}

export function handleWethXNuggUniswap(event: Swap): void {
    let proto = Protocol.load('0x42069');
    if (proto != null) {
        proto.priceWethXnugg = sqrtPriceX96(event.params.sqrtPriceX96);
        proto.save();
    }
}

export function wethToUsdc(num: BigInt): BigInt {
    let proto = Protocol.load('0x42069');
    if (proto == null) {
        return BigInt.fromString('0');
    }
    let res = num.times(proto.priceUsdcWeth);
    return res.div(ONEe18);
}

export function xnuggToWeth(num: BigInt): BigInt {
    let proto = Protocol.load('0x42069');
    if (proto == null) {
        return BigInt.fromString('0');
    }
    let res = num.times(proto.priceWethXnugg);
    return res.div(ONEe18);
}

let ONEe18 = BigInt.fromI32(10).pow(18);
let ONEe36 = BigInt.fromI32(10).pow(18 * 2 + 12);

let Q192 = BigInt.fromI32(2).pow(192);

export function sqrtPriceX96(sqrtPriceX96: BigInt): BigInt {
    let num = sqrtPriceX96.times(sqrtPriceX96).times(ONEe18);
    let denom = Q192;
    let price1 = num.div(denom);
    let price0 = safeDiv(ONEe36, price1);
    return price0;
}

// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigInt, amount1: BigInt): BigInt {
    if (amount1.equals(BigInt.fromString('0'))) {
        return BigInt.fromString('0');
    } else {
        return amount0.div(amount1);
    }
}
