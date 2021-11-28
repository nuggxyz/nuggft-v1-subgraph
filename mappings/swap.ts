import { log, BigInt, store } from '@graphprotocol/graph-ts';
import {
    Claim,
    ClaimItem,
    Commit,
    CommitItem,
    Swap as SwapEvent,
    Mint,
    Offer,
    OfferItem,
    SwapItem,
} from '../generated/local/NuggFT/NuggFT';
import { Nugg, Swap as SwapObject, Protocol, User, Offer as OfferObject } from '../generated/local/schema';
import { invariant, wethToUsdc } from './uniswap';
// import { invariant, wethToUsdc } from './uniswap';

export function handleMint(event: Mint): void {
    log.info('handleMint start', []);

    let proto = Protocol.load('0x42069') as Protocol;
    log.info('Protocol.load', []);

    // invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(proto.epoch) as Nugg;
    log.info('Nugg.load', []);
    log.info(nugg.activeSwap == null ? 'true' : 'false', []);
    log.info(event.params ? event.params.account.toHexString() : 'null', []);

    // invariant(nugg != null, 'handleMint: NUGG CANNOT BE NULL');
    // invariant(nugg.activeSwap == null, 'handleMint: NUGG.activeSwap MUST BE NULL');

    let user = User.load(event.params.account.toHexString());
    log.info('User.load', []);

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.nuggs = [];
        user.offers = [];
    }

    user.save();

    let swap = new SwapObject(proto.epoch.concat('-').concat(proto.epoch));

    invariant(proto.epoch == event.params.epoch.toString(), 'handleMint: INVALID EPOCH');

    // swap.epochId = proto.epoch;
    swap.epoch = proto.epoch;
    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
    swap.offers = [];
    swap.save();

    nugg.activeSwap = swap.id;

    nugg.save();

    let offer = new OfferObject(swap.id.concat('-').concat(user.id));

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

    let proto = Protocol.load('0x42069') as Protocol;
    log.info('Protocol.load', []);

    // invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString()) as Nugg;

    // invariant(nugg != null, 'handleCommit: NUGG CANNOT BE NULL');
    invariant(nugg.activeSwap != null, 'handleCommit: NUGG.activeSwap CANNOT BE NULL');
    let swap = SwapObject.load(nugg.activeSwap as string) as SwapObject;
    let owneroffer = OfferObject.load(swap.id.concat('-').concat(swap.owner)) as OfferObject;

    invariant(swap.epoch == '', 'handleCommit: SWAP.epochId MUST BE NULL');

    store.remove('Swap', swap.id);
    store.remove('Offer', owneroffer.id);

    swap.epoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();
    swap.id = nugg.id.concat('-').concat(swap.epoch);
    swap.save();

    owneroffer.id = swap.id.concat('-').concat(swap.owner);
    owneroffer.save();

    nugg.activeSwap = swap.id;

    nugg.save();

    // invariant(swap != null, 'handleCommit: SWAP CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString());

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');

        user.save();
    }

    let offer = OfferObject.load(swap.id.concat('-').concat(user.id));

    if (offer == null) {
        offer = new OfferObject(swap.id.concat('-').concat(user.id));
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

    // let proto = Protocol.load('0x42069') as Protocol as Protocol;

    // invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString()) as Nugg;
    log.info('Nugg.load', []);

    // invariant(nugg != null, 'handleOffer: NUGG CANNOT BE NULL');
    invariant(nugg.activeSwap != null, 'handleOffer: NUGG.activeSwap CANNOT BE NULL');

    let swap = SwapObject.load(nugg.activeSwap as string) as SwapObject;
    log.info('SwapObject.load', []);

    // invariant(swap != null, 'handleOffer: SWAP CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString());

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.nuggs = [];
        user.offers = [];
        user.save();
    }

    let offer = OfferObject.load(swap.id.concat('-').concat(user.id));

    if (offer == null) {
        offer = new OfferObject(swap.id.concat('-').concat(user.id));
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

    // let proto = Protocol.load('0x42069') as Protocol;

    // invariant(proto != null, 'handleClaim: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString()) as Nugg;
    log.info('Nugg.load', []);

    // invariant(nugg != null, 'handleClaim: NUGG CANNOT BE NULL');

    // let endingEpoch = event.params.endingEpoch.toString().replace('0', proto.)

    let swap = SwapObject.load(nugg.id.concat('-').concat(event.params.endingEpoch.toString())) as SwapObject;
    log.info('SwapObject.load', []);

    // invariant(swap != null, 'handleClaim: SWAP CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString()) as User;
    log.info('User.load', []);

    // invariant(nugg != null, 'handleClaim: USER CANNOT BE NULL');

    // @todo - make sure to do this somewhere else - nugg.activeSwap = null;

    let offer = OfferObject.load(swap.id.concat('-').concat(user.id)) as OfferObject;
    log.info('OfferObject.load', []);

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

    let proto = Protocol.load('0x42069') as Protocol;

    // invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString()) as User;

    // invariant(user != null, 'handleSwap: USER CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString()) as Nugg;

    // invariant(nugg != null, 'handleOffer: NUGG CANNOT BE NULL');
    // invariant(nugg.activeSwap == null, 'handleOffer: NUGG.activeSwap MUST BE NULL');

    let swap = new SwapObject(nugg.id.concat('-').concat('0'));

    // swap.epochId = proto.epoch;
    // swap.epoch = proto.epoch;
    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = user.id;
    swap.offers = [];
    // swap.epoch =

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
