import { Address, store, log, BigInt, ethereum } from '@graphprotocol/graph-ts';

import {
    Epoch,
    Nugg,
    NuggItem,
    Protocol,
    Swap,
    Loan,
    NuggSnapshot,
    Item,
    ItemSnapshot,
    User,
    ItemSwap,
    UserActiveSwap,
    NuggActiveItemSwap,
    Offer,
    ItemOffer,
} from '../generated/schema';

import { bigi, difference, panicFatal } from './utils';

export function safeLoadActiveEpoch(): Epoch {
    const loaded = safeLoadProtocol();

    if (loaded.epoch == null) panicFatal('safeLoadActiveEpoch: Protocol.epoch CANNOT BE NULL:');

    const epoch = Epoch.load(loaded.epoch);

    if (epoch == null)
        panicFatal(`safeLoadActiveEpoch: ACTIVE EPOCH CANNOT BE NULL: ${loaded.epoch}`);

    return epoch as Epoch;
}

export function safeLoadEpoch(id: BigInt): Epoch {
    log.info('safeLoadEpoch IN [id:{}]', [id.toString()]);

    const epoch = Epoch.load(id.toString());

    if (epoch == null) panicFatal(`safeLoadEpoch: EPOCH CANNOT BE NULL: ${id.toString()}`);

    log.info('safeLoadEpoch OUT [epoch:id:{}]', [(epoch as Epoch).id]);

    return epoch as Epoch;
}

export function safeRemoveNuggFromProtcol(nugg: Nugg, block: ethereum.Block): void {
    const proto = safeLoadProtocol();
    proto.totalNuggs = proto.totalNuggs.minus(bigi(1));
    proto.totalSwaps = proto.totalSwaps.minus(bigi(1));
    const tmpFeatureTotals = proto.featureTotals;

    const itm = nugg._items;

    for (let abc = 0; abc < itm.length; abc++) {
        const item = safeLoadItem(bigi(itm[abc]));

        const feature = bigi(item.idnum).div(bigi(1000)).toI32();
        tmpFeatureTotals[feature]--;

        item.count = item.count.minus(bigi(1));

        item.updatedAt = block.number;
        item.save(); // OK

        store.remove('NuggItem', `${itm[abc]}-${nugg.id}`);
    }

    proto.featureTotals = tmpFeatureTotals;

    proto.totalItems = proto.totalItems.minus(bigi(itm.length));
    proto.updatedAt = block.number;
    proto.save(); // OK

    store.remove('Nugg', nugg.id);
    store.remove('NuggSnapshot', `${nugg.id}-0`);
    store.remove('Swap', `${nugg.id}-0`);
}
export function safeRemoveNuggItemFromProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalItems = loaded.totalItems.minus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}

export function safeNewEpoch(id: BigInt): Epoch {
    const epoch = new Epoch(id.toString());
    epoch.idnum = id;
    return epoch;
}
export function safeAddNuggToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalNuggs = loaded.totalNuggs.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}

export function safeAddUserToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalUsers = loaded.totalUsers.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}
export function safeAddSwapToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalSwaps = loaded.totalSwaps.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}

export function safeAddLoanToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalLoans = loaded.totalLoans.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}
export function safeAddItemToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalItems = loaded.totalItems.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}

export function safeAddItemSwapToProtcol(block: ethereum.Block): void {
    const loaded = safeLoadProtocol();
    loaded.totalItemSwaps = loaded.totalItemSwaps.plus(bigi(1));
    loaded.updatedAt = block.number;
    loaded.save(); // OK
}

export function safeLoadProtocol(): Protocol {
    const loaded = Protocol.load('0x42069');
    if (loaded == null) panicFatal('safeLoadProtocol: Protocol CANNOT BE NULL:');
    return loaded as Protocol;
}

export function safeLoadNugg(id: BigInt): Nugg {
    log.info('safeLoadNugg IN {}', [id.toString()]);
    const ids = id.toString();
    const loaded = Nugg.load(ids);
    if (loaded == null) {
        log.error('safeLoadNugg ERROR [loaded == null] - {}', [ids]);
        panicFatal(`safeLoadNugg: CRITICAL: Nugg CANNOT BE NULL:${ids}`);
    }
    log.info('safeLoadNugg OUT {}', [ids]);

    return loaded as Nugg;
}

