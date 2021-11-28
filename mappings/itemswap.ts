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
import { ItemOffer, ItemSwap, NuggItem } from '../generated/local/schema';
import { Nugg, Swap as SwapObject, Protocol, User, Offer as OfferObject } from '../generated/local/schema';
import { invariant, wethToUsdc } from './uniswap';

export function handleCommitItem(event: CommitItem): void {
    log.info('handleCommitItem start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let sellingNugg = Nugg.load(event.params.sellingTokenId.toString()) as Nugg;

    invariant(sellingNugg != null, 'handleOfferItem: NUGG CANNOT BE NULL');

    let nuggItem = NuggItem.load(sellingNugg.id.concat('-').concat(event.params.itemId.toString())) as NuggItem;

    invariant(nuggItem != null, 'handleOfferItem: NUGG.activeSwap CANNOT BE NULL');
    invariant(nuggItem.activeSwap != null, 'handleOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    let swap = ItemSwap.load(nuggItem.activeSwap) as ItemSwap;

    invariant(swap != null, 'handleOfferItem: SWAP CANNOT BE NULL');
    invariant(swap.epochId == null, 'handleCommitItem: SWAP.epochId MUST BE NULL');

    let buyingNugg = Nugg.load(event.params.buyingTokenId.toHexString()) as Nugg;

    invariant(nuggItem != null, 'handleOfferItem: BUYINGNUGG CANNOT BE NULL');

    let offer = ItemOffer.load(swap.id.concat('-').concat(buyingNugg.id)) as ItemOffer;

    if (offer == null) {
        offer = new ItemOffer(swap.id.concat('-').concat(buyingNugg.id));
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.nugg = buyingNugg.id;
        offer.swap = swap.id;
        offer.save();
    }

    offer.eth = offer.eth.plus(event.transaction.value);
    offer.ethUsd = wethToUsdc(offer.eth);

    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = buyingNugg.id;

    swap.epochId = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();
    swap.epoch = BigInt.fromString(proto.epoch).plus(BigInt.fromString('1')).toString();

    offer.save();
    swap.save();

    log.info('handleCommitItem end', []);
}

export function handleOfferItem(event: OfferItem): void {
    log.info('handleOfferItem start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = Nugg.load(event.params.sellingTokenId.toString()) as Nugg;

    invariant(nugg != null, 'handleOfferItem: NUGG CANNOT BE NULL');

    let nuggItem = NuggItem.load(event.params.itemId.toString()) as NuggItem;

    invariant(nuggItem != null, 'handleOfferItem: NUGG.activeSwap CANNOT BE NULL');
    invariant(nuggItem.activeSwap != null, 'handleOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    let swap = ItemSwap.load(nuggItem.activeSwap) as ItemSwap;

    invariant(swap != null, 'handleOfferItem: SWAP CANNOT BE NULL');

    let buyingNugg = Nugg.load(event.params.buyingTokenId.toString()) as Nugg;

    invariant(buyingNugg != null, 'handleOfferItem: NUGG CANNOT BE NULL');

    let offer = ItemOffer.load(swap.id.concat('-').concat(buyingNugg.id)) as ItemOffer;

    if (offer == null) {
        offer = new ItemOffer(swap.id.concat('-').concat(buyingNugg.id));
        offer.claimed = false;
        offer.eth = BigInt.fromString('0');
        offer.ethUsd = BigInt.fromString('0');
        offer.owner = false;
        offer.nugg = buyingNugg.id;
        offer.swap = swap.id;
        offer.save();
    }

    offer.eth = offer.eth.plus(event.transaction.value);
    offer.ethUsd = wethToUsdc(offer.eth);

    swap.eth = offer.eth;
    swap.ethUsd = offer.ethUsd;

    swap.leader = buyingNugg.id;

    offer.save();
    swap.save();

    log.info('handleOffer end', []);
}

export function handleClaimItem(event: ClaimItem): void {
    log.info('handleClaimItem start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handleClaimItem: PROTOCOL CANNOT BE NULL');

    let sellingNugg = Nugg.load(event.params.sellingTokenId.toString()) as Nugg;

    invariant(sellingNugg != null, 'handleClaimItem: SELLINGNUGG CANNOT BE NULL');

    let swap = ItemSwap.load(
        sellingNugg.id.concat('-').concat(event.params.itemId.toString()).concat(event.params.endingEpoch.toString()),
    ) as ItemSwap;

    invariant(swap != null, 'handleClaimItem: SWAP CANNOT BE NULL');

    let buyingNugg = Nugg.load(event.params.buyingTokenId.toString()) as Nugg;

    invariant(buyingNugg != null, 'handleClaimItem: BUYINGNUGG CANNOT BE NULL');

    // @todo - make sure to do this somewhere else - nugg.activeSwap = null;

    let offer = ItemOffer.load(swap.id.concat('-').concat(buyingNugg.id)) as ItemOffer;

    invariant(offer != null, 'handleClaimItem: ITEMOFFER CANNOT BE NULL');

    offer.claimed = true;

    offer.save();

    log.info('handleClaimItem end', []);
}

export function handleSwapItem(event: SwapItem): void {
    log.info('handleSwapItem start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handleSwapItem: PROTOCOL CANNOT BE NULL');

    let sellingNugg = Nugg.load(event.params.sellingTokenId.toHexString()) as Nugg;

    invariant(sellingNugg != null, 'handleSwapItem: SELLINGNUGG CANNOT BE NULL');

    let sellingNuggItem = NuggItem.load(sellingNugg.id.concat(event.params.itemId.toString())) as NuggItem;

    invariant(sellingNuggItem != null, 'handleSwapItem: SELLINGNUGGITEM CANNOT BE NULL');
    invariant(sellingNuggItem.activeSwap == null, 'handleSwapItem: sellingNuggItem.activeSwap MUST BE NULL');

    let itemSwap = new ItemSwap(sellingNuggItem.id);
    sellingNuggItem.activeSwap = itemSwap.id;
    itemSwap.sellingNuggItem = sellingNuggItem.id;
    itemSwap.sellingNuggItemId = sellingNuggItem.id;

    // swap.epochId = proto.epoch;
    // swap.epoch = proto.epoch;
    itemSwap.eth = event.transaction.value;
    itemSwap.ethUsd = wethToUsdc(itemSwap.eth);
    itemSwap.owner = sellingNugg.id;
    // swap.leader = proto.nullUser;

    itemSwap.save();

    let offer = new ItemOffer(itemSwap.id.concat('-').concat(sellingNugg.id));

    offer.claimed = false;
    offer.eth = event.transaction.value;
    offer.ethUsd = wethToUsdc(offer.eth);
    offer.owner = true;
    offer.nugg = sellingNugg.id;
    offer.swap = itemSwap.id;

    offer.save();

    log.info('handleSwapItem end', []);
}
