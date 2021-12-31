import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts';
import { LoanCall, PayoffCall, RebalanceCall, NuggFT } from '../generated/local/NuggFT/NuggFT';
import { Loan } from '../generated/local/schema';
import {
    safeLoadLoanHelper,
    safeLoadNugg,
    safeLoadProtocol,
    safeLoadUser,
    safeLoadUserFromString,
    safeLoadUserNull,
    safeNewLoanHelper,
    safeNewUser,
    safeRemoveNuggActiveLoan,
    safeSetNuggActiveLoan,
} from './safeload';
import { wethToUsdc } from './uniswap';

export function handleCall__loan(call: LoanCall): void {
    log.info('handleTakeLoan start', []);
    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let user = safeLoadUserFromString(nugg.user);

    let loan = safeNewLoanHelper();

    loan.liquidated = false;
    loan.liquidatedForEth = BigInt.fromString('0');
    loan.liquidatedForUsd = BigInt.fromString('0');

    loan.epoch = proto.epoch;
    loan.user = user.id;
    loan.nugg = nugg.id;

    loan.toPayoff = BigInt.fromString('0');
    loan.toRebalance = BigInt.fromString('0');
    loan.earned = BigInt.fromString('0');
    loan.epochDue = BigInt.fromString('0');

    // dep
    loan.eth = proto.nuggftStakedEthPerShare;
    loan.ethUsd = wethToUsdc(loan.eth);
    loan.feeEth = BigInt.fromString('0');
    loan.feeUsd = BigInt.fromString('0');
    loan.endingEpoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1000'));

    // loan.save();

    // saves
    updateLoanFromChain(loan);

    safeSetNuggActiveLoan(nugg, loan);

    log.info('handleTakeLoan end', []);
}

export function handleCall__payoff(call: PayoffCall): void {
    log.info('handlePayoff', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    let user = safeLoadUserNull(call.transaction.from);

    if (user == null) {
        user = safeNewUser(call.transaction.from);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    loan.liquidated = true;

    loan.liquidatedForEth = call.transaction.value;
    loan.liquidatedForUsd = wethToUsdc(loan.liquidatedForEth);
    loan.liquidatedBy = user.id;

    loan.save();

    safeRemoveNuggActiveLoan(nugg);

    log.info('handlePayoff', []);
}

export function handleCall__rebalance(call: RebalanceCall): void {
    log.info('handleRebalance', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    updateLoanFromChain(loan);

    log.info('handleRebalance', []);
}

function updateLoanFromChain(loan: Loan): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));

    let nuggid = BigInt.fromString(loan.nugg);
    let tmp = nuggft.try_loanInfo(BigInt.fromString(loan.nugg));

    if (!tmp.reverted) {
        loan.toPayoff = tmp.value.value0;
        loan.toRebalance = tmp.value.value1;
        loan.earned = tmp.value.value2;
        loan.epochDue = tmp.value.value3;
    } else {
        log.error('LOAN INFO REVERTED UNEXPECTEDLY', [nuggid.toString()]);
        log.critical('', []);
    }

    loan.save();
}
