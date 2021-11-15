import { ONE, Q256, safeCreateMarket } from './nuggswap';
import { ZERO } from './nuggswap';
import { MARKET_ID } from './nuggswap';
import { ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { toUsd } from './oracle';
import { Market, NuggETHHourData, NuggFTDayData, NuggFTHourData } from '../generated/local/schema';
import { NuggETHDayData } from '../generated/local/schema';

let UNIX_DAY = BigInt.fromI32(86400);
let UNIX_HOUR = BigInt.fromI32(86400 / 24);

export function getDayId(event: ethereum.Event): string {
    return event.block.timestamp.div(UNIX_DAY).toString(); // rounded
}

export function getDayUnix(event: ethereum.Event): BigInt {
    return event.block.timestamp.div(UNIX_DAY).times(UNIX_DAY); // rounded
}

export function getHourId(event: ethereum.Event): string {
    return event.block.timestamp.div(UNIX_HOUR).toString(); // rounded
}

export function getHourUnix(event: ethereum.Event): BigInt {
    return event.block.timestamp.div(UNIX_HOUR).times(UNIX_HOUR); // rounded
}
/**
 * Tracks global aggregate d data over daily windows
 * @param event
 *
 */
export function onEveryEvent(event: ethereum.Event): void {
    log.info('onEveryEvent start', []);
    // let market = Market.load(MARKET_ID) as Market;
    let dayID = getDayId(event);
    let dayUnix = getDayUnix(event);
    let hourID = getHourId(event);
    let hourUnix = getHourUnix(event);

    let nuggeth_day = NuggETHDayData.load(dayID);
    let nuggft_day = NuggFTDayData.load(dayID);

    let nuggeth_hour = NuggETHHourData.load(hourID);
    let nuggft_hour = NuggFTHourData.load(hourID);

    if (nuggeth_hour === null) {
        nuggeth_hour = new NuggETHHourData(hourID);
        nuggeth_hour.periodStartUnix = hourUnix;

        nuggeth_hour.depositCount = ZERO;
        nuggeth_hour.withdrawCount = ZERO;
        nuggeth_hour.transferCount = ZERO;
        nuggeth_hour.royaltiesCount = ZERO;
        nuggeth_hour.mintRoyaltiesCount = ZERO;
        nuggeth_hour.saleRoyaltiesCount = ZERO;
        nuggeth_hour.otherRoyaltiesCount = ZERO;
        nuggeth_hour.depositETH = ZERO;
        nuggeth_hour.depositUSD = ZERO;
        nuggeth_hour.withdrawETH = ZERO;
        nuggeth_hour.withdrawUSD = ZERO;
        nuggeth_hour.transferETH = ZERO;
        nuggeth_hour.transferUSD = ZERO;
        nuggeth_hour.tvlETH = ZERO;
        nuggeth_hour.tvlUSD = ZERO;
        nuggeth_hour.shares = ZERO;
        nuggeth_hour.epsX128ETH = ZERO;
        nuggeth_hour.epsX128USD = ZERO;

        nuggeth_hour.royaltiesETH = ZERO;
        nuggeth_hour.royaltiesUSD = ZERO;
        nuggeth_hour.saleRoyaltiesETH = ZERO;
        nuggeth_hour.saleRoyaltiesUSD = ZERO;
        nuggeth_hour.mintRoyaltiesETH = ZERO;
        nuggeth_hour.mintRoyaltiesUSD = ZERO;
        nuggeth_hour.otherRoyaltiesETH = ZERO;
        nuggeth_hour.otherRoyaltiesUSD = ZERO;
    }
    if (nuggft_hour == null) {
        nuggft_hour = new NuggFTHourData(hourID);
        nuggft_hour.periodStartUnix = hourUnix;

        nuggft_hour.count = ZERO;
        nuggft_hour.saleCount = ZERO;
        nuggft_hour.mintCount = ZERO;

        nuggft_hour.offerCount = ZERO;
        nuggft_hour.mintOfferCount = ZERO;
        nuggft_hour.saleOfferCount = ZERO;

        nuggft_hour.volumeETH = ZERO;
        nuggft_hour.saleVolumeETH = ZERO;
        nuggft_hour.mintVolumeETH = ZERO;

        nuggft_hour.volumeUSD = ZERO;
        nuggft_hour.saleVolumeUSD = ZERO;
        nuggft_hour.mintVolumeUSD = ZERO;

        nuggft_hour.offerVolumeETH = ZERO;
        nuggft_hour.saleOfferVolumeETH = ZERO;
        nuggft_hour.mintOfferVolumeETH = ZERO;

        nuggft_hour.offerVolumeUSD = ZERO;
        nuggft_hour.saleOfferVolumeUSD = ZERO;
        nuggft_hour.mintOfferVolumeUSD = ZERO;

        nuggft_hour.floorETH = Q256;
        nuggft_hour.saleFloorETH = Q256;
        nuggft_hour.mintFloorETH = Q256;

        nuggft_hour.floorUSD = Q256;
        nuggft_hour.saleFloorUSD = Q256;
        nuggft_hour.mintFloorUSD = Q256;

        nuggft_hour.ceilingETH = ZERO;
        nuggft_hour.saleCeilingETH = ZERO;
        nuggft_hour.mintCeilingETH = ZERO;

        nuggft_hour.ceilingUSD = ZERO;
        nuggft_hour.saleCeilingUSD = ZERO;
        nuggft_hour.mintCeilingUSD = ZERO;
    }

    if (nuggeth_day === null) {
        nuggeth_day = new NuggETHDayData(dayID);
        nuggeth_day.periodStartUnix = dayUnix;
        nuggeth_day.depositCount = ZERO;
        nuggeth_day.withdrawCount = ZERO;
        nuggeth_day.transferCount = ZERO;
        nuggeth_day.royaltiesCount = ZERO;
        nuggeth_day.mintRoyaltiesCount = ZERO;
        nuggeth_day.saleRoyaltiesCount = ZERO;
        nuggeth_day.otherRoyaltiesCount = ZERO;
        nuggeth_day.depositETH = ZERO;
        nuggeth_day.depositUSD = ZERO;
        nuggeth_day.withdrawETH = ZERO;
        nuggeth_day.withdrawUSD = ZERO;
        nuggeth_day.transferETH = ZERO;
        nuggeth_day.transferUSD = ZERO;
        nuggeth_day.tvlETH = ZERO;
        nuggeth_day.tvlUSD = ZERO;
        nuggeth_day.shares = ZERO;
        nuggeth_day.epsX128ETH = ZERO;
        nuggeth_day.epsX128USD = ZERO;
        nuggeth_day.royaltiesETH = ZERO;
        nuggeth_day.royaltiesUSD = ZERO;
        nuggeth_day.saleRoyaltiesETH = ZERO;
        nuggeth_day.saleRoyaltiesUSD = ZERO;
        nuggeth_day.mintRoyaltiesETH = ZERO;
        nuggeth_day.mintRoyaltiesUSD = ZERO;
        nuggeth_day.otherRoyaltiesETH = ZERO;
        nuggeth_day.otherRoyaltiesUSD = ZERO;
    }
    if (nuggft_day == null) {
        nuggft_day = new NuggFTDayData(dayID);
        nuggft_day.periodStartUnix = dayUnix;

        nuggft_day.count = ZERO;
        nuggft_day.saleCount = ZERO;
        nuggft_day.mintCount = ZERO;

        nuggft_day.offerCount = ZERO;
        nuggft_day.mintOfferCount = ZERO;
        nuggft_day.saleOfferCount = ZERO;

        nuggft_day.volumeETH = ZERO;
        nuggft_day.saleVolumeETH = ZERO;
        nuggft_day.mintVolumeETH = ZERO;

        nuggft_day.volumeUSD = ZERO;
        nuggft_day.saleVolumeUSD = ZERO;
        nuggft_day.mintVolumeUSD = ZERO;

        nuggft_day.offerVolumeETH = ZERO;
        nuggft_day.saleOfferVolumeETH = ZERO;
        nuggft_day.mintOfferVolumeETH = ZERO;

        nuggft_day.offerVolumeUSD = ZERO;
        nuggft_day.saleOfferVolumeUSD = ZERO;
        nuggft_day.mintOfferVolumeUSD = ZERO;

        nuggft_day.floorETH = Q256;
        nuggft_day.saleFloorETH = Q256;
        nuggft_day.mintFloorETH = Q256;

        nuggft_day.floorUSD = Q256;
        nuggft_day.saleFloorUSD = Q256;
        nuggft_day.mintFloorUSD = Q256;

        nuggft_day.ceilingETH = ZERO;
        nuggft_day.saleCeilingETH = ZERO;
        nuggft_day.mintCeilingETH = ZERO;

        nuggft_day.ceilingUSD = ZERO;
        nuggft_day.saleCeilingUSD = ZERO;
        nuggft_day.mintCeilingUSD = ZERO;
    }

    nuggeth_day.save();
    nuggft_day.save();
    nuggeth_hour.save();
    nuggft_hour.save();
    // return [nuggeth_hour, nuggft_hour, nuggeth_day, nuggft_day];
}

export function afterEveryEvent(event: ethereum.Event): void {
    log.info('afterEveryEvent start', []);
    let market = safeCreateMarket(event);

    let nuggeth_day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let nuggft_day = NuggFTDayData.load(getDayId(event)) as NuggFTDayData;

    let nuggeth_hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;
    let nuggft_hour = NuggFTHourData.load(getHourId(event)) as NuggFTHourData;

    nuggeth_day.royaltiesCount = nuggeth_day.saleRoyaltiesCount.plus(nuggeth_day.mintRoyaltiesCount).plus(nuggeth_day.otherRoyaltiesCount);
    nuggeth_day.royaltiesETH = nuggeth_day.saleRoyaltiesETH.plus(nuggeth_day.mintRoyaltiesETH).plus(nuggeth_day.otherRoyaltiesETH);
    nuggeth_day.royaltiesUSD = nuggeth_day.saleRoyaltiesUSD.plus(nuggeth_day.mintRoyaltiesUSD).plus(nuggeth_day.otherRoyaltiesUSD);

    nuggeth_day.tvlETH = market.tvl;
    nuggeth_day.tvlUSD = market.tvlUsd;
    nuggeth_day.shares = market.shares;

    nuggeth_day.save();

    nuggeth_hour.royaltiesCount = nuggeth_hour.saleRoyaltiesCount
        .plus(nuggeth_hour.mintRoyaltiesCount)
        .plus(nuggeth_hour.otherRoyaltiesCount);
    nuggeth_hour.royaltiesETH = nuggeth_hour.saleRoyaltiesETH.plus(nuggeth_hour.mintRoyaltiesETH).plus(nuggeth_hour.otherRoyaltiesETH);
    nuggeth_hour.royaltiesUSD = nuggeth_hour.saleRoyaltiesUSD.plus(nuggeth_hour.mintRoyaltiesUSD).plus(nuggeth_hour.otherRoyaltiesUSD);

    nuggeth_hour.tvlETH = market.tvl;
    nuggeth_hour.tvlUSD = market.tvlUsd;
    nuggeth_hour.shares = market.shares;

    nuggeth_hour.save();

    nuggft_day.offerCount = nuggft_day.saleOfferCount.plus(nuggft_day.mintOfferCount);
    nuggft_day.count = nuggft_day.saleCount.plus(nuggft_day.mintCount);
    nuggft_day.volumeETH = nuggft_day.saleVolumeETH.plus(nuggft_day.mintVolumeETH);
    nuggft_day.volumeUSD = nuggft_day.saleVolumeUSD.plus(nuggft_day.mintVolumeUSD);
    nuggft_day.offerVolumeETH = nuggft_day.saleOfferVolumeETH.plus(nuggft_day.mintOfferVolumeETH);
    nuggft_day.offerVolumeUSD = nuggft_day.saleOfferVolumeUSD.plus(nuggft_day.mintOfferVolumeUSD);

    if (nuggft_day.floorETH.gt(nuggft_day.saleFloorETH)) nuggft_day.floorETH = nuggft_day.saleFloorETH;
    if (nuggft_day.floorETH.gt(nuggft_day.mintFloorETH)) nuggft_day.floorETH = nuggft_day.mintFloorETH;
    if (nuggft_day.floorUSD.gt(nuggft_day.saleFloorUSD)) nuggft_day.floorUSD = nuggft_day.saleFloorUSD;
    if (nuggft_day.floorUSD.gt(nuggft_day.mintFloorUSD)) nuggft_day.floorUSD = nuggft_day.mintFloorUSD;

    if (nuggft_day.ceilingETH.lt(nuggft_day.saleCeilingETH)) nuggft_day.ceilingETH = nuggft_day.saleCeilingETH;
    if (nuggft_day.ceilingETH.lt(nuggft_day.mintCeilingETH)) nuggft_day.ceilingETH = nuggft_day.mintCeilingETH;
    if (nuggft_day.ceilingUSD.lt(nuggft_day.saleCeilingUSD)) nuggft_day.ceilingUSD = nuggft_day.saleCeilingUSD;
    if (nuggft_day.ceilingUSD.lt(nuggft_day.mintCeilingUSD)) nuggft_day.ceilingUSD = nuggft_day.mintCeilingUSD;

    nuggft_day.save();

    nuggft_hour.offerCount = nuggft_hour.saleOfferCount.plus(nuggft_hour.mintOfferCount);
    nuggft_hour.count = nuggft_hour.saleCount.plus(nuggft_hour.mintCount);
    nuggft_hour.volumeETH = nuggft_hour.saleVolumeETH.plus(nuggft_hour.mintVolumeETH);
    nuggft_hour.volumeUSD = nuggft_hour.saleVolumeUSD.plus(nuggft_hour.mintVolumeUSD);
    nuggft_hour.offerVolumeETH = nuggft_hour.saleOfferVolumeETH.plus(nuggft_hour.mintOfferVolumeETH);
    nuggft_hour.offerVolumeUSD = nuggft_hour.saleOfferVolumeUSD.plus(nuggft_hour.mintOfferVolumeUSD);

    if (nuggft_hour.floorETH.gt(nuggft_hour.saleFloorETH)) nuggft_hour.floorETH = nuggft_hour.saleFloorETH;
    if (nuggft_hour.floorETH.gt(nuggft_hour.mintFloorETH)) nuggft_hour.floorETH = nuggft_hour.mintFloorETH;
    if (nuggft_hour.floorUSD.gt(nuggft_hour.saleFloorUSD)) nuggft_hour.floorUSD = nuggft_hour.saleFloorUSD;
    if (nuggft_hour.floorUSD.gt(nuggft_hour.mintFloorUSD)) nuggft_hour.floorUSD = nuggft_hour.mintFloorUSD;

    if (nuggft_hour.ceilingETH.lt(nuggft_hour.saleCeilingETH)) nuggft_hour.ceilingETH = nuggft_hour.saleCeilingETH;
    if (nuggft_hour.ceilingETH.lt(nuggft_hour.mintCeilingETH)) nuggft_hour.ceilingETH = nuggft_hour.mintCeilingETH;
    if (nuggft_hour.ceilingUSD.lt(nuggft_hour.saleCeilingUSD)) nuggft_hour.ceilingUSD = nuggft_hour.saleCeilingUSD;
    if (nuggft_hour.ceilingUSD.lt(nuggft_hour.mintCeilingUSD)) nuggft_hour.ceilingUSD = nuggft_hour.mintCeilingUSD;

    nuggft_hour.save();
}

export function onDeposit(event: ethereum.Event, amount: BigInt): void {
    log.info('onDeposit start', []);
    onEveryEvent(event);

    let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

    day.depositCount = day.depositCount.plus(ONE);
    day.depositETH = day.depositETH.plus(amount);
    day.depositUSD = day.depositUSD.plus(toUsd(amount));

    hour.depositCount = hour.depositCount.plus(ONE);
    hour.depositETH = hour.depositETH.plus(amount);
    hour.depositUSD = hour.depositUSD.plus(toUsd(amount));

    day.save();
    hour.save();
    afterEveryEvent(event);
}

export function onWithdraw(event: ethereum.Event, amount: BigInt): void {
    log.debug('onWithdraw start', []);
    onEveryEvent(event);
    let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

    day.withdrawCount = day.withdrawCount.plus(ONE);
    day.withdrawETH = day.withdrawETH.plus(amount);
    day.withdrawUSD = day.withdrawUSD.plus(toUsd(amount));

    hour.withdrawCount = hour.withdrawCount.plus(ONE);
    hour.withdrawETH = hour.withdrawETH.plus(amount);
    hour.withdrawUSD = hour.withdrawUSD.plus(toUsd(amount));

    day.save();
    hour.save();
    afterEveryEvent(event);
}

export function onTransfer(event: ethereum.Event, amount: BigInt): void {
    log.debug('onTransfer start', []);
    onEveryEvent(event);
    let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

    day.transferCount = day.transferCount.plus(ONE);
    day.transferETH = day.transferETH.plus(amount);
    day.transferUSD = day.transferUSD.plus(toUsd(amount));

    hour.transferCount = hour.transferCount.plus(ONE);
    hour.transferETH = hour.transferETH.plus(amount);
    hour.transferUSD = hour.transferUSD.plus(toUsd(amount));

    day.save();
    hour.save();
    afterEveryEvent(event);
}

export function onEpsX128Increase(event: ethereum.Event, epsX128: BigInt, epsX128Usd: BigInt): void {
    log.debug('onRoyalties start', []);
    onEveryEvent(event);

    let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

    day.epsX128ETH = day.epsX128ETH.plus(epsX128);
    hour.epsX128ETH = hour.epsX128ETH.plus(epsX128);
    day.epsX128USD = day.epsX128USD.plus(epsX128Usd);
    hour.epsX128USD = hour.epsX128USD.plus(epsX128Usd);

    day.save();
    hour.save();
    // afterEveryEvent(event);
}

// export function onSaleRoyalties(event: ethereum.Event, amount: BigInt): void {
//     log.debug('onSaleRoyalties start', []);
//     onEveryEvent(event);
//     let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
//     let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

//     day.saleRoyaltiesCount = day.saleRoyaltiesCount.plus(ONE);
//     day.saleRoyaltiesETH = day.saleRoyaltiesETH.plus(amount);
//     day.saleRoyaltiesUSD = day.saleRoyaltiesUSD.plus(toUsd(amount));

//     hour.saleRoyaltiesCount = hour.saleRoyaltiesCount.plus(ONE);
//     hour.saleRoyaltiesETH = hour.saleRoyaltiesETH.plus(amount);
//     hour.saleRoyaltiesUSD = hour.saleRoyaltiesUSD.plus(toUsd(amount));

//     day.save();
//     hour.save();
//     afterEveryEvent(event);
// }

// export function onMintRoyalties(event: ethereum.Event, amount: BigInt): void {
//     log.debug('onMintRoyalties start', []);
//     onEveryEvent(event);
//     let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
//     let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

//     day.mintRoyaltiesCount = day.mintRoyaltiesCount.plus(ONE);
//     day.mintRoyaltiesETH = day.mintRoyaltiesETH.plus(amount);
//     day.mintRoyaltiesUSD = day.mintRoyaltiesUSD.plus(toUsd(amount));

//     hour.mintRoyaltiesCount = hour.mintRoyaltiesCount.plus(ONE);
//     hour.mintRoyaltiesETH = hour.mintRoyaltiesETH.plus(amount);
//     hour.mintRoyaltiesUSD = hour.mintRoyaltiesUSD.plus(toUsd(amount));

//     day.save();
//     hour.save();
//     afterEveryEvent(event);
// }

export function onOtherRoyalties(event: ethereum.Event, amount: BigInt): void {
    log.debug('onOtherRoyalties start', []);
    onEveryEvent(event);
    let day = NuggETHDayData.load(getDayId(event)) as NuggETHDayData;
    let hour = NuggETHHourData.load(getHourId(event)) as NuggETHHourData;

    day.otherRoyaltiesCount = day.otherRoyaltiesCount.plus(ONE);
    day.otherRoyaltiesETH = day.otherRoyaltiesETH.plus(amount);
    day.otherRoyaltiesUSD = day.otherRoyaltiesUSD.plus(toUsd(amount));

    hour.otherRoyaltiesCount = hour.otherRoyaltiesCount.plus(ONE);
    hour.otherRoyaltiesETH = hour.otherRoyaltiesETH.plus(amount);
    hour.otherRoyaltiesUSD = hour.otherRoyaltiesUSD.plus(toUsd(amount));

    day.save();
    hour.save();
    afterEveryEvent(event);
}

// export function onMintWin(event: ethereum.Event, amount: BigInt): void {
//     log.debug('onMintWin start', []);
//     onEveryEvent(event);
//     let day = NuggFTDayData.load(getDayId(event)) as NuggFTDayData;
//     let hour = NuggFTHourData.load(getHourId(event)) as NuggFTHourData;
//     let amountUSD = toUsd(amount);

//     day.mintCount = day.mintCount.plus(ONE);
//     day.mintVolumeETH = day.mintVolumeETH.plus(amount);
//     day.mintVolumeUSD = day.mintVolumeUSD.plus(toUsd(amount));

//     hour.mintCount = hour.mintCount.plus(ONE);
//     hour.mintVolumeETH = hour.mintVolumeETH.plus(amount);
//     hour.mintVolumeUSD = hour.mintVolumeUSD.plus(toUsd(amount));

//     if (day.mintFloorETH.gt(amount)) {
//         day.mintFloorETH = amount;
//         day.mintFloorUSD = amountUSD;
//     }

//     if (day.mintCeilingETH.lt(amount)) {
//         day.mintCeilingETH = amount;
//         day.mintCeilingUSD = amountUSD;
//     }

//     if (hour.mintFloorETH.gt(amount)) {
//         hour.mintFloorETH = amount;
//         hour.mintFloorUSD = amountUSD;
//     }

//     if (hour.mintCeilingETH.lt(amount)) {
//         hour.mintCeilingETH = amount;
//         hour.mintCeilingUSD = amountUSD;
//     }

//     day.save();
//     hour.save();
//     afterEveryEvent(event);
// }

// export function onSaleWin(event: ethereum.Event, amount: BigInt): void {
//     log.debug('onSaleWin start', []);
//     onEveryEvent(event);
//     let day = NuggFTDayData.load(getDayId(event)) as NuggFTDayData;
//     let hour = NuggFTHourData.load(getHourId(event)) as NuggFTHourData;
//     let amountUSD = toUsd(amount);

//     day.saleCount = day.saleCount.plus(ONE);
//     day.saleVolumeETH = day.saleVolumeETH.plus(amount);
//     day.saleVolumeUSD = day.saleVolumeUSD.plus(toUsd(amount));

//     hour.saleCount = hour.saleCount.plus(ONE);
//     hour.saleVolumeETH = hour.saleVolumeETH.plus(amount);
//     hour.saleVolumeUSD = hour.saleVolumeUSD.plus(toUsd(amount));

//     if (day.saleFloorETH.gt(amount)) {
//         day.saleFloorETH = amount;
//         day.saleFloorUSD = amountUSD;
//     }

//     if (day.saleCeilingETH.lt(amount)) {
//         day.saleCeilingETH = amount;
//         day.saleCeilingUSD = amountUSD;
//     }

//     if (hour.saleFloorETH.gt(amount)) {
//         hour.saleFloorETH = amount;
//         hour.saleFloorUSD = amountUSD;
//     }

//     if (hour.saleCeilingETH.lt(amount)) {
//         hour.saleCeilingETH = amount;
//         hour.saleCeilingUSD = amountUSD;
//     }

//     day.save();
//     hour.save();
//     afterEveryEvent(event);
// }

export function onSubmitOffer(event: ethereum.Event, amount: BigInt): void {
    log.debug('onSubmitOffer start', []);
    onEveryEvent(event);
    let day = NuggFTDayData.load(getDayId(event)) as NuggFTDayData;
    let hour = NuggFTHourData.load(getHourId(event)) as NuggFTHourData;
    let amountUSD = toUsd(amount);

    day.saleOfferCount = day.saleOfferCount.plus(ONE);
    day.saleOfferVolumeETH = day.saleOfferVolumeETH.plus(amount);
    day.saleOfferVolumeUSD = day.saleOfferVolumeUSD.plus(amountUSD);

    hour.saleOfferCount = hour.saleOfferCount.plus(ONE);
    hour.saleOfferVolumeETH = hour.saleOfferVolumeETH.plus(amount);
    hour.saleOfferVolumeUSD = hour.saleOfferVolumeUSD.plus(amountUSD);

    day.save();
    hour.save();
    afterEveryEvent(event);
}

// export function onMintOffer(event: ethereum.Event, amount: BigInt): void {
//     log.debug('onMintOffer start', []);
//     onEveryEvent(event);
//     let day = NuggFTDayData.load(getDayId(event)) as NuggFTDayData;
//     let hour = NuggFTHourData.load(getHourId(event)) as NuggFTHourData;

//     let amountUSD = toUsd(amount);

//     day.mintOfferCount = day.mintOfferCount.plus(ONE);
//     day.mintOfferVolumeETH = day.mintOfferVolumeETH.plus(amount);
//     day.mintOfferVolumeUSD = day.mintOfferVolumeUSD.plus(amountUSD);

//     hour.mintOfferCount = hour.mintOfferCount.plus(ONE);
//     hour.mintOfferVolumeETH = hour.mintOfferVolumeETH.plus(amount);
//     hour.mintOfferVolumeUSD = hour.mintOfferVolumeUSD.plus(amountUSD);

//     day.save();
//     hour.save();
//     afterEveryEvent(event);
// }
