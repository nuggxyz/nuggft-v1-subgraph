import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts';
import { Liquidate, Loan as LoanEvent, NuggftV1, Rebalance } from '../generated/local/NuggftV1/NuggftV1';

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

export function handleEvent__Loan(event: LoanEvent): void {
    log.info('handleEvent__Loan start', []);
    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(event.params.tokenId);

    if (nugg.user != proto.nuggftUser) {
        log.error('handleEvent__Loan: nugg.user should always be proto.nuggftUser', []);
        log.critical('', []);
    }

    let user = safeLoadUser(Address.fromString(nugg.lastUser));

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

    log.info('handleEvent__Loan end', []);
}

export function handleEvent__Liquidate(event: Liquidate): void {
    log.info('handlePayoff', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    let user = safeLoadUserNull(event.params.user);

    if (user == null) {
        user = safeNewUser(event.params.user);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

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

    let nugg = safeLoadNugg(event.params.tokenId);

    let loan = safeLoadLoanHelper(nugg);

    updateLoanFromChain(loan);

    log.info('handleRebalance', []);
}

function updateLoanFromChain(loan: Loan): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggftV1.bind(Address.fromString(proto.nuggftUser));

    let nuggid = BigInt.fromString(loan.nugg);
    let tmp = nuggft.try_loanInfo(BigInt.fromString(loan.nugg));

    if (!tmp.reverted) {
        loan.toPayoff = tmp.value.value0;
        loan.toRebalance = tmp.value.value1;
        loan.earned = tmp.value.value2;
        loan.epochDue = BigInt.fromI32(tmp.value.value3);
    } else {
        log.error('LOAN INFO REVERTED UNEXPECTEDLY', [nuggid.toString()]);
        log.critical('', []);
    }

    loan.save();
}
