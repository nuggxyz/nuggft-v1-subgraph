import { log } from '@graphprotocol/graph-ts';
import { Item, Nugg, Protocol, User, NuggItem, Offer, Swap } from '../generated/local/schema';
import { BigInt } from '@graphprotocol/graph-ts';
import {
    PreMint,
    PopItem,
    PushItem,
    Genesis,
    Claim,
    Mint,
    ClaimItem,
    Commit,
    CommitItem,
    OfferItem,
    SwapItem,
} from '../generated/local/NuggFT/NuggFT';
import { Transfer } from '../generated/local/NuggFT/NuggFT';
import { store } from '@graphprotocol/graph-ts';
import { invariant } from './uniswap';

function makeNuggItemId(tokenId: string, itemId: string): string {
    return tokenId.concat('-').concat(itemId);
}

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesis start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handleGenesis: PROTOCALL CANNOT BE NULL');

    let nuggft = new User(event.address.toHexString());

    nuggft.xnugg = BigInt.fromString('0');
    nuggft.ethin = BigInt.fromString('0');
    nuggft.ethout = BigInt.fromString('0');
    nuggft.nuggs = [];
    nuggft.offers = [];
    nuggft.save();

    proto.genesisBlock = event.block.number;

    proto.nuggftUser = nuggft.id;

    proto.save();

    log.info('handleGenesis end', []);
}

export function handlePreMint(event: PreMint): void {
    log.info('handlePreMint start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = new Nugg(event.params.tokenId.toString());
    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];

    for (let i = 0; i < event.params.items.length; i++) {
        let item = Item.load(event.params.items[i].toString());
        if (item == null) {
            item = new Item(event.params.items[i].toString());
            item.count = BigInt.fromString('0');
        }
        let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id));

        if (nuggItem == null) {
            nuggItem = new NuggItem(makeNuggItemId(nugg.id, item.id));
            nuggItem.count = BigInt.fromString('0');
            nuggItem.swaps = [];
        }

        nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));
        item.count = item.count.plus(BigInt.fromString('1'));

        nuggItem.item = item.id;
        nuggItem.nugg = nugg.id;

        item.save();
        nuggItem.save();
    }

    nugg.user = proto.nullUser;

    nugg.save();

    log.info('handlePreMint end', []);
}

export function handleTransfer(event: Transfer): void {
    log.info('handleTransfer start', []);

    let nugg = Nugg.load(event.params.tokenId.toString()) as Nugg;

    invariant(nugg != null, 'handleTransfer: NUGG CANNOT BE NULL');

    let user = User.load(event.params.to.toHexString().toLowerCase());

    if (user == null) {
        user = new User(event.params.to.toHexString().toLowerCase());
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
        user.nuggs = [];
        user.offers = [];
        user.save();
    }

    nugg.user = user.id;

    nugg.save();

    log.info('handleTransfer end', []);
}

export function handlePushItem(event: PushItem): void {
    log.info('handlePushItem start', []);

    let nugg = Nugg.load(event.params.tokenId.toString()) as Nugg;

    invariant(nugg != null, 'handlePushItem: NUGG CANNOT BE NULL');
    log.info(event.params.itemId.toString(), []);

    let item = Item.load(event.params.itemId.toString());

    if (item == null) {
        item = new Item(event.params.itemId.toString());
        item.count = BigInt.fromString('1');
        item.save();
    }

    let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id));

    if (nuggItem == null) {
        nuggItem = new NuggItem(makeNuggItemId(nugg.id, item.id));
        nuggItem.count = BigInt.fromString('0');
        nuggItem.swaps = [];
    }

    nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

    nuggItem.save();
}

export function handlePopItem(event: PopItem): void {
    log.info('handlePopItem start', []);

    let nugg = Nugg.load(event.params.tokenId.toString()) as Nugg;

    invariant(nugg != null, 'handlePopItem: NUGG CANNOT BE NULL');

    let item = Item.load(event.params.itemId.toString()) as Item;

    invariant(item != null, 'handlePopItem: ITEM CANNOT BE NULL');

    let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id)) as NuggItem;

    invariant(nuggItem != null, 'handlePopItem: NUGGITEM CANNOT BE NULL');

    nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

    if (nuggItem.count == BigInt.fromString('0')) {
        store.remove('NuggItem', nuggItem.id);
    } else {
        nuggItem.save();
    }

    log.info('handlePopItem end', []);
}
