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
import { Transfer } from '../generated/ropsten/NuggFT/NuggFT';
import { store } from '@graphprotocol/graph-ts';

function makeNuggItemId(tokenId: string, itemId: string): string {
    return tokenId.concat('-').concat(itemId);
}

export function handlePreMint(event: PreMint): void {
    log.info('handlePreMint start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'handlePreMint: PROTOCOL CANNOT BE NULL');

    let nugg = new Nugg(event.params.tokenId.toString());

    for (let i = 0; i < event.params.items.length; i++) {
        let item = Item.load(event.params.items[i].toHexString());
        if (item == null) {
            item = new Item(event.params.items[i].toHexString());
            item.count = BigInt.fromString('0');
        }
        let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id));

        if (nuggItem == null) {
            nuggItem = new NuggItem(makeNuggItemId(nugg.id, item.id));
            nuggItem.count = BigInt.fromString('0');
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

export function handleTransferNuggFT(event: Transfer): void {
    log.info('handleTransfer start', []);

    let nugg = Nugg.load(event.params.tokenId.toString());

    assert(nugg != null, 'handleTransfer: NUGG CANNOT BE NULL');

    let user = User.load(event.params.to.toHexString().toLowerCase());

    if (user == null) {
        user = new User(event.params.to.toHexString().toLowerCase());
        user.xnugg = BigInt.fromString('0');
        user.save();
    }

    nugg.user = user.id;

    nugg.save();

    log.info('handleTransfer end', []);
}

export function handlePopItem(event: PopItem): void {
    log.info('handlePopItem start', []);

    let nugg = Nugg.load(event.params.tokenId.toString());

    assert(nugg != null, 'handlePopItem: NUGG CANNOT BE NULL');

    let item = Item.load(event.params.itemId.toString());

    assert(item != null, 'handlePushItem: ITEM CANNOT BE NULL');

    let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id));

    if (nuggItem == null) {
        nuggItem = new NuggItem(makeNuggItemId(nugg.id, item.id));
        nuggItem.count = BigInt.fromString('0');
    }

    nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

    nuggItem.save();

    log.info('handlePopItem end', []);
}

export function handlePushItem(event: PushItem): void {
    log.info('handlePushItem start', []);

    let nugg = Nugg.load(event.params.tokenId.toString());

    assert(nugg != null, 'handlePushItem: NUGG CANNOT BE NULL');

    let item = Item.load(event.params.itemId.toString());

    assert(item != null, 'handlePushItem: ITEM CANNOT BE NULL');

    let nuggItem = NuggItem.load(makeNuggItemId(nugg.id, item.id));

    assert(nuggItem != null, 'handlePushItem: NUGGITEM CANNOT BE NULL');

    nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

    if (nuggItem.count == BigInt.fromString('0')) {
        store.remove('NuggItem', nuggItem.id);
    } else {
        nuggItem.save();
    }

    log.info('handlePushItem end', []);
}
