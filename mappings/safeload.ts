import { log, BigInt, ethereum, Address, store } from '@graphprotocol/graph-ts';
import {
    Epoch,
    Item,
    ItemOffer,
    ItemSwap,
    Nugg,
    NuggItem,
    Offer,
    Protocol,
    Swap,
    User,
    Loan,
    UserActiveSwap,
    NuggActiveItemSwap,
} from '../generated/schema';
import { cacheDotnugg } from './dotnugg';
import { bigi } from './utils';

export function safeLoadActiveEpoch(): Epoch {
    let loaded = safeLoadProtocol();

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
    epoch.idnum = id;
    return epoch;
}
export function safeAddNuggToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalNuggs = loaded.totalNuggs.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddUserToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalUsers = loaded.totalUsers.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddSwapToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalSwaps = loaded.totalSwaps.plus(BigInt.fromString('1'));
    loaded.save();
}

export function safeAddLoanToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalLoans = loaded.totalLoans.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddItemToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalItems = loaded.totalItems.plus(BigInt.fromString('1'));
    loaded.save();
}
export function safeAddItemSwapToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalItemSwaps = loaded.totalItemSwaps.plus(BigInt.fromString('1'));
    loaded.save();
}

export function safeLoadProtocol(): Protocol {
    let loaded = Protocol.load('' + '0x42069');
    if (loaded == null) log.critical('Protocol CANNOT BE NULL:', []);
    return loaded as Protocol;
}

export function safeLoadNugg(id: BigInt): Nugg {
    let ids = '' + id.toString();
    let loaded = Nugg.load(ids);
    if (loaded == null) {
        log.error('CRITICAL: Nugg CANNOT BE NULL:' + ids, []);
        log.critical('def', []);
    }
    return loaded as Nugg;
}

export function safeLoadNuggNull(id: BigInt): Nugg | null {
    let ids = '' + id.toString();
    let loaded = Nugg.load(ids);
    return loaded;
}

export function safeSetNuggActiveSwap(nugg: Nugg, swap: Swap): void {
    nugg.activeSwap = swap.id;
    nugg.protocol = '0x42069';
    nugg.save();
}

export function safeSetNuggActiveLoan(nugg: Nugg, loan: Loan): void {
    nugg.activeLoan = loan.id;
    loan.protocol = '0x42069';
    nugg.save();
    loan.save();
}

export function safeRemoveNuggActiveSwap(nugg: Nugg): void {
    nugg.activeSwap = null;
    nugg.protocol = null;
    nugg.save();
}

export function safeRemoveNuggActiveLoan(nugg: Nugg): void {
    nugg.activeLoan = null;
    nugg.protocol = null;
    nugg.save();
}

export function safeNewNugg(id: BigInt, userId: string, block: ethereum.Block): Nugg {
    let loaded = new Nugg(id.toString());
    loaded.idnum = id;
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.resolver = '0x0000000000000000000000000000000000000000';
    loaded.save();

    safeAddNuggToProtcol();

    cacheDotnugg(loaded, block.number.toI32());

    return loaded;
}

export function safeNewNuggNoCache(id: BigInt, userId: string): Nugg {
    let loaded = new Nugg(id.toString());
    loaded.idnum = id;
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.resolver = '0x0000000000000000000000000000000000000000';
    loaded.save();

    safeAddNuggToProtcol();

    return loaded;
}
// "nuggft": "0x5d5f16B48af3fB4f6acbCf3087699d99bd902A40",

export function safeLoadUserFromString(userId: string): User {
    let id = '' + userId;
    let loaded = User.load(id);
    if (loaded == null) log.critical('User CANNOT BE NULL:' + id, []);
    return loaded as User;
}

export function safeLoadUser(userId: Address): User {
    let id = '' + userId.toHexString();
    let loaded = User.load(id);
    if (loaded == null) log.critical('User CANNOT BE NULL:' + id, []);
    return loaded as User;
}

export function safeNewUser(userId: Address): User {
    let id = '' + userId.toHexString();
    // 0xf0dcdec50135504e000000000000000000000040
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
    let loaded = Item.load(id.toString());
    if (loaded === null) {
        log.error('ITEM IS NULLLLLLLLLL:' + id.toString(), []);
        log.critical('Item CANNOT BE NULL:' + id.toString(), []);
    }
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

export function safeSetItemActiveSwap(item: Item, itemswap: ItemSwap): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.activeSwap = itemswap.id;
    item.protocol = '0x42069';
    item.save();
}

export function unsafeSetItemActiveSwap(item: string, itemswap: ItemSwap): void {
    let _item = safeLoadItem(BigInt.fromString(item));
    _item.activeSwap = itemswap.id;
    _item.protocol = '0x42069';
    _item.save();
}

