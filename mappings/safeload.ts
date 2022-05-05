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
    NuggSnapshot,
    ItemSnapshot,
} from '../generated/schema';
import { cacheDotnugg, updateProof } from './dotnugg';
import { panicFatal } from './uniswap';
import { bigi } from './utils';

export function safeLoadActiveEpoch(): Epoch {
    let loaded = safeLoadProtocol();

    if (loaded.epoch == null) panicFatal('safeLoadActiveEpoch: Protocol.epoch CANNOT BE NULL:');

    let epoch = Epoch.load(loaded.epoch);

    if (epoch == null)
        panicFatal('safeLoadActiveEpoch: ACTIVE EPOCH CANNOT BE NULL: ' + loaded.epoch);

    return epoch as Epoch;
}

export function safeLoadEpoch(id: BigInt): Epoch {
    log.info('safeLoadEpoch IN [id:{}]', [id.toString()]);

    let epoch = Epoch.load(id.toString());

    if (epoch == null) panicFatal('safeLoadEpoch: EPOCH CANNOT BE NULL: ' + id.toString());

    log.info('safeLoadEpoch OUT [epoch:id:{}]', [(epoch as Epoch).id]);

    return epoch as Epoch;
}

export function safeRemoveNuggFromProtcol(nugg: Nugg): void {
    let proto = safeLoadProtocol();
    proto.totalNuggs = proto.totalNuggs.minus(bigi(1));
    proto.totalSwaps = proto.totalSwaps.minus(bigi(1));

    let itm = nugg._items;

    for (let abc = 0; abc < itm.length; abc++) {
        let item = safeLoadItem(bigi(itm[abc]));

        item.count = item.count.minus(bigi(1));

        item.save();

        store.remove('NuggItem', `${itm[abc]}-${nugg.id}`);
    }

    proto.totalItems = proto.totalItems.minus(bigi(itm.length));

    proto.save();

    store.remove('Nugg', nugg.id);

    store.remove('Swap', nugg.id + '-0');
}
export function safeRemoveNuggItemFromProtcol(nuggItem: NuggItem): void {
    let loaded = safeLoadProtocol();
    loaded.totalItems = loaded.totalItems.minus(bigi(1));
    loaded.save();
}

export function safeNewEpoch(id: BigInt): Epoch {
    let epoch = new Epoch(id.toString());
    epoch.idnum = id;
    return epoch;
}
export function safeAddNuggToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalNuggs = loaded.totalNuggs.plus(bigi(1));
    loaded.save();
}

export function safeAddUserToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalUsers = loaded.totalUsers.plus(bigi(1));
    loaded.save();
}
export function safeAddSwapToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalSwaps = loaded.totalSwaps.plus(bigi(1));
    loaded.save();
}

export function safeAddLoanToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalLoans = loaded.totalLoans.plus(bigi(1));
    loaded.save();
}
export function safeAddItemToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalItems = loaded.totalItems.plus(bigi(1));
    loaded.save();
}

export function safeAddItemSwapToProtcol(): void {
    let loaded = safeLoadProtocol();
    loaded.totalItemSwaps = loaded.totalItemSwaps.plus(bigi(1));
    loaded.save();
}

export function safeLoadProtocol(): Protocol {
    let loaded = Protocol.load('' + '0x42069');
    if (loaded == null) panicFatal('safeLoadProtocol: Protocol CANNOT BE NULL:');
    return loaded as Protocol;
}

export function safeLoadNugg(id: BigInt): Nugg {
    log.info('safeLoadNugg IN {}', [id.toString()]);
    let ids = id.toString();
    let loaded = Nugg.load(ids);
    if (loaded == null) {
        log.error('safeLoadNugg ERROR [loaded == null] - {}', [ids]);
        panicFatal('safeLoadNugg: CRITICAL: Nugg CANNOT BE NULL:' + ids);
    }
    log.info('safeLoadNugg OUT {}', [ids]);

    return loaded as Nugg;
}

export function safeLoadNuggNull(id: BigInt): Nugg | null {
    let ids = '' + id.toString();
    let loaded = Nugg.load(ids);
    return loaded;
}

// export function safeRemoveNuggItemActiveSwap(nuggItem: NuggItem): void {
//     nuggItem.activeSwap = null;
//     nuggItem.protocol = null;
//     nuggItem.save();
// }

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

export function safeRemoveNuggActiveSwap(nugg: Nugg): Nugg {
    nugg.activeSwap = null;
    nugg.protocol = null;
    nugg.save();

    return nugg;
}

export function safeRemoveNuggActiveLoan(nugg: Nugg): void {
    nugg.activeLoan = null;
    nugg.protocol = null;
    nugg.save();
}

