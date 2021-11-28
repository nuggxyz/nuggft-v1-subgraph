import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Item, ItemOffer, ItemSwap, Nugg, NuggItem, Protocol, User } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleOfferItem } from '../../mappings/itemswap';
import { logStore } from 'matchstick-as/assembly/store';
import { OfferItem, OfferItem__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';
import { handlePreMintDummy1, handlePreMintDummy0, handlePreMintDummy2 } from '../nuggft/PreMint.test';
import { handleSwapItemDummy0 } from './ItemSwap.test';
import { handleCommitItemDummy0 } from './ItemCommit.test';
import { safeNewNugg } from '../../mappings/safeload';
import {
    safeNewUser,
    safeLoadNugg,
    safeLoadNuggItemHelper,
    safeLoadItem,
    safeLoadItemSwapHelper,
    safeLoadItemOfferHelper,
} from '../../mappings/safeload';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';

export function handleOfferItemDummy0(nuggItem: NuggItem, nugg: Nugg, eth: BigInt): void {
    handleEvent(createEvent(BigInt.fromString(nuggItem.nugg), BigInt.fromString(nuggItem.item), BigInt.fromString(nugg.id), eth));
}
export function handleEvent(event: OfferItem): void {
    handleOfferItem(event);
}
// const help: { [key in keyof OfferItem__Params]: OfferItem__Params[key] };

export function createEvent(sellingTokenId: BigInt, itemId: BigInt, buyingTokenId: BigInt, value: BigInt): OfferItem {
    let event = changetype<OfferItem>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('sellingTokenId', ethereum.Value.fromUnsignedBigInt(sellingTokenId)),
        new ethereum.EventParam('itemId', ethereum.Value.fromUnsignedBigInt(itemId)),
        new ethereum.EventParam('buyingTokenId', ethereum.Value.fromUnsignedBigInt(buyingTokenId)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(value)),
    ];
    event.transaction.value = value;

    return event;
}

test('OfferItem 0 - with value', () => {
    runGenesisxNugg();
    let user = safeNewUser(Address.fromString(address0));
    address0;
    user.xnugg = BigInt.fromString('0');
    user.ethin = BigInt.fromString('0');
    user.ethout = BigInt.fromString('0');
    user.nuggs = [];
    user.offers = [];
    user.save();

    let seller = safeNewNugg(BigInt.fromString('420'));
    seller.swaps = [];
    seller.items = [];
    seller.offers = [];
    seller.user = user.id;
    seller.save();

    let buyer = safeNewNugg(BigInt.fromString('69'));
    buyer.swaps = [];
    buyer.items = [];
    buyer.offers = [];
    buyer.user = user.id;
    buyer.save();

    let buyer2 = safeNewNugg(BigInt.fromString('69420'));
    buyer2.swaps = [];
    buyer2.items = [];
    buyer2.offers = [];
    buyer2.user = user.id;
    buyer2.save();

    let floor = '200';
    let buyamount = '500';
    let buyamount2 = '90000000';

    handlePreMintDummy2(seller, [BigInt.fromI32(11), BigInt.fromI32(12)]);
    let item11 = safeLoadItem(BigInt.fromString('11'));
    let item12 = safeLoadItem(BigInt.fromString('12'));

    let sellerItem11 = safeLoadNuggItemHelper(seller, item11);

    handleSwapItemDummy0(sellerItem11, BigInt.fromString(floor));

    handleCommitItemDummy0(sellerItem11, buyer, BigInt.fromString(buyamount));

    handleOfferItemDummy0(sellerItem11, buyer2, BigInt.fromString(buyamount2));

    let sellerItemSwap11 = safeLoadItemSwapHelper(sellerItem11, BigInt.fromString('1'));

    let buyerItemOffer11 = safeLoadItemOfferHelper(sellerItemSwap11, buyer2);

    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'id', sellerItemSwap11.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'leader', buyer2.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'owner', seller.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'eth', buyamount2);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'epoch', '1');

    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'id', buyerItemOffer11.id);
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'owner', 'false');
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'nugg', buyer2.id);
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'eth', buyamount2);
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'claimed', 'false');
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'swap', sellerItemSwap11.id);

    clearStore();
});

export { handleOfferItem };
