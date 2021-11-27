import { log, BigInt } from '@graphprotocol/graph-ts';
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
import { wethToUsdc } from './uniswap';

export function handleMint(event: Mint): void {
    log.info('handleMint start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(proto.epoch);

    assert(nugg != null, 'handleMint: NUGG CANNOT BE NULL');
    assert(nugg.activeSwap == null, 'handleMint: NUGG.activeSwap MUST BE NULL');

    let user = User.load(event.params.account.toHexString());

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
    }

    user.save();

    let swap = new SwapObject(proto.epoch.concat('-').concat(proto.epoch));

    assert(proto.epoch == event.params.epoch.toString(), 'handleMint: INVALID EPOCH');

    swap.epochId = proto.epoch;
    swap.epoch = proto.epoch;
    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = proto.nullUser;
    swap.leader = user.id;
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

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString());

    assert(nugg != null, 'handleCommit: NUGG CANNOT BE NULL');
    assert(nugg.activeSwap != null, 'handleCommit: NUGG.activeSwap CANNOT BE NULL');

    let swap = SwapObject.load(nugg.activeSwap);

    swap.id = nugg.id.concat('-').concat(BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString());
    swap.save();

    nugg.activeSwap = swap.id;
    nugg.save();

    assert(swap != null, 'handleCommit: SWAP CANNOT BE NULL');
    assert(swap.epochId == null, 'handleCommit: SWAP.epochId MUST BE NULL');

    let user = User.load(event.params.account.toHexString());

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
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

    swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();
    swap.epoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('handleCommit end', []);
}

export function handleCommitItem(event: CommitItem): void {
    log.info('handleCommitItem start', []);

    log.info('handleCommitItem end', []);
}

export function handleOffer(event: Offer): void {
    log.info('handleOffer start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString());

    assert(nugg != null, 'handleOffer: NUGG CANNOT BE NULL');
    assert(nugg.activeSwap != null, 'handleOffer: NUGG.activeSwap CANNOT BE NULL');

    let swap = SwapObject.load(nugg.activeSwap);

    assert(swap != null, 'handleOffer: SWAP CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString());

    if (user == null) {
        user = new User(event.params.account.toHexString());
        user.xnugg = BigInt.fromString('0');
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

export function handleOfferItem(event: OfferItem): void {
    log.info('handleOfferItem start', []);

    log.info('handleOfferItem end', []);
}

export function handleClaim(event: Claim): void {
    log.info('handleClaim start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handleClaim: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString());

    assert(nugg != null, 'handleClaim: NUGG CANNOT BE NULL');

    let swap = SwapObject.load(nugg.id.concat('-').concat(event.params.endingEpoch.toString()));

    assert(swap != null, 'handleClaim: SWAP CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString());

    assert(nugg != null, 'handleClaim: USER CANNOT BE NULL');

    // @todo - make sure to do this somewhere else - nugg.activeSwap = null;

    let offer = OfferObject.load(swap.id.concat('-').concat(user.id));

    assert(offer != null, 'handleClaim: OFFER CANNOT BE NULL');

    offer.claimed = true;

    offer.save();

    log.info('handleClaim end', []);
}

export function handleClaimItem(event: ClaimItem): void {
    log.info('handleClaimItem start', []);

    log.info('handleClaimItem end', []);
}

export function handleSwap(event: SwapEvent): void {
    log.info('handleSwap start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let user = User.load(event.params.account.toHexString());

    assert(user != null, 'handleSwap: USER CANNOT BE NULL');

    let nugg = Nugg.load(event.params.tokenid.toString());

    assert(nugg != null, 'handleOffer: NUGG CANNOT BE NULL');
    assert(nugg.activeSwap == null, 'handleOffer: NUGG.activeSwap MUST BE NULL');

    let swap = new SwapObject(proto.epoch.concat('-').concat('PENDING'));

    // swap.epochId = proto.epoch;
    // swap.epoch = proto.epoch;
    swap.eth = event.transaction.value;
    swap.ethUsd = wethToUsdc(swap.eth);
    swap.owner = user.id;
    swap.leader = proto.nullUser;

    swap.save();

    nugg.activeSwap = swap.id;

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

export function handleSwapItem(event: SwapItem): void {
    log.info('handleSwapItem start', []);

    log.info('handleSwapItem end', []);
}