export function safeNewNugg(id: BigInt, userId: string, epoch: BigInt, blocknum: BigInt): Nugg {
    let loaded = new Nugg(id.toString());
    loaded.idnum = id.toI32();
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.resolver = '0x0000000000000000000000000000000000000000';
    loaded.lastTransfer = epoch.toI32();
    loaded.pendingClaim = false;
    loaded.dotnuggRawCache = '';
    loaded.dotnuggUtfCache = '';
    loaded.save();

    safeAddNuggToProtcol();

    loaded = updateProof(loaded, bigi(0), true);

    loaded = cacheDotnugg(loaded, blocknum);

    return loaded;
}

export function safeNewActiveNuggSnapshot(
    nugg: Nugg,
    userId: string,
    blocknum: BigInt,
): NuggSnapshot | null {
    let curr = NuggSnapshot.load(nugg.activeSnapshot);
    let num = 0;
    if (curr !== null) {
        num = curr.snapshotNum + 1;
        if (curr.proof.equals(nugg.proof)) return null;
    }

    let next = new NuggSnapshot(nugg.id + '-' + num.toString());
    next.nugg = nugg.id;
    next.block = blocknum;
    next.user = userId;
    next._items = nugg._items;
    next.snapshotNum = num;
    next.proof = nugg.proof;
    next.chunkError = false;
    next.chunk = 'pending';
    next.save();

    return next;
}

// export function safeSetNewDotnuggChunk(version: string, index: u32, data: string): void {
//     let a = new DotnuggChunk(version + '-' + index.toString());

//     a.data = data;

//     a.index = index;

//     a.save();
// }

export function safeSetNewActiveItemSnapshot(item: Item, data: string): Item {
    let id = item.id + '-' + '0';

    let next = new ItemSnapshot(id);

    next.item = item.id;
    next.chunkError = !!data.startsWith('ERROR');
    next.chunk = data;
    next.save();

    // let chunk = new DotnuggItemChunk(id + '-' + '0');

    // chunk.index = 0;

    // chunk.data = data;

    item.activeSnapshot = next.id;

    item.save();

    return item;
}

export function safeNewNuggNoCache(id: BigInt, userId: string): Nugg {
    let loaded = new Nugg(id.toString());
    loaded.idnum = id.toI32();
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.resolver = '0x0000000000000000000000000000000000000000';
    loaded.lastTransfer = id.toI32();
    loaded.pendingClaim = false;
    loaded.save();

    safeAddNuggToProtcol();

    return loaded;
}
// "nuggft": "0x5d5f16B48af3fB4f6acbCf3087699d99bd902A40",

export function safeLoadUserFromString(userId: string): User {
    let id = '' + userId;
    let loaded = User.load(id);
    if (loaded == null) panicFatal('User CANNOT BE NULL:' + id);
    return loaded as User;
}

export function safeLoadUser(userId: Address): User {
    let id = '' + userId.toHexString();
    let loaded = User.load(id);
    if (loaded == null) panicFatal('safeLoadUser: User CANNOT BE NULL:' + id);
    return loaded as User;
}

export function safeNewUser(userId: Address): User {
    let id = '' + userId.toHexString();
    // 0xf0dcdec50135504e000000000000000000000040
    let loaded = new User(id);
    safeAddUserToProtcol();
    return loaded;
}

export function safeLoadUserNull(userId: Address): User {
    let id = '' + userId.toHexString();
    let loaded = User.load(id);

    if (loaded == null) {
        loaded = safeNewUser(userId);
        loaded.shares = BigInt.fromString('0');
        loaded.save();
    }
    return loaded;
}

export function safeLoadItem(id: BigInt): Item {
    let loaded = Item.load(id.toString());
    if (loaded === null) {
        panicFatal('safeLoadItem: Item CANNOT BE NULL:' + id.toString());
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

export function safeSetUpcomingItemActiveSwap(item: Item, itemswap: ItemSwap): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.upcomingActiveSwap = itemswap.id;
    item.protocol = '0x42069';
    item.save();
}

export function unsafeIncrementItemActiveSwap(_item: string): void {
    let item = safeLoadItem(BigInt.fromString(_item));
    item.activeSwap = item.upcomingActiveSwap;
    item.upcomingActiveSwap = null;
    if (item.activeSwap === null) {
        item.protocol = null;
    } else {
        item.protocol = '0x42069';
    }
    item.save();
}

// export function unsafeSetItemActiveSwap(item: string, itemswap: ItemSwap): void {
//     let _item = safeLoadItem(BigInt.fromString(item));
//     _item.activeSwap = itemswap.id;
//     _item.protocol = '0x42069';
//     _item.save();
// }

export function safeRemoveItemActiveSwap(item: Item): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.activeSwap = null;
    item.protocol = null;
    item.save();
}
export function safeRemoveNuggItemActiveSwap(nuggitem: NuggItem): void {
    // let acitveswap = nuggitem.activeSwap;
    nuggitem.activeSwap = null;
    nuggitem.protocol = null;
    nuggitem.save();
}
export function unsafeLoadNuggItem(id: string): NuggItem {
    let loaded = NuggItem.load('' + id);
    if (loaded == null) panicFatal('NuggItem CANNOT BE NULL:' + id);
    return loaded as NuggItem;
}

