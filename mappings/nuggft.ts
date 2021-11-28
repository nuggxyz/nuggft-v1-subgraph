import { log } from '@graphprotocol/graph-ts';
import { Item, Nugg, Protocol, User, NuggItem, Offer, Swap } from '../generated/local/schema';
import { BigInt } from '@graphprotocol/graph-ts';
import { PreMint, PopItem, PushItem, Genesis } from '../generated/local/NuggFT/NuggFT';
import { Transfer } from '../generated/local/NuggFT/NuggFT';
import { store } from '@graphprotocol/graph-ts';
import { invariant } from './uniswap';
import { safeNewNugg } from './safeload';
import { initEpochs } from './epoch';
import {
    safeNewUser,
    safeLoadNugg,
    safeLoadUserNull,
    safeLoadItem,
    safeLoadNuggItemHelper,
    safeLoadProtocol,
    safeLoadNuggItemHelperNull,
    safeNewNuggItem,
    safeNewItem,
    safeLoadItemNull,
} from './safeload';

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesis start', []);

    initEpochs(event.block, event.block.number, BigInt.fromString('25'));

    let proto = safeLoadProtocol('0x42069');

    let nuggft = safeNewUser(event.address);

    nuggft.xnugg = BigInt.fromString('0');
    nuggft.ethin = BigInt.fromString('0');
    nuggft.ethout = BigInt.fromString('0');
    nuggft.nuggs = [];
    nuggft.offers = [];
    nuggft.save();

    proto.nuggftUser = nuggft.id;

    proto.save();

    log.info('handleGenesis end', []);
}

export function handlePreMint(event: PreMint): void {
    log.info('handlePreMint start', []);

    let proto = safeLoadProtocol('0x42069');

    let nugg = safeNewNugg(event.params.tokenId);
    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];

    for (let i = 0; i < event.params.items.length; i++) {
        let item = safeLoadItemNull(event.params.items[i]);
        if (item == null) {
            item = safeNewItem(event.params.items[i]);
            item.count = BigInt.fromString('0');
        }
        let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

        if (nuggItem == null) {
            nuggItem = safeNewNuggItem(nugg, item);
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

    let nugg = safeLoadNugg(event.params.tokenId);

    let user = safeLoadUserNull(event.params.to);

    if (user == null) {
        user = safeNewUser(event.params.to);
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

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItemNull(event.params.itemId);

    if (item == null) {
        item = safeNewItem(event.params.itemId);
        item.count = BigInt.fromString('1');
        item.save();
    }

    let nuggItem = safeLoadNuggItemHelperNull(nugg, item);

    if (nuggItem == null) {
        nuggItem = safeNewNuggItem(nugg, item);
        nuggItem.count = BigInt.fromString('0');
        nuggItem.swaps = [];
    }

    nuggItem.count = nuggItem.count.plus(BigInt.fromString('1'));

    nuggItem.save();
}

export function handlePopItem(event: PopItem): void {
    log.info('handlePopItem start', []);

    let nugg = safeLoadNugg(event.params.tokenId);

    let item = safeLoadItem(event.params.itemId);

    let nuggItem = safeLoadNuggItemHelper(nugg, item);

    nuggItem.count = nuggItem.count.minus(BigInt.fromString('1'));

    if (nuggItem.count == BigInt.fromString('0')) {
        store.remove('NuggItem', nuggItem.id);
    } else {
        nuggItem.save();
    }

    log.info('handlePopItem end', []);
}