export function safeLoadNuggNull(id: BigInt): Nugg | null {
    const ids = `${id.toString()}`;
    const loaded = Nugg.load(ids);
    return loaded;
}

export function safeSetNuggActiveSwap(nugg: Nugg, swap: Swap, block: ethereum.Block): Nugg {
    nugg.activeSwap = swap.id;
    nugg.protocol = '0x42069';
    nugg.lastPrice = swap.eth;
    nugg.updatedAt = block.number;
    nugg.save(); // OK
    return nugg;
}

export function safeSetNuggActiveLoan(nugg: Nugg, loan: Loan, block: ethereum.Block): void {
    nugg.activeLoan = loan.id;
    loan.protocol = '0x42069';
    nugg.updatedAt = block.number;
    nugg.save(); // OK

    loan.updatedAt = block.number;
    loan.save(); // OK
}

export function safeRemoveNuggActiveSwap(nugg: Nugg, block: ethereum.Block): Nugg {
    nugg.activeSwap = null;
    nugg.protocol = null;
    nugg.live = false;
    nugg.updatedAt = block.number;
    nugg.save(); // OK

    return nugg;
}

export function safeRemoveNuggActiveLoan(nugg: Nugg, block: ethereum.Block): void {
    nugg.activeLoan = null;
    nugg.protocol = null;
    nugg.updatedAt = block.number;
    nugg.save(); // OK
}

export function safeNewActiveNuggSnapshot(
    nugg: Nugg,
    userId: string,
    blocknum: BigInt,
): NuggSnapshot | null {
    log.info('safeNewActiveNuggSnapshot IN [Nugg:{},userId:{},blocknum:{}]', [
        nugg.id,
        userId,
        blocknum.toString(),
    ]);

    let curr: NuggSnapshot | null = null;

    if (nugg.activeSnapshot !== null) {
        curr = NuggSnapshot.load(nugg.activeSnapshot as string);
    }

    let num = 0;
    if (curr !== null) {
        num = curr.snapshotNum + 1;
        // let missmatch = false;

        const __displayed = nugg._displayed;

        const diff = difference(__displayed, curr._displayed);

        if (diff.length === 0 && __displayed.length === curr._displayed.length) return null;

        // if (curr._displayed.length !== _displayed.length) missmatch = true;

        // for (let a = 0; a < _displayed.length && !missmatch; a++) {
        //     let ok = false;
        //     for (let b = 0; b < _displayed.length; b++) {
        //         if (_displayed[a] === curr._displayed[b]) ok = true;
        //     }
        //     if (!ok) missmatch = true;
        // }

        // if (!missmatch)
    }

    const next = new NuggSnapshot(`${nugg.id}-${num.toString()}`);
    next.nugg = nugg.id;
    next.block = blocknum;
    next.user = userId;
    next._items = nugg._items;
    next._displayed = nugg._displayed;

    next.snapshotNum = num;
    next.proof = nugg.proof;
    next.chunkError = false;
    next.chunk = 'pending';
    next.updatedAt = blocknum;
    next.save(); // OK

    return next;
}

export function safeSetNewActiveItemSnapshot(
    item: Item,
    data: string,
    block: ethereum.Block,
): Item {
    const id = `${item.id}-0`;

    const next = new ItemSnapshot(id);

    next.item = item.id;
    next.chunkError = !!data.startsWith('ERROR');
    next.chunk = data;
    next.updatedAt = block.number;
    next.save(); // OK

    // let chunk = new DotnuggItemChunk(id + '-' + '0');

    // chunk.index = 0;

    // chunk.data = data;

    item.activeSnapshot = next.id;
    item.updatedAt = block.number;
    item.save(); // OK

    return item;
}

export function safeNewNuggNoCache(id: BigInt, userId: string, block: ethereum.Block): Nugg {
    const loaded = new Nugg(id.toString());
    loaded.idnum = id.toI32();
    loaded.burned = false;
    loaded.numSwaps = BigInt.fromString('0');
    loaded.user = userId;
    loaded.lastUser = userId;
    loaded.lastTransfer = id.toI32();
    loaded.pendingClaim = false;
    loaded.dotnuggRawCache = '';
    loaded._tmp = 0;
    loaded._items = [];
    loaded._displayed = [];
    loaded._pickups = [];

    loaded.live = false;
    loaded.updatedAt = block.number;
    loaded.save(); // OK

    safeAddNuggToProtcol(block);

    return loaded;
}
// "nuggft": "0x5d5f16B48af3fB4f6acbCf3087699d99bd902A40",

