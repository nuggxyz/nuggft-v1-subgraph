import { log, BigInt, store, Address } from '@graphprotocol/graph-ts';
import { SwapClaim, DelegateCommit, SwapStart, DelegateMint, DelegateOffer } from '../generated/local/NuggFT/NuggFT';
import {
    safeLoadActiveSwap,
    safeLoadNugg,
    safeLoadOfferHelperNull,
    safeLoadProtocol,
    safeLoadSwapHelper,
    safeLoadUser,
    safeLoadUserNull,
    safeNewOfferHelper,
    safeNewSwapHelper,
    safeNewUser,
} from './safeload';
import { wethToUsdc } from './uniswap';
import { safeLoadEpoch, safeLoadOfferHelper, safeSetNuggActiveSwap } from './safeload';

export function handleDelegateMint(event: DelegateMint): void {
    log.info('handleDelegateMint start', []);

    let proto = safeLoadProtocol('0x42069');

    log.info('handleDelegateMint start 2', []);

    if (proto.epoch != event.params.epoch.toString()) {
        log.info('handleDelegateMint start 3', []);

        log.critical('handleDelegateMint: INVALID EPOCH: ' + proto.epoch + ' != ' + event.params.epoch.toString(), []);
    }
    log.info('handleDelegateMint start 4', []);

    let nugg = safeLoadNugg(BigInt.fromString(proto.epoch));
    log.info('handleDelegateMint start 5', []);

    let user = safeLoadUserNull(event.params.account);
    log.info('handleDelegateMint start 6', []);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

    proto.nuggftStakedShares = proto.nuggftStakedShares.plus(BigInt.fromString('1'));
    proto.save();

    let swap = safeLoadActiveSwap(nugg);

    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.leader = user.id;

    swap.save();

    nugg.user = proto.nuggftUser;

    nugg.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = event.transaction.value;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    log.info('handleDelegateMint end', []);
}

export function handleDelegateCommit(event: DelegateCommit): void {
    log.info('handleDelegateCommit start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(event.params.tokenId);

    let swap = safeLoadActiveSwap(nugg);

    let owner = safeLoadUser(Address.fromString(swap.owner));

    let owneroffer = safeLoadOfferHelper(swap, owner);

    if (swap.epoch != '') log.critical('handleDelegateCommit: SWAP.epochId MUST BE NULL', []);

    let prevswapId = swap.id;
    store.remove('Swap', swap.id);
    store.remove('Offer', owneroffer.id);

    let epoch = safeLoadEpoch(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')));

    swap.epoch = epoch.id;
    swap.endingEpoch = BigInt.fromString(epoch.id);
    swap.id = nugg.id.concat('-').concat(swap.epoch);
    swap.save();

    let _s = epoch._activeSwaps as string[];
    _s[_s.indexOf(prevswapId)] = swap.id;
    epoch._activeSwaps = _s as string[];
    epoch.save();

    owneroffer.id = swap.id.concat('-').concat(swap.owner);
    owneroffer.save();

    safeSetNuggActiveSwap(nugg, swap);

    let user = safeLoadUserNull(event.params.account);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.shares = BigInt.fromString('0');
        user.save();
    }

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

    offer.eth = offer.eth.plus(event.transaction.value);
    offer.ethUsd = wethToUsdc(offer.eth);

    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = user.id;

    // swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('handleDelegateCommit end', []);
}

export function handleDelegateOffer(event: DelegateOffer): void {
    log.info('handleDelegateOffer start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let swap = safeLoadActiveSwap(nugg);

    let user = safeLoadUserNull(event.params.account);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.save();
    }

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

    offer.eth = offer.eth.plus(event.transaction.value);
    offer.ethUsd = wethToUsdc(offer.eth);

    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = user.id;

    offer.save();
    swap.save();

    log.info('handleDelegateOffer end', []);
}

export function handleSwapClaim(event: SwapClaim): void {
    log.info('handleSwapClaim start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let swap = safeLoadSwapHelper(nugg, event.params.epoch);

    let user = safeLoadUser(event.params.account);

    let offer = safeLoadOfferHelper(swap, user);

    offer.claimed = true;

    offer.save();

    if (swap.leader == user.id) {
        if (swap.owner == user.id) {
            store.remove('Offer', offer.id);
            store.remove('Swap', swap.id);
        }
    }

    log.info('handleSwapClaim end', []);
}

export function handleStartSwap(event: SwapStart): void {
    log.info('handleStartSwap start', []);

    let user = safeLoadUser(event.params.account);

    let nugg = safeLoadNugg(event.params.tokenId);

    let swap = safeNewSwapHelper(nugg, BigInt.fromString('0'));

    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.nugg = nugg.id;

    swap.save();

    safeSetNuggActiveSwap(nugg, swap);

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = event.transaction.value;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    log.info('handleStartSwap end', []);
}
