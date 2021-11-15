import { BigDecimal, BigInt, ethereum, store } from '@graphprotocol/graph-ts';
import { MARKET_ID, ONE, safeCreateMarket, safeLoadMarket, ZERO } from './nuggswap';

import { onEveryEvent } from './intervals';
import { Swap } from '../generated/ropsten/UniswapV3Pool/UniswapV3Pool';

export function handleSwap(event: Swap): void {
    let market = safeCreateMarket(event);
    market.ethPriceUsd = sqrtPriceX96(event.params.sqrtPriceX96);
    market.save();
    onEveryEvent(event);
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

export function toUsd(num: BigInt): BigInt {
    let market = safeLoadMarket(MARKET_ID);
    let res = num.times(market.ethPriceUsd);
    return res.div(ONEe18);
}
// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigInt, amount1: BigInt): BigInt {
    if (amount1.equals(ZERO)) {
        return ZERO;
    } else {
        return amount0.div(amount1);
    }
}