export function safeLoadUserFromString(userId: string): User {
    const id = `${userId}`;
    const loaded = User.load(id);
    if (loaded == null) panicFatal(`User CANNOT BE NULL:${id}`);
    return loaded as User;
}

export function safeLoadUser(userId: Address): User {
    const id = `${userId.toHexString()}`;
    const loaded = User.load(id);
    if (loaded == null) panicFatal(`safeLoadUser: User CANNOT BE NULL:${id}`);
    return loaded as User;
}

export function safeNewUser(userId: Address, block: ethereum.Block): User {
    const id = `${userId.toHexString()}`;
    // 0xf0dcdec50135504e000000000000000000000040
    const loaded = new User(id);
    safeAddUserToProtcol(block);
    return loaded;
}

export function safeLoadUserNull(userId: Address, block: ethereum.Block): User {
    const id = `${userId.toHexString()}`;
    let loaded = User.load(id);

    if (loaded == null) {
        loaded = safeNewUser(userId, block);
        loaded.shares = BigInt.fromString('0');
        loaded.updatedAt = block.number;
        loaded.save(); // OK
    }
    return loaded;
}

export function safeLoadItem(id: BigInt): Item {
    const loaded = Item.load(id.toString());
    if (loaded === null) {
        panicFatal(`safeLoadItem: Item CANNOT BE NULL:${id.toString()}`);
    }
    return loaded as Item;
}

export function safeLoadItemNull(id: BigInt): Item | null {
    const loaded = Item.load(`${id.toString()}`);
    return loaded;
}

export function safeNewItem(id: BigInt, block: ethereum.Block): Item {
    const loaded = new Item(`${id.toString()}`);
    loaded.live = false;
    safeAddItemToProtcol(block);
    return loaded as Item;
}

export function safeSetNuggItemActiveSwap(
    nuggitem: NuggItem,
    itemswap: ItemSwap,
    block: ethereum.Block,
): void {
    nuggitem.activeSwap = itemswap.id;
    nuggitem.protocol = '0x42069';
    nuggitem.updatedAt = block.number;
    nuggitem.save(); // OK
}

export function safeSetItemActiveSwap(item: Item, itemswap: ItemSwap, block: ethereum.Block): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.activeSwap = itemswap.id;
    item.protocol = '0x42069';
    item.live = true;
    item.updatedAt = block.number;
    item.save(); // OK
}

export function safeRemoveItemActiveSwap(item: Item, block: ethereum.Block): void {
    // let _item = safeLoadItem(BigInt.fromString(item));
    item.activeSwap = null;
    item.protocol = null;
    item.live = false;
    item.updatedAt = block.number;
    item.save(); // OK
}
export function safeRemoveNuggItemActiveSwap(nuggitem: NuggItem, block: ethereum.Block): void {
    // let acitveswap = nuggitem.activeSwap;
    nuggitem.activeSwap = null;
    nuggitem.protocol = null;
    nuggitem.updatedAt = block.number;
    nuggitem.save(); // OK
}
export function unsafeLoadNuggItem(id: string): NuggItem {
    const loaded = NuggItem.load(`${id}`);
    if (loaded == null) panicFatal(`NuggItem CANNOT BE NULL:${id}`);
    return loaded as NuggItem;
}

export function unsafeLoadItem(id: string): Item {
    const loaded = Item.load(`${id}`);
    if (loaded == null) panicFatal(`Item CANNOT BE NULL:${id}`);
    return loaded as Item;
}

export function safeLoadNuggItemHelper(nugg: Nugg, item: Item): NuggItem {
    const id = `${item.id}-${nugg.id}`;
    const loaded = NuggItem.load(id);
    if (loaded == null) {
        panicFatal(`NuggItem CANNOT BE NULL:${id}`);
    }
    return loaded as NuggItem;
}

