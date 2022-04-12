import { log, BigInt, Address } from '@graphprotocol/graph-ts';
import { Liquidate, Loan as LoanEvent, Rebalance } from '../generated/NuggftV1/NuggftV1';

import { LIQUDATION_PERIOD } from './constants';
import { mask } from './nuggft';

import {
    safeLoadLoanHelper,
    safeLoadNugg,
    safeLoadProtocol,
    safeLoadUser,
    safeLoadUserNull,
    safeNewLoanHelper,
    safeNewUser,
    safeRemoveNuggActiveLoan,
    safeSetNuggActiveLoan,
} from './safeload';
import { wethToUsdc } from './uniswap';
import { addr_i, b32toBigEndian, bigi, MAX_UINT160 } from './utils';

export function handleEvent__Loan(event: LoanEvent): void {
    log.info('handleEvent__Loan start', []);
    let proto = safeLoadProtocol();

    let nugg = safeLoadNugg(bigi(event.params.tokenId));

    let agency = b32toBigEndian(event.params.agency);

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    let user = safeLoadUser(Address.fromString(nugg.user));

    let loan = safeNewLoanHelper();

    loan.liquidated = false;
    loan.liquidatedForEth = BigInt.fromString('0');
    loan.liquidatedForUsd = BigInt.fromString('0');

    loan.epoch = agency__epoch.toString();
    loan.user = user.id;
    loan.nugg = nugg.id;

    loan.toPayoff = BigInt.fromString('0');
    loan.toRebalance = BigInt.fromString('0');
    loan.earned = BigInt.fromString('0');
    loan.epochDue = BigInt.fromString('0');

    // dep
    loan.eth = agency__eth;
    loan.ethUsd = wethToUsdc(loan.eth);
    loan.feeEth = BigInt.fromString('0');
    loan.feeUsd = BigInt.fromString('0');
    loan.endingEpoch = agency__epoch.plus(LIQUDATION_PERIOD);

    // loan.save();

    // saves
    // updateLoanFromChain(loan);

    // loan.toPayoff = tmp.value.value1;
    // loan.toRebalance = tmp.value.value2;
    // loan.earned = tmp.value.value3;
    // loan.epochDue = BigInt.fromI32(tmp.value.value4);

    safeSetNuggActiveLoan(nugg, loan);

    log.info('handleEvent__Loan end', []);
}

export function handleEvent__Liquidate(event: Liquidate): void {
    log.info('handlePayoff', []);

    let agency = b32toBigEndian(event.params.agency);

    let agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    let nugg = safeLoadNugg(bigi(event.params.tokenId));

    let loan = safeLoadLoanHelper(nugg);

    let user = safeLoadUserNull(agency__account);

    loan.liquidated = true;

    loan.liquidatedForEth = event.transaction.value;
    loan.liquidatedForUsd = wethToUsdc(loan.liquidatedForEth);
    loan.liquidatedBy = user.id;

    loan.save();

    safeRemoveNuggActiveLoan(nugg);

    log.info('handlePayoff', []);
}

export function handleEvent__Rebalance(event: Rebalance): void {
    log.info('handleRebalance', []);

    let nugg = safeLoadNugg(bigi(event.params.tokenId));

    let loan = safeLoadLoanHelper(nugg);

    let agency = b32toBigEndian(event.params.agency);

    let agency__account = Address.fromBigInt(agency.bitAnd(MAX_UINT160));

    let agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    let agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    let agency__flag = agency.rightShift(254);

    loan.eth = agency__eth;
    loan.epoch = agency__epoch.toString();
    loan.endingEpoch = agency__epoch.plus(LIQUDATION_PERIOD);

    loan.save();

    log.info('handleRebalance', []);
}

// function updateLoanFromChain(loan: Loan): void {
//     let proto = safeLoadProtocol();
//     let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

//     // let nuggid = BigInt.fromString(loan.nugg);
//     // let tmp = nuggft.try_loanInfo(BigInt.fromString(loan.nugg));

//     if (!tmp.reverted) {
//         loan.toPayoff = tmp.value.value1;
//         loan.toRebalance = tmp.value.value2;
//         loan.earned = tmp.value.value3;
//         loan.epochDue = BigInt.fromI32(tmp.value.value4);
//     } else {
//         log.error('LOAN INFO REVERTED UNEXPECTEDLY', [nuggid.toString()]);
//         log.critical('', []);
//     }

//     loan.save();
// }
