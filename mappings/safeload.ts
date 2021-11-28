import { log, BigInt } from '@graphprotocol/graph-ts';
import { Item, ItemOffer, ItemSwap, Nugg, NuggItem, Offer, Protocol, Swap, User } from '../generated/local/schema';

export function safeLoadProtocol(id: string): Protocol {
    let loaded = Protocol.load(id);
    if (loaded == null) log.critical('Protocol CANNOT BE NULL:' + id, []);
    return loaded as Protocol;
}

export function safeLoadNugg(id: string): Nugg {
    let loaded = Nugg.load(id);
    if (loaded == null) log.critical('Nugg CANNOT BE NULL:' + id, []);
    return loaded as Nugg;
}

export function safeLoadUser(id: string): User {
    let loaded = User.load(id);
    if (loaded == null) log.critical('User CANNOT BE NULL:' + id, []);
    return loaded as User;
}

export function safeLoadItem(id: string): Item {
    let loaded = Item.load(id);
    if (loaded == null) log.critical('Item CANNOT BE NULL:' + id, []);
    return loaded as Item;
}

export function safeLoadNuggItem(id: string): NuggItem {
    let loaded = NuggItem.load(id);
    if (loaded == null) log.critical('NuggItem CANNOT BE NULL:' + id, []);
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelper(nugg: Nugg, item: Item): NuggItem {
    let id = nugg.id.concat('-').concat(item.id.toString());
    return safeLoadNuggItem(id);
}

export function safeLoadSwap(id: string): Swap {
    let loaded = Swap.load(id);
    if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
    return loaded as Swap;
}

// export function safeLoadSwapHelper(nuggId: string, itemId: BigInt): NuggItem {
//     let id = nuggId.concat('-').concat(itemId.toString());
//     return safeLoadNuggItem(id);
// }

export function safeLoadItemSwap(id: string): ItemSwap {
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

export function safeLoadItemSwapHelper(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
    let id = sellingNuggItem.id.concat('-').concat(endingEpoch.toString());
    return safeLoadItemSwap(id);
}

export function safeLoadItemSwapHelperNull(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap | null {
    let id = sellingNuggItem.id.concat('-').concat(endingEpoch.toString());
    return ItemSwap.load(id);
}

export function safeNewItemSwap(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
    let id = sellingNuggItem.id.concat('-').concat(endingEpoch.toString());
    return new ItemSwap(id);
}
export function safeLoadOffer(id: string): Offer {
    let loaded = Offer.load(id);
    if (loaded == null) log.critical('Offer CANNOT BE NULL:' + id, []);
    return loaded as Offer;
}

export function safeLoadItemOffer(id: string): ItemOffer {
    let loaded = ItemOffer.load(id);
    if (loaded == null) log.critical('ItemOffer CANNOT BE NULL:' + id, []);
    return loaded as ItemOffer;
}

export function safeNewItemOffer(swap: ItemSwap, nugg: Nugg): ItemOffer {
    let id = swap.id.concat('-').concat(nugg.id.toString());
    return new ItemOffer(id);
}

export function safeLoadItemOfferHelperNull(swap: ItemSwap, nugg: Nugg): ItemOffer | null {
    let id = swap.id.concat('-').concat(nugg.id.toString());
    return ItemOffer.load(id);
}

export function safeLoadItemOfferHelper(swap: ItemSwap, nugg: Nugg): ItemOffer {
    let id = swap.id.concat('-').concat(nugg.id.toString());
    return safeLoadItemOffer(id);
}