export function safeLoadNuggItemHelperNull(nugg: Nugg, item: Item): NuggItem | null {
    const id = `${item.id}-${nugg.id}`;
    const loaded = NuggItem.load(id);

    return loaded;
}

export function safeNewNuggItem(nugg: Nugg, item: Item): NuggItem {
    const id = `${item.id}-${nugg.id}`;
    const loaded = new NuggItem(id);
    loaded.numSwaps = BigInt.fromString('0');
    return loaded;
}
export function safeLoadActiveSwap(nugg: Nugg): Swap {
    log.info(' safeLoadActiveSwap IN [NuggId:{}]', [nugg.id]);
    if (nugg.activeSwap == null) panicFatal('safeLoadActiveSwap: NUGG.activeSwap CANNOT BE NULL,');
    const id = nugg.activeSwap as string;
    const loaded = Swap.load(nugg.activeSwap as string);
    if (loaded == null) panicFatal(`Swap CANNOT BE NULL:${id}`);
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

export function safeNewSwapHelper(nugg: Nugg, block: ethereum.Block): Swap {
    const currNum = nugg.numSwaps;
    nugg.numSwaps = nugg.numSwaps.plus(bigi(1));
    nugg.updatedAt = block.number;
    nugg.save(); // OK

    const id = `${nugg.id}-${currNum.toString()}`;
    const swap = new Swap(id);
    // swap.endingEpocerthgh = endingEpoch;
    swap.num = currNum;

    safeAddSwapToProtcol(block);
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
    const loaded = Swap.load(id);
    if (loaded == null) panicFatal(`Swap CANNOT BE NULL:${id}`);
    return loaded as Swap;
}

// export function safeLoadSwapHelper(nuggId: string, itemId: BigInt): NuggItem {
//     let id = nuggId.concat('-').concat(itemId.toString());
//     return safeLoadNuggItem(id);
// }

export function safeNewLoanHelper(block: ethereum.Block): Loan {
    const loaded = safeLoadProtocol();
    const id = loaded.totalLoans.toString();
    const loan = new Loan(id);
    safeAddLoanToProtcol(block);
    return loan as Loan;
}

export function safeLoadLoanHelper(nugg: Nugg): Loan {
    if (nugg.activeLoan == null) panicFatal(`nugg.activeLoan CANNOT BE NULL:${nugg.id}`);
    const id = nugg.activeLoan as string;
    const loaded = Loan.load(id);
    if (loaded == null) panicFatal(`Loan CANNOT BE NULL:${id}`);
    return loaded as Loan;
}

export function safeLoadActiveNuggItemSwap(nuggItem: NuggItem): ItemSwap {
    if (nuggItem.activeSwap == '' || nuggItem.activeSwap == null)
        panicFatal('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    const id = nuggItem.activeSwap as string;
    const loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal(`safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:${id}`);
    return loaded as ItemSwap;
}

export function safeLoadActiveItemSwap(item: Item): ItemSwap {
    if (item.activeSwap == '')
        panicFatal('handleOfferOfferItem: NUGGITEM.activeSwap CANNOT BE NULL');

    const id = item.activeSwap as string;
    const loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal(`safeLoadActiveItemSwap ItemSwap CANNOT BE NULL:${id}`);
    return loaded as ItemSwap;
}
export function unsafeLoadItemSwap(id: string): ItemSwap {
    const loaded = ItemSwap.load(id);
    if (loaded == null) panicFatal(`ItemSwap CANNOT BE NULL:${id}`);
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

export function safeNewItemSwap(sellingNuggItem: NuggItem, block: ethereum.Block): ItemSwap {
    const currNum = sellingNuggItem.numSwaps;
    sellingNuggItem.numSwaps = sellingNuggItem.numSwaps.plus(bigi(1));
    sellingNuggItem.updatedAt = block.number;
    sellingNuggItem.save(); // OK

    const id = `${sellingNuggItem.id}-${currNum.toString()}`;

    safeAddItemSwapToProtcol(block);
    const swap = new ItemSwap(id);
    swap.num = sellingNuggItem.numSwaps;
    swap.numOffers = 0;

    // swap.endingEpoch = endingEpoch;
    sellingNuggItem.activeSwap = swap.id;

    sellingNuggItem.save(); // OK
    return swap;
}
export function safeSetUserActiveSwap(
    user: User,
    nugg: Nugg,
    swap: Swap,
    block: ethereum.Block,
): void {
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
    const id = `${user.id}-${nugg.id}`;
    let loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        loaded = new UserActiveSwap(id);
        loaded.activeId = swap.id;
        loaded.updatedAt = block.number;
        loaded.save(); // OK
    } else if (loaded.activeId != swap.id) {
        panicFatal(
            'safeSetUserActiveSwap: new useractiveswap trying to be set when old still exists',
        );
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

    const id = `${user.id}-${nugg.id}`;
    const loaded = UserActiveSwap.load(id);
    if (loaded == null) {
        panicFatal(`safeGetAndDeleteUserActiveSwap: UserActiveSwap CANNOT BE NULL: id:${id}`);
    }
    const swap = Swap.load((loaded as UserActiveSwap).activeId);

    if (swap == null) {
        panicFatal('safeGetAndDeleteUserActiveSwap: swap CANNOT BE NULL,');
    }

    store.remove('UserActiveSwap', id);

    return swap as Swap;
}
/// ///////////////////////////////
export function safeSetNuggActiveItemSwap(
    nugg: Nugg,
    nuggItem: NuggItem,
    swap: ItemSwap,
    block: ethereum.Block,
): void {
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
    const id = `${nugg.id}-${nuggItem.id}`;

    let loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        loaded = new NuggActiveItemSwap(id);
        loaded.activeId = swap.id;
        loaded.updatedAt = block.number;
        loaded.save(); // OK
    } else if (loaded.activeId != swap.id) {
        // log.warning('I SHOULD HAVE FAILED, [id:{}] [swap.id:{}]', [id, swap.id]);
        panicFatal(
            'safeSetNuggActiveItemSwap: new nuggactiveswap trying to be set when old still exists',
        );
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

    const id = `${nugg.id}-${nuggItem.id}`;
    const loaded = NuggActiveItemSwap.load(id);
    if (loaded == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: NuggActiveItemSwap CANNOT BE NULL,');
    }
    const swap = ItemSwap.load((loaded as NuggActiveItemSwap).activeId);

    if (swap == null) {
        panicFatal('safeGetAndDeleteNuggActiveItemSwap: swap CANNOT BE NULL,');
    }

    store.remove('NuggActiveItemSwap', id);

    return swap as ItemSwap;
}

export function safeLoadOfferHelperNull(
    swap: Swap,
    user: User,
    hash: string,
    block: ethereum.Block,
): Offer {
    const proto = safeLoadProtocol();
    let loaded = Offer.load(`${swap.id}-${user.id}`);
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
        loaded.incrementX64 = bigi(0);
        loaded.epoch = proto.epoch;
        loaded.updatedAt = block.number;
        loaded.save(); // OK
    }
    return loaded;
}

export function safeNewOfferHelper(swap: Swap, user: User): Offer {
    const loaded = new Offer(`${swap.id}-${user.id}`);
    return loaded;
}

export function safeLoadOfferHelper(swap: Swap, user: User): Offer {
    const id = `${swap.id}-${user.id}`;
    const loaded = Offer.load(id);
    if (loaded == null) panicFatal(`Offer CANNOT BE NULL:${id}`);
    return loaded as Offer;
}

// export function safeLoadItemOffer(id: string): ItemOffer {
//     let header = '';

//     let loaded = ItemOffer.load(header + id);
//     if (loaded == null) panicFatal('ItemOffer CANNOT BE NULL:' + id);
//     return loaded as ItemOffeFr;
// }

export function safeNewItemOffer(swap: ItemSwap, nugg: Nugg): ItemOffer {
    const id = `${swap.id}-${nugg.id}`;
    return new ItemOffer(id);
}

export function safeLoadItemOfferHelperNull(swap: ItemSwap, nugg: Nugg): ItemOffer | null {
    const id = `${swap.id}-${nugg.id}`;
    return ItemOffer.load(id);
}

export function safeLoadItemOfferHelper(swap: ItemSwap, nugg: Nugg): ItemOffer {
    const id = `${swap.id}-${nugg.id}`;
    const loaded = ItemOffer.load(id);
    if (loaded == null) panicFatal(`ItemOffer CANNOT BE NULL:${id}`);
    return loaded as ItemOffer;
}