export function unsafeLoadItem(id: string): Item {
    let loaded = Item.load('' + id);
    if (loaded == null) panicFatal('Item CANNOT BE NULL:' + id);
    return loaded as Item;
}

export function safeLoadNuggItemHelper(nugg: Nugg, item: Item): NuggItem {
    let id = item.id + '-' + nugg.id;
    let loaded = NuggItem.load(id);
    if (loaded == null) {
        panicFatal('NuggItem CANNOT BE NULL:' + id);
    }
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelperNull(nugg: Nugg, item: Item): NuggItem | null {
    let id = item.id + '-' + nugg.id;
    let loaded = NuggItem.load(id);

    return loaded;
}

export function safeNewNuggItem(nugg: Nugg, item: Item): NuggItem {
    let id = item.id + '-' + nugg.id;
    let loaded = new NuggItem(id);
    loaded.numSwaps = BigInt.fromString('0');
    return loaded;
}
export function safeLoadActiveSwap(nugg: Nugg): Swap {
    log.info(' safeLoadActiveSwap IN [NuggId:{}]', [nugg.id]);
    if (nugg.activeSwap == null) panicFatal('safeLoadActiveSwap: NUGG.activeSwap CANNOT BE NULL,');
    let id = nugg.activeSwap as string;
    let loaded = Swap.load(nugg.activeSwap as string);
    if (loaded == null) panicFatal('Swap CANNOT BE NULL:' + id);
    log.info(' safeLoadActiveSwap OUT [NuggId:{}]', [nugg.id]);

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
    nugg.numSwaps = nugg.numSwaps.plus(bigi(1));
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
//     if (loaded == null) panicFatal('Swap CANNOT BE NULL:' + id);
//     return loaded as Swap;
// }

export function unsafeLoadSwap(id: string): Swap {
    // let id = '' + tokenId.toString() + '-' + endingEpoch.toString();
    let loaded = Swap.load(id);
    if (loaded == null) panicFatal('Swap CANNOT BE NULL:' + id);
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
    if (nugg.activeLoan == null) panicFatal('nugg.activeLoan CANNOT BE NULL:' + nugg.id);
    let id = nugg.activeLoan as string;
    let loaded = Loan.load(id);
    if (loaded == null) panicFatal('Loan CANNOT BE NULL:' + id);
    return loaded as Loan;
}

export function safeLoadActiveNuggItemSwap(nuggItem: NuggItem): ItemSwap {
    if (nuggItem.activeSwap == '')
        panicFatal('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    let id = nuggItem.activeSwap as string;
    let loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal('safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:' + id);
    return loaded as ItemSwap;
}

export function safeLoadActiveItemSwap(item: Item): ItemSwap {
    if (item.activeSwap == '')
        panicFatal('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    let id = item.activeSwap as string;
    let loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal('safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:' + id);
    return loaded as ItemSwap;
}
export function unsafeLoadItemSwap(id: string): ItemSwap {
    let loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal('ItemSwap CANNOT BE NULL:' + id);
    return loaded as ItemSwap;
}

// export function safeLoadItemSwapHelper(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap {
//     let header = '';
//     let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
//     let loaded = ItemSwap.load(id);
//     if (loaded == null) panicFatal('ItemSwap CANNOT BE NULL:' + id);
//     return loaded as ItemSwap;
// }

// export function safeLoadItemSwapHelperNull(sellingNuggItem: NuggItem, endingEpoch: BigInt): ItemSwap | null {
//     let header = '';
//     let id = header.concat(sellingNuggItem.id).concat('-').concat(endingEpoch.toString());
//     return ItemSwap.load(id);
// }

export function safeNewItemSwap(sellingNuggItem: NuggItem): ItemSwap {
    let currNum = sellingNuggItem.numSwaps;
    sellingNuggItem.numSwaps = sellingNuggItem.numSwaps.plus(bigi(1));
    sellingNuggItem.save();

    let id = sellingNuggItem.id + '-' + currNum.toString();

    safeAddItemSwapToProtcol();
    let swap = new ItemSwap(id);
    swap.num = sellingNuggItem.numSwaps;
    // swap.endingEpoch = endingEpoch;
    sellingNuggItem.activeSwap = swap.id;
    sellingNuggItem.save();
    swap.save();
    return swap;
}
export function safeSetUserActiveSwap(user: User, nugg: Nugg, swap: Swap): void {
    // require user && swap
    if (user == null) {
        panicFatal('safeSetUserActiveSwap: user CANNOT BE NULL,');
    }

    if (nugg == null) {
        panicFatal('safeSetUserActiveSwap: nugg CANNOT BE NULL,');
    }

    if (swap == null) {
        panicFatal('safeSetUserActiveSwap: swap CANNOT BE NULL,');
    }
    let id = user.id + '-' + nugg.id;
    let loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        loaded = new UserActiveSwap(id);
        loaded.activeId = swap.id;
        loaded.save();
    } else {
        if (loaded.activeId != swap.id) {
            panicFatal(
                'safeSetUserActiveSwap: new useractiveswap trying to be set when old still exists',
            );
        }
    }
}

export function safeGetAndDeleteUserActiveSwap(user: User, nugg: Nugg): Swap {
    // require user && nugg

    if (user == null) {
        panicFatal('safeGetAndDeleteUserActiveSwap: user CANNOT BE NULL,');
    }

    if (nugg == null) {
        panicFatal('safeGetAndDeleteUserActiveSwap: nugg CANNOT BE NULL,');
    }

    let id = user.id + '-' + nugg.id;
    let loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        panicFatal('safeGetAndDeleteUserActiveSwap: UserActiveSwap CANNOT BE NULL: id:' + id);
    }
    let swap = Swap.load((loaded as UserActiveSwap).activeId);

    if (swap == null) {
        panicFatal('safeGetAndDeleteUserActiveSwap: swap CANNOT BE NULL,');
    }

    store.remove('UserActiveSwap', id);

    return swap as Swap;
}
//////////////////////////////////
export function safeSetNuggActiveItemSwap(nugg: Nugg, nuggItem: NuggItem, swap: ItemSwap): void {
    // require nugg && swap
    if (nugg == null) {
        panicFatal('safeSetNuggActiveItemSwap: nugg CANNOT BE NULL,');
    }

    if (nuggItem == null) {
        panicFatal('safeSetNuggActiveItemSwap: nuggItem CANNOT BE NULL,');
    }

    if (swap == null) {
        panicFatal('safeSetNuggActiveItemSwap: swap CANNOT BE NULL,');
    }
    let id = nugg.id + '-' + nuggItem.id;

    let loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        loaded = new NuggActiveItemSwap(id);
        loaded.activeId = swap.id;
        loaded.save();
    } else {
        if (loaded.activeId != swap.id) {
            panicFatal(
                'safeSetNuggActiveItemSwap: new nuggactiveswap trying to be set when old still exists',
            );
        }
    }
}

export function safeGetAndDeleteNuggActiveItemSwap(nugg: Nugg, nuggItem: NuggItem): ItemSwap {
    // require nugg && nuggItem

    if (nugg == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: nugg CANNOT BE NULL,');
    }

    if (nuggItem == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: nuggItem CANNOT BE NULL,');
    }

    let id = nugg.id + '-' + nuggItem.id;
    let loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: NuggActiveItemSwap CANNOT BE NULL,');
    }
    let swap = ItemSwap.load((loaded as NuggActiveItemSwap).activeId);

    if (swap == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: swap CANNOT BE NULL,');
    }

    store.remove('NuggActiveItemSwap', id);

    return swap as ItemSwap;
}

