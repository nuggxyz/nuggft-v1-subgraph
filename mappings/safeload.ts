import { log, BigInt, ethereum, Address } from '@graphprotocol/graph-ts';
import { Epoch, Item, ItemOffer, ItemSwap, Nugg, NuggItem, Offer, Protocol, Swap, User } from '../generated/local/schema';

export function safeLoadActiveEpoch(): Epoch {
    let loaded = safeLoadProtocol('0x42069');

    if (loaded.epoch == null) log.critical('Protocol.epoch CANNOT BE NULL:', []);

    let epoch = Epoch.load(loaded.epoch);

    if (epoch == null) log.critical('ACTIVE EPOCH CANNOT BE NULL: ' + loaded.epoch, []);

    return epoch as Epoch;
}

export function safeLoadEpoch(id: BigInt): Epoch {
    let epoch = Epoch.load(id.toString());

    if (epoch == null) log.critical(' EPOCH CANNOT BE NULL: ' + id.toString(), []);

    return epoch as Epoch;
}

export function safeNewEpoch(id: BigInt): Epoch {
    let epoch = new Epoch(id.toString());

    return epoch;
}
export function safeAddNuggToProtcol(): void {
    let loaded = safeLoadProtocol('0x42069');
    loaded.totalNuggs = loaded.totalNuggs.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddUserToProtcol(): void {
    let loaded = safeLoadProtocol('0x42069');
    loaded.totalUsers = loaded.totalUsers.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddSwapToProtcol(): void {
    let loaded = safeLoadProtocol('0x42069');
    loaded.totalSwaps = loaded.totalSwaps.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddItemToProtcol(): void {
    let loaded = safeLoadProtocol('0x42069');
    loaded.totalItems = loaded.totalItems.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddItemSwapToProtcol(): void {
    let loaded = safeLoadProtocol('0x42069');
    loaded.totalItemSwaps = loaded.totalItemSwaps.plus(BigInt.fromString('1'));
    loaded.save();
}

export function safeLoadProtocol(id: string): Protocol {
    let loaded = Protocol.load('' + id);
    if (loaded == null) log.critical('Protocol CANNOT BE NULL:' + id, []);
    return loaded as Protocol;
}

export function safeLoadNugg(id: BigInt): Nugg {
    let ids = '' + id.toString();
    let loaded = Nugg.load(ids);
    if (loaded == null) log.critical('Nugg CANNOT BE NULL:' + ids, []);
    return loaded as Nugg;
}

export function safeSetNuggActiveSwap(nugg: Nugg, swap: Swap): void {
    nugg.activeSwap = swap.id;
    nugg.protocol = '0x42069';
    nugg.save();
}

export function safeRemoveNuggActiveSwap(nugg: Nugg): void {
    nugg.activeSwap = null;
    nugg.protocol = null;
    nugg.save();
}
export function safeNewNugg(id: BigInt): Nugg {
    let loaded = new Nugg('' + id.toString());
    safeAddNuggToProtcol();
    return loaded;
}

export function safeLoadUser(userId: Address): User {
    let id = '' + userId.toHexString();
    let loaded = User.load(id);
    if (loaded == null) log.critical('User CANNOT BE NULL:' + id, []);
    return loaded as User;
}

export function safeNewUser(userId: Address): User {
    let id = '' + userId.toHexString();
    let loaded = new User(id);
    safeAddUserToProtcol();
    return loaded;
}

export function safeLoadUserNull(userId: Address): User | null {
    let id = '' + userId.toHexString();
    let loaded = User.load(id);
    return loaded;
}

export function safeLoadItem(id: BigInt): Item {
    let loaded = Item.load('' + id.toString());
    if (loaded == null) log.critical('Item CANNOT BE NULL:' + id.toString(), []);
    return loaded as Item;
}

export function safeLoadItemNull(id: BigInt): Item | null {
    let loaded = Item.load('' + id.toString());
    return loaded;
}

export function safeNewItem(id: BigInt): Item {
    let loaded = new Item('' + id.toString());
    safeAddItemToProtcol();
    return loaded as Item;
}

export function safeSetNuggItemActiveSwap(nuggitem: NuggItem, itemswap: ItemSwap): void {
    nuggitem.activeSwap = itemswap.id;
    nuggitem.protocol = '0x42069';
    nuggitem.save();
}
export function safeRemoveNuggItemActiveSwap(nuggitem: NuggItem): void {
    nuggitem.activeSwap = null;
    nuggitem.protocol = null;
    nuggitem.save();
}
export function unsafeLoadNuggItem(id: string): NuggItem {
    let loaded = NuggItem.load('' + id);
    if (loaded == null) log.critical('NuggItem CANNOT BE NULL:' + id, []);
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelper(nugg: Nugg, item: Item): NuggItem {
    let header = '';
    let id = header.concat(nugg.id).concat('-').concat(item.id.toString());
    let loaded = NuggItem.load(id);
    if (loaded == null) log.critical('NuggItem CANNOT BE NULL:' + id, []);
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelperNull(nugg: Nugg, item: Item): NuggItem | null {
    let header = '';
    let id = header.concat(nugg.id).concat('-').concat(item.id.toString());
    let loaded = NuggItem.load(id);

    return loaded;
}

export function safeNewNuggItem(nugg: Nugg, item: Item): NuggItem {
    let header = '';
    let id = header.concat(nugg.id).concat('-').concat(item.id.toString());
    let loaded = new NuggItem(id);

    return loaded;
}
export function safeLoadActiveSwap(nugg: Nugg): Swap {
    if (nugg.activeSwap == null) log.critical('safeLoadActiveSwap: NUGG.activeSwap CANNOT BE NULL,', []);
    let id = nugg.activeSwap as string;
    let loaded = Swap.load(nugg.activeSwap as string);
    if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
    return loaded as Swap;
}

export function safeNewSwapHelper(nugg: Nugg, endingEpoch: BigInt): Swap {
    let id = '' + nugg.id + '-' + endingEpoch.toString();
    let swap = new Swap(id);
    safeAddSwapToProtcol();
    return swap as Swap;
}

export function safeLoadSwapHelper(nugg: Nugg, endingEpoch: BigInt): Swap {
    let id = '' + nugg.id + '-' + endingEpoch.toString();
    let loaded = Swap.load(id);
    if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
    return loaded as Swap;
}

export function unsafeLoadSwap(id: string): Swap {
    // let id = '' + tokenId.toString() + '-' + endingEpoch.toString();
    let loaded = Swap.load(id);
    if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
    return loaded as Swap;
}

// export function safeLoadSwapHelper(nuggId: string, itemId: BigInt): NuggItem {
//     let id = nuggId.concat('-').concat(itemId.toString());
//     return safeLoadNuggItem(id);
// }

export function safeLoadActiveItemSwap(nuggItem: NuggItem): ItemSwap {
    if (nuggItem.activeSwap == '') log.critical('handleOfferItem: NUGGITEM.activeSwap CANNOT BE NULL', []);

    let id = nuggItem.activeSwap as string;
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

export function unsafeLoadItemSwap(id: string): ItemSwap {
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

export function safeLoadItemSwapHelper(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
    let header = '';
    let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

export function safeLoadItemSwapHelperNull(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap | null {
    let header = '';
    let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
    return ItemSwap.load(id);
}

export function safeNewItemSwap(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
    let header = '';
    let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
    safeAddItemSwapToProtcol();
    return new ItemSwap(id);
}
// export function safeLoadOffer(id: string): Offer {
//     let loaded = Offer.load('' + id);
//     if (loaded == null) log.critical('Offer CANNOT BE NULL:' + id, []);
//     return loaded as Offer;
// }

// export function safeLoadOfferNull(id: string): Offer | null {
//     let loaded = Offer.load('' + id);
//     return loaded;
// }

export function safeLoadOfferHelperNull(swap: Swap, user: User): Offer | null {
    let loaded = Offer.load('' + swap.id + '-' + user.id);
    return loaded;
}

export function safeNewOfferHelper(swap: Swap, user: User): Offer {
    let loaded = new Offer('' + swap.id + '-' + user.id);
    return loaded;
}

export function safeLoadOfferHelper(swap: Swap, user: User): Offer {
    let id = '' + swap.id + '-' + user.id;
    let loaded = Offer.load(id);
    if (loaded == null) log.critical('Offer CANNOT BE NULL:' + id, []);
    return loaded as Offer;
}

// export function safeLoadItemOffer(id: string): ItemOffer {
//     let header = '';

//     let loaded = ItemOffer.load(header + id);
//     if (loaded == null) log.critical('ItemOffer CANNOT BE NULL:' + id, []);
//     return loaded as ItemOffer;
// }

export function safeNewItemOffer(swap: ItemSwap, nugg: Nugg): ItemOffer {
    let header = '';
    let id = header.concat(swap.id).concat('-').concat(nugg.id.toString());
    return new ItemOffer(id);
}

export function safeLoadItemOfferHelperNull(swap: ItemSwap, nugg: Nugg): ItemOffer | null {
    let header = '';
    let id = header.concat(swap.id).concat('-').concat(nugg.id.toString());
    return ItemOffer.load(id);
}

export function safeLoadItemOfferHelper(swap: ItemSwap, nugg: Nugg): ItemOffer {
    let header = '';
    let id = header.concat(swap.id).concat('-').concat(nugg.id.toString());
    let loaded = ItemOffer.load(id);
    if (loaded == null) log.critical('ItemOffer CANNOT BE NULL:' + id, []);
    return loaded as ItemOffer;
}
