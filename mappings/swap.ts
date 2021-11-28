import { log, BigInt, store } from '@graphprotocol/graph-ts';
import { Claim, Commit, Swap as SwapEvent, Mint, Offer } from '../generated/local/NuggFT/NuggFT';
import { Swap as SwapObject, User, Offer as OfferObject } from '../generated/local/schema';
import {
    safeLoadActiveSwap,
    safeLoadNugg,
    safeLoadOfferHelperNull,
    safeLoadProtocol,
    safeLoadUserNull,
    safeNewOfferHelper,
    safeNewSwapHelper,
    safeNewUser,
} from './safeload';
import { invariant, wethToUsdc } from './uniswap';

export function handleMint(event: Mint): void {
    log.info('handleMint start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(BigInt.fromString(proto.epoch));

    let user = safeLoadUserNull(event.params.account);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.nuggs = [];
        user.offers = [];
    }

    user.save();

    if (proto.epoch != event.params.epoch.toString())
        log.critical('handleMint: INVALID EPOCH: ' + proto.epoch + ' != ' + event.params.epoch.toString(), []);

    let swap = safeNewSwapHelper(BigInt.fromString(proto.epoch), BigInt.fromString(proto.epoch));

    invariant(proto.epoch == event.params.epoch.toString(), 'handleMint: INVALID EPOCH');

    swap.epoch = proto.epoch;
    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.offers = [];
    swap.save();

    nugg.activeSwap = swap.id;

    nugg.save();

    let offer = safeNewOfferHelper(swap, user);

    offer.claimed = false;
    offer.eth = event.transaction.value;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = false;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    log.info('handleMint end', []);
}

export function handleCommit(event: Commit): void {
    log.info('handleCommit start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeLoadNugg(event.params.tokenid);

    let swap = safeLoadActiveSwap(nugg);

    let owneroffer = OfferObject.load(swap.id.concat('-').concat(swap.owner)) as OfferObject;

    if (swap.epoch != '') log.critical('handleCommit: SWAP.epochId MUST BE NULL', []);

    store.remove('Swap', swap.id);
    store.remove('Offer', owneroffer.id);

    swap.epoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();
    swap.id = nugg.id.concat('-').concat(swap.epoch);
    swap.save();

    owneroffer.id = swap.id.concat('-').concat(swap.owner);
    owneroffer.save();

    nugg.activeSwap = swap.id;

    nugg.save();

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

    // swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('handleCommit end', []);
}

export function handleOffer(event: Offer): void {
    log.info('handleOffer start', []);

    let nugg = safeLoadNugg(event.params.tokenid);

    let swap = safeLoadActiveSwap(nugg);

    let user = safeLoadUserNull(event.params.account);

    if (user == null) {
        user = safeNewUser(event.params.account);
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.nuggs = [];
        user.offers = [];
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

    log.info('handleOffer end', []);
}

export function handleClaim(event: Claim): void {
    log.info('handleClaim start', []);

    let nugg = safeLoadNugg(event.params.tokenid);

    let swap = SwapObject.load(nugg.id.concat('-').concat(event.params.endingEpoch.toString())) as SwapObject;

    let user = User.load(event.params.account.toHexString()) as User;

    let offer = OfferObject.load(swap.id.concat('-').concat(user.id)) as OfferObject;

    offer.claimed = true;

    offer.save();

    if (swap.leader == user.id) {
        nugg.activeSwap = null;
        nugg.save();
        if (swap.owner == user.id) {
            store.remove('Offer', offer.id);
            store.remove('Swap', swap.id);
        }
    }

    log.info('handleClaim end', []);
}

export function handleSwap(event: SwapEvent): void {
    log.info('handleSwap start', []);

    let user = User.load(event.params.account.toHexString()) as User;

    let nugg = safeLoadNugg(event.params.tokenid);

    let swap = new SwapObject(nugg.id.concat('-').concat('0'));

    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.offers = [];

    swap.save();

    nugg.activeSwap = swap.id;

    nugg.save();

    let offer = new OfferObject(swap.id.concat('-').concat(user.id));

    offer.claimed = false;
    offer.eth = event.transaction.value;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.user = user.id;
    offer.swap = swap.id;

    offer.save();

    log.info('handleSwap end', []);
}