export function safeLoadOfferHelperNull(swap: Swap, user: User, hash: string): Offer {
    let loaded = Offer.load('' + swap.id + '-' + user.id);
    if (loaded == null) {
        loaded = safeNewOfferHelper(swap, user);
        loaded.claimed = false;
        loaded.eth = BigInt.fromString('0');
        loaded.ethUsd = BigInt.fromString('0');
        loaded.owner = false;
        loaded.user = user.id;
        loaded.swap = swap.id;
        loaded.claimer = user.id;
        loaded.txhash = hash;
        loaded.save();
    }
    return loaded;
}

export function safeNewOfferHelper(swap: Swap, user: User): Offer {
    let loaded = new Offer('' + swap.id + '-' + user.id);
    return loaded;
}

export function safeLoadOfferHelper(swap: Swap, user: User): Offer {
    let id = '' + swap.id + '-' + user.id;
    let loaded = Offer.load(id);
    if (loaded == null) panicFatal('Offer CANNOT BE NULL:' + id);
    return loaded as Offer;
}

// export function safeLoadItemOffer(id: string): ItemOffer {
//     let header = '';

//     let loaded = ItemOffer.load(header + id);
//     if (loaded == null) panicFatal('ItemOffer CANNOT BE NULL:' + id);
//     return loaded as ItemOffeFr;
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
    if (loaded == null) panicFatal('ItemOffer CANNOT BE NULL:' + id);
    return loaded as ItemOffer;
}
