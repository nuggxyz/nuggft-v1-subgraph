import { log, BigInt, store, Address } from '@graphprotocol/graph-ts';
import { DelegateCall, SwapCall, ClaimCall } from '../generated/local/NuggFT/NuggFT';
import {
    safeGetAndDeleteUserActiveSwap,
    safeLoadActiveSwap,
    safeLoadNugg,
    safeLoadOfferHelperNull,
    safeLoadProtocol,
    safeLoadUser,
    safeLoadUserNull,
    safeNewOfferHelper,
    safeNewSwapHelper,
    safeNewUser,
    safeSetUserActiveSwap,
} from './safeload';
import { wethToUsdc } from './uniswap';
import { safeLoadEpoch, safeLoadOfferHelper, safeSetNuggActiveSwap } from './safeload';
import { Nugg, Protocol, Swap, User } from '../generated/local/schema';
import { updatedStakedSharesAndEth } from './dotnugg';

export function handleCall__delegate(call: DelegateCall): void {
    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let user = safeLoadUserNull(call.inputs.sender);

    if (user == null) {
        user = safeNewUser(call.inputs.sender);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    let swap = safeLoadActiveSwap(nugg);

    safeSetUserActiveSwap(user, nugg, swap);

    if (swap.nextDelegateType == 'Commit') {
        __delegateCommit(proto, user, nugg, swap, call.transaction.value);
    } else if (swap.nextDelegateType == 'Offer') {
        __delegateOffer(proto, user, nugg, swap, call.transaction.value);
    } else if (swap.nextDelegateType == 'Mint') {
        __delegateMint(proto, user, nugg, swap, call.transaction.value);
    } else {
        log.error('swap.nextDelegateType should be Commit or Offer', [swap.nextDelegateType]);
        log.critical('', []);
    }

    updatedStakedSharesAndEth();
}

export function handleCall__swap(call: SwapCall): void {
    log.info('handleSwapStart start', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let user = safeLoadUser(Address.fromString(nugg.user));

    let swap = safeNewSwapHelper(nugg);

    swap.eth = call.inputs.floor;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.nugg = nugg.id;
    swap.nextDelegateType = 'Commit';
    swap.save();

    safeSetNuggActiveSwap(nugg, swap);

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = call.inputs.floor;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    updatedStakedSharesAndEth();

    log.info('handleSwapStart end', []);
}

export function handleCall__claim(call: ClaimCall): void {
    log.info('handleSwapClaim start', []);

    let nugg = safeLoadNugg(call.inputs.tokenId);

    let user = safeLoadUser(call.inputs.sender);

    let swap = safeGetAndDeleteUserActiveSwap(user, nugg);

    let offer = safeLoadOfferHelper(swap, user);

    offer.claimed = true;

    offer.save();

    if (swap.leader == user.id) {
        if (swap.owner == user.id) {
            // store.remove('Offer', offer.id);
            // store.remove('Swap', swap.id);
        }
    }

    updatedStakedSharesAndEth();

    log.info('handleSwapClaim end', []);
}

export function __delegateMint(proto: Protocol, user: User, nugg: Nugg, swap: Swap, eth: BigInt): void {
    log.info('__delegateMint start', []);

    // let proto = safeLoadProtocol('0x42069');

    log.info('__delegateMint start 2', []);

    if (proto.epoch != nugg.id) {
        log.info('__delegateMint start 3', []);

        log.critical('__delegateMint: INVALID EPOCH: ' + proto.epoch + ' != ' + nugg.id.toString(), []);
    }

    proto.nuggftStakedShares = proto.nuggftStakedShares.plus(BigInt.fromString('1'));
    proto.save();

    swap.eth = eth;
    swap.ethUsd = wethToUsdc(eth);
    swap.leader = user.id;
    swap.nextDelegateType = 'Offer';

    swap.save();

    nugg.user = proto.nuggftUser;

    nugg.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = eth;
    offer.ethUsd = wethToUsdc(eth);
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    log.info('__delegateMint end', []);
}

export function __delegateCommit(proto: Protocol, user: User, nugg: Nugg, swap: Swap, eth: BigInt): void {
    log.info('__delegateCommit start', []);

    // let owner = safeLoadUser(Address.fromString(swap.owner));
    // log.info('__delegateCommit start 5', []);

    // let owneroffer = safeLoadOfferHelper(swap, owner);
    // log.info('__delegateCommit start 6', [swap.epoch == null ? 'null' : (swap.epoch as string)]);

    if (swap.epoch != '' && swap.epoch != null) log.critical('__delegateCommit: SWAP.epochId MUST BE NULL', []);
    // log.info('__delegateCommit start 7', []);

    // store.remove('Swap', swap.id);
    // store.remove('Offer', owneroffer.id);

    // log.info('__delegateCommit start 8', []);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));
    // log.info('__delegateCommit start 9', []);

    swap.epoch = epoch.id;
    swap.startingEpoch = proto.epoch;
    swap.endingEpoch = BigInt.fromString(epoch.id);
    // swap.id = nugg.id.concat('-').concat(epoch.id);
    swap.save();
    log.info('__delegateCommit start 10', []);

    let _s = epoch._activeSwaps as string[];
    // _s[_s.indexOf(prevswapId)] = swap.id;
    _s.push(swap.id as string);
    epoch._activeSwaps = _s as string[];
    epoch.save();

    safeSetNuggActiveSwap(nugg, swap);

    let offer = safeLoadOfferHelperNull(swap, user);

    if (offer == null) {
        offer = safeNewOfferHelper(swap, user);
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.user = user.id;
        offer.swap = swap.id;
        offer.save();
    }

    offer.eth = offer.eth.plus(eth);
    offer.ethUsd = wethToUsdc(offer.eth);
    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;
    swap.nextDelegateType = 'Offer';
    swap.leader = user.id;

    // swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('__delegateCommit end', []);
}

export function __delegateOffer(proto: Protocol, user: User, nugg: Nugg, swap: Swap, eth: BigInt): void {
    log.info('__delegateOffer start', []);

    let offer = safeLoadOfferHelperNull(swap, user);

    if (offer == null) {
        offer = safeNewOfferHelper(swap, user);
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.user = user.id;
        offer.swap = swap.id;

        offer.save();
    }

    offer.eth = offer.eth.plus(eth);
    offer.ethUsd = wethToUsdc(offer.eth);
    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = user.id;

    offer.save();
    swap.save();

    log.info('__delegateOffer end', []);
}
