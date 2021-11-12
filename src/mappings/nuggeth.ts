import { RewardIncrease, SharesDecrease, SharesIncrease, TokenEarn } from './../generated/local/NuggETH/NuggETH';
import { RewardTransfer, Swap } from '../generated/local/schema';
import {
    MARKET_ID,
    safeCreateAccount,
    safeCreateMarket,
    safeLoadAccount,
    safeLoadMarket,
    sentByMinter,
    sentBySeller,
    ONE,
    ZERO,
    Q128,
} from './auction';
import { safeDiv, toUsd } from './oracle';
import { onDeposit, onEpsX128Increase, onEveryEvent, onMintRoyalties, onOtherRoyalties, onSaleRoyalties, onWithdraw } from './intervals';
import { Address, BigInt } from '@graphprotocol/graph-ts';

// export function handleLaunched(event: Launched): void {
//     let bs = safeCreateMarket(event);
//     bs.save();
// }

// export function safeCreatePosition(id: string): Position {}

// export function safeCreateRewardTransfer(id: string): RewardTransfer {}

export function handleRewardIncrease(event: RewardIncrease): void {
    let market = safeLoadMarket(MARKET_ID);

    const id = 'rt-'.concat(event.transaction.hash.toHexString());

    let transaction = new RewardTransfer(id);
    transaction.from = event.params.sender;
    transaction.timestamp = event.block.timestamp;
    transaction.amount = event.params.amount;
    transaction.amountUsd = toUsd(event.params.amount);
    transaction.blockNumber = event.block.number;
    transaction.market = MARKET_ID;

    transaction.shares = market.shares;
    transaction.beforeTvl = market.tvl;
    transaction.beforeTvlUsd = market.tvlUsd;

    transaction.epsX128 = safeDiv(event.params.amount.times(Q128), market.shares);
    transaction.epsX128Usd = toUsd(transaction.epsX128);

    // transaction.epsX128 = ZERO;
    // transaction.epsX128Usd = ZERO;

    market.tvl = market.tvl.plus(event.params.amount);
    market.tvlUsd = toUsd(market.tvl);

    transaction.afterTvl = market.tvl;
    transaction.afterTvlUsd = market.tvlUsd;

    market.save();
    transaction.save();

    // onEpsX128Increase(event, transaction.epsX128, transaction.epsX128Usd);

    if (sentByMinter(event.params.sender, market.minter)) {
        onMintRoyalties(event, event.params.amount);
    } else if (sentBySeller(event.params.sender, market.seller)) {
        onSaleRoyalties(event, event.params.amount);
    } else {
        onOtherRoyalties(event, event.params.amount);
    }
}

export function handleSharesIncrease(event: SharesIncrease): void {
    let market = safeLoadMarket(MARKET_ID);
    let account = safeCreateAccount(event.params.account.toHexString());
    const supplyIncrease = event.params.amount;
    let sharesIncrease = event.params.amount;

    if (!market.tvl.equals(ZERO)) {
        sharesIncrease = safeDiv(supplyIncrease.times(market.shares), market.tvl);
    }

    const id = 'deposit-'.concat(event.transaction.hash.toHexString());
    let transaction = new Swap(id);

    transaction.account = account.id;
    transaction.amount = supplyIncrease;
    transaction.amountUsd = toUsd(supplyIncrease);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.index = account.totalSwaps;
    transaction.market = MARKET_ID;
    transaction.beforeAccountShares = account.shares;
    transaction.beforeMarketShares = market.shares;
    transaction.beforeTvl = market.tvl;
    transaction.beforeTvlUsd = market.tvlUsd;
    transaction.deposit = true;

    account.shares = account.shares.plus(sharesIncrease);
    account.deposits = account.deposits.plus(supplyIncrease);
    account.depositsUsd = account.depositsUsd.plus(toUsd(supplyIncrease));
    account.totalSwaps = account.totalSwaps.plus(ONE);

    market.shares = market.shares.plus(sharesIncrease);

    market.tvl = market.tvl.plus(supplyIncrease);
    market.tvlUsd = toUsd(market.tvl);

    transaction.afterAccountShares = account.shares;
    transaction.afterMarketShares = market.shares;
    transaction.afterTvl = market.tvl;
    transaction.afterTvlUsd = market.tvlUsd;

    market.save();
    account.save();
    transaction.save();

    onDeposit(event, event.params.amount);
}

export function handleSharesDecrease(event: SharesDecrease): void {
    let market = safeLoadMarket(MARKET_ID);
    let account = safeCreateAccount(event.params.account.toHex());

    const supplyDecrease = event.params.amount;

    let sharesDecrease = event.params.amount;

    if (!market.tvl.equals(ZERO)) {
        sharesDecrease = safeDiv(supplyDecrease.times(market.shares), market.tvl);
    }

    const id = 'withdraw-'.concat(event.transaction.hash.toHexString());
    let transaction = new Swap(id);

    transaction.account = account.id;
    transaction.amount = supplyDecrease.neg();
    transaction.amountUsd = toUsd(supplyDecrease).neg();
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.index = account.totalSwaps;
    transaction.market = MARKET_ID;
    transaction.beforeAccountShares = account.shares;
    transaction.beforeMarketShares = market.shares;
    transaction.beforeTvl = market.tvl;
    transaction.beforeTvlUsd = market.tvlUsd;
    transaction.deposit = false;

    account.shares = account.shares.minus(sharesDecrease);
    account.withdrawals = account.withdrawals.plus(supplyDecrease);
    account.withdrawalsUsd = account.withdrawalsUsd.plus(toUsd(supplyDecrease));
    account.totalSwaps = account.totalSwaps.plus(ONE);

    market.shares = market.shares.minus(sharesDecrease);
    market.tvl = market.tvl.minus(supplyDecrease);
    market.tvlUsd = toUsd(market.tvl);

    transaction.afterAccountShares = account.shares;
    transaction.afterMarketShares = market.shares;
    transaction.afterTvl = market.tvl;
    transaction.afterTvlUsd = market.tvlUsd;

    market.save();
    account.save();
    transaction.save();

    onWithdraw(event, event.params.amount);
}

export function handleTokenEarn(event: TokenEarn): void {
    let market = safeLoadMarket(MARKET_ID);
    let account = safeCreateAccount(event.params.account.toHex());

    account.earnings = account.earnings.plus(event.params.amount);
    account.earningsUsd = account.earningsUsd.plus(toUsd(event.params.amount));

    market.save();
    account.save();

    // onWithdraw(event, event.params.amount);
}