export function safeRemoveItemActiveSwap(item: Item): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.activeSwap = null;
    item.protocol = null;
    item.save();
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

export function unsafeLoadItem(id: string): Item {
    let loaded = Item.load('' + id);
    if (loaded == null) log.critical('Item CANNOT BE NULL:' + id, []);
    return loaded as Item;
}

export function safeLoadNuggItemHelper(nugg: Nugg, item: Item): NuggItem {
    let id = nugg.id + '-' + item.id;
    let loaded = NuggItem.load(id);
    if (loaded === null) {
        log.warning('HERE', []);
        log.critical('NuggItem CANNOT BE NULL:' + id, []);
    }
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelperNull(nugg: Nugg, item: Item): NuggItem | null {
    let id = nugg.id + '-' + item.id;
    let loaded = NuggItem.load(id);

    return loaded;
}

export function safeNewNuggItem(nugg: Nugg, item: Item): NuggItem {
    let id = nugg.id + '-' + item.id;
    let loaded = new NuggItem(id);
    loaded.numSwaps = BigInt.fromString('0');
    return loaded;
}
export function safeLoadActiveSwap(nugg: Nugg): Swap {
    if (nugg.activeSwap == null)
        log.critical('safeLoadActiveSwap: NUGG.activeSwap CANNOT BE NULL,', []);
    let id = nugg.activeSwap as string;
    let loaded = Swap.load(nugg.activeSwap as string);
    if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
    return loaded as Swap;
}

// export function safeNewSwapHelper(nugg: Nugg, endingEpoch: BigInt): Swap {
//     let id = '' + nugg.id + '-' + endingEpoch.toString();
//     let swap = new Swap(id);
//     swap.endingEpoch = endingEpoch;

//     safeAddSwapToProtcol();
//     return swap as Swap;
// }

export function safeNewSwapHelper(nugg: Nugg): Swap {
    let currNum = nugg.numSwaps;
    nugg.numSwaps = nugg.numSwaps.plus(BigInt.fromString('1'));
    nugg.save();

    let id = '' + nugg.id + '-' + currNum.toString();
    let swap = new Swap(id);
    // swap.endingEpoch = endingEpoch;
    swap.num = currNum;

    safeAddSwapToProtcol();
    return swap as Swap;
}

// export function safeLoadSwapHelper(nugg: Nugg, endingEpoch: BigInt): Swap {
//     let id = '' + nugg.id + '-' + endingEpoch.toString();
//     let loaded = Swap.load(id);
//     if (loaded == null) log.critical('Swap CANNOT BE NULL:' + id, []);
//     return loaded as Swap;
// }

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

export function safeNewLoanHelper(): Loan {
    let loaded = safeLoadProtocol();
    let id = loaded.totalLoans.toString();
    let loan = new Loan(id);
    safeAddLoanToProtcol();
    return loan as Loan;
}

export function safeLoadLoanHelper(nugg: Nugg): Loan {
    if (nugg.activeLoan == null) log.critical('nugg.activeLoan CANNOT BE NULL:' + nugg.id, []);
    let id = nugg.activeLoan as string;
    let loaded = Loan.load(id);
    if (loaded == null) log.critical('Loan CANNOT BE NULL:' + id, []);
    return loaded as Loan;
}

export function safeLoadActiveNuggItemSwap(nuggItem: NuggItem): ItemSwap {
    if (nuggItem.activeSwap == '')
        log.critical('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL', []);

    let id = nuggItem.activeSwap as string;
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

export function safeLoadActiveItemSwap(item: Item): ItemSwap {
    if (item.activeSwap == '')
        log.critical('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL', []);

    let id = item.activeSwap as string;
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}
export function unsafeLoadItemSwap(id: string): ItemSwap {
    let loaded = ItemSwap.load(id);
    if (loaded == null) log.critical('ItemSwap CANNOT BE NULL:' + id, []);
    return loaded as ItemSwap;
}

// export function safeLoadItemSwapHelper(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
//     let header = '';
//     let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
//     let loaded = ItemSwap.load(id);
//     if (loaded == null) log.critical('ItemSwap CANNOT BE NULL:' + id, []);
//     return loaded as ItemSwap;
// }

// export function safeLoadItemSwapHelperNull(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap | null {
//     let header = '';
//     let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
//     return ItemSwap.load(id);
// }

export function safeNewItemSwap(sellingNuggItem: NuggItem): ItemSwap {
    let currNum = sellingNuggItem.numSwaps;
    sellingNuggItem.numSwaps = sellingNuggItem.numSwaps.plus(BigInt.fromString('1'));
    sellingNuggItem.save();

    let id = sellingNuggItem.id + '-' + currNum.toString();

    safeAddItemSwapToProtcol();
    let swap = new ItemSwap(id);
    swap.num = sellingNuggItem.numSwaps;
    // swap.endingEpoch = endingEpoch;

    return swap;
}
export function safeSetUserActiveSwap(user: User, nugg: Nugg, swap: Swap): void {
    // require user && swap
    if (user == null) {
        log.error('safeSetUserActiveSwap: user CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (nugg == null) {
        log.error('safeSetUserActiveSwap: nugg CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (swap == null) {
        log.error('safeSetUserActiveSwap: swap CANNOT BE NULL,', []);
        log.critical('', []);
    }
    let id = user.id + '-' + nugg.id;
    let loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        loaded = new UserActiveSwap(id);
        loaded.activeId = swap.id;
        loaded.save();
    } else {
        if (loaded.activeId != swap.id) {
            log.error(
                'safeSetUserActiveSwap: new useractiveswap trying to be set when old still exists',
                [],
            );
            log.critical('', []);
        }
    }
}

export function safeGetAndDeleteUserActiveSwap(user: User, nugg: Nugg): Swap {
    // require user && nugg

    if (user == null) {
        log.error('safeGetAndDeleteUserActiveSwap: user CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (nugg == null) {
        log.error('safeGetAndDeleteUserActiveSwap: nugg CANNOT BE NULL,', []);
        log.critical('', []);
    }

    let id = user.id + '-' + nugg.id;
    let loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        log.error('safeGetAndDeleteUserActiveSwap: UserActiveSwap CANNOT BE NULL,', []);
        log.critical('', []);
    }
    let swap = Swap.load((loaded as UserActiveSwap).activeId);

    if (swap == null) {
        log.error('safeGetAndDeleteUserActiveSwap: swap CANNOT BE NULL,', []);
        log.critical('', []);
    }

    store.remove('UserActiveSwap', id);

    return swap as Swap;
}
//////////////////////////////////
export function safeSetNuggActiveItemSwap(nugg: Nugg, nuggItem: NuggItem, swap: ItemSwap): void {
    // require nugg && swap
    if (nugg == null) {
        log.error('safeSetNuggActiveItemSwap: nugg CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (nuggItem == null) {
        log.error('safeSetNuggActiveItemSwap: nuggItem CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (swap == null) {
        log.error('safeSetNuggActiveItemSwap: swap CANNOT BE NULL,', []);
        log.critical('', []);
    }
    let id = nugg.id + '-' + nuggItem.id;
    let loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        loaded = new NuggActiveItemSwap(id);
        loaded.activeId = swap.id;
        loaded.save();
    } else {
        if (loaded.activeId != swap.id) {
            log.error(
                'safeSetNuggActiveItemSwap: new nuggactiveswap trying to be set when old still exists',
                [],
            );
            log.critical('', []);
        }
    }
}

export function safeGetAndDeleteNuggActiveItemSwap(nugg: Nugg, nuggItem: NuggItem): ItemSwap {
    // require nugg && nuggItem

    if (nugg == null) {
        log.error('safeGetAndDeleteNuggActiveItemSwap: nugg CANNOT BE NULL,', []);
        log.critical('', []);
    }

    if (nuggItem == null) {
        log.error('safeGetAndDeleteNuggActiveItemSwap: nuggItem CANNOT BE NULL,', []);
        log.critical('', []);
    }

    let id = nugg.id + '-' + nuggItem.id;
    let loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        log.error('safeGetAndDeleteNuggActiveItemSwap: NuggActiveItemSwap CANNOT BE NULL,', []);
        log.critical('', []);
    }
    let swap = ItemSwap.load((loaded as NuggActiveItemSwap).activeId);

    if (swap == null) {
        log.error('safeGetAndDeleteNuggActiveItemSwap: swap CANNOT BE NULL,', []);
        log.critical('', []);
    }

    store.remove('NuggActiveItemSwap', id);

    return swap as ItemSwap;
}

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
    let id = swap.id + '-' + nugg.id;
    return new ItemOffer(id);
}

export function safeLoadItemOfferHelperNull(swap: ItemSwap, nugg: Nugg): ItemOffer | null {
    let id = swap.id + '-' + nugg.id;
    return ItemOffer.load(id);
}

export function safeLoadItemOfferHelper(swap: ItemSwap, nugg: Nugg): ItemOffer {
    let id = swap.id + '-' + nugg.id;
    let loaded = ItemOffer.load(id);
    if (loaded == null) log.critical('ItemOffer CANNOT BE NULL:' + id, []);
    return loaded as ItemOffer;
}
