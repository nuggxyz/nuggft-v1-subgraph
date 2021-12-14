import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts';
import { Liquidate, Payoff, TakeLoan } from '../generated/local/NuggFT/NuggFT';
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

export function handleTakeLoan(event: TakeLoan): void {
    log.info('handleTakeLoan start', []);
    let proto = safeLoadProtocol('0x42096');

    let user = safeLoadUser(event.params.account);

    let nugg = safeLoadNugg(event.params.tokenId);

    let loan = safeNewLoanHelper();

    loan.eth = event.params.eth;
    loan.ethUsd = wethToUsdc(loan.eth);
    loan.liquidated = false;
    loan.liquidatedForEth = BigInt.fromString('0');
    loan.liquidatedForUsd = BigInt.fromString('0');
    loan.feeEth = BigInt.fromString('0');
    loan.feeUsd = BigInt.fromString('0');
    loan.epoch = proto.epoch;
    loan.endingEpoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1000'));
    loan.user = user.id;
    loan.nugg = nugg.id;
    loan.save();

    safeSetNuggActiveLoan(nugg, loan);

    log.info('handleTakeLoan end', []);
}

export function handlePayoff(event: Payoff): void {
    log.info('handlePayoff', []);

    let user = safeLoadUser(event.params.account);

    let nugg = safeLoadNugg(event.params.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    loan.liquidated = true;

    loan.liquidatedForEth = event.params.eth;
    loan.liquidatedForUsd = wethToUsdc(loan.liquidatedForEth);
    loan.liquidatedBy = user.id;
    loan.feeEth = event.params.eth.minus(loan.eth);
    loan.feeUsd = wethToUsdc(loan.feeEth);

    loan.save();

    safeRemoveNuggActiveLoan(nugg);

    log.info('handlePayoff', []);
}

export function handleLiquidate(event: Liquidate): void {
    log.info('handleLiquidate', []);

    let user = safeLoadUserNull(event.params.account);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    let nugg = safeLoadNugg(event.params.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    loan.liquidated = true;

    loan.liquidatedForEth = event.params.eth;
    loan.liquidatedForUsd = wethToUsdc(loan.liquidatedForEth);
    loan.liquidatedBy = user.id;
    loan.feeEth = event.params.eth.minus(loan.eth);
    loan.feeUsd = wethToUsdc(loan.feeEth);

    loan.save();

    safeRemoveNuggActiveLoan(nugg);

    log.info('handleLiquidate', []);
}
