import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Epoch, Item, ItemOffer, ItemSwap, Nugg, NuggItem, Protocol, User } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleClaimItem } from '../../mappings/itemswap';
import { logStore } from 'matchstick-as/assembly/store';
import { ClaimItem, ClaimItem__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';
import { handlePreMintDummy1, handlePreMintDummy0, handlePreMintDummy2 } from '../nuggft/PreMint.test';
import { handleOfferItemDummy0 } from './ItemOffer.test';
import { handleCommitItemDummy0 } from './ItemCommit.test';
import { handleSwapItemDummy0 } from './ItemSwap.test';
// import { handleMintDummy0 } from './Mint.test';
// import { handleSwapDummy0 } from './ItemSwap.test';
import { safeNewUser } from '../../mappings/safeload';
import {
    safeLoadProtocol,
    safeLoadNuggItemHelper,
    safeLoadItem,
    safeNewNugg,
    safeLoadItemSwapHelper,
    safeLoadItemOfferHelper,
} from '../../mappings/safeload';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';
let address1 = '0xa16081f360e3847006db660bae1c6d1b2eabcdef';

export function handleClaimItemDummy0(nuggItem: NuggItem, nugg: Nugg, endingEpoch: BigInt): void {
    handleEvent(createEvent(BigInt.fromString(nuggItem.nugg), BigInt.fromString(nuggItem.item), BigInt.fromString(nugg.id), endingEpoch));
}

export function handleEvent(event: ClaimItem): void {
    handleClaimItem(event);
}
// const help: { [key in keyof ClaimItem__Params]: ClaimItem__Params[key] };

export function createEvent(sellingTokenId: BigInt, itemId: BigInt, buyingTokenId: BigInt, endingEpoch: BigInt): ClaimItem {
    let event = changetype<ClaimItem>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('sellingTokenId', ethereum.Value.fromUnsignedBigInt(sellingTokenId)),
        new ethereum.EventParam('itemId', ethereum.Value.fromUnsignedBigInt(itemId)),
        new ethereum.EventParam('buyingTokenId', ethereum.Value.fromUnsignedBigInt(buyingTokenId)),
        new ethereum.EventParam('endingEpoch', ethereum.Value.fromUnsignedBigInt(endingEpoch)),
    ];
    // help;
    // event.transaction.value = value;

    return event;
}

test('ClaimItem 1 - owner', () => {
    runGenesisxNugg();
    let user = safeNewUser(Address.fromString(address0));
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
    let endingEpoch = '1';

    handlePreMintDummy2(seller, [BigInt.fromI32(11), BigInt.fromI32(12)]);

    let item11 = safeLoadItem(BigInt.fromString('11'));
    let item12 = safeLoadItem(BigInt.fromString('12'));

    let sellerItem11 = safeLoadNuggItemHelper(seller, item11);
    let sellerItem12 = safeLoadNuggItemHelper(seller, item12);

    handleSwapItemDummy0(sellerItem11, BigInt.fromString(floor));

    let sellerItemSwap11_unused = safeLoadItemSwapHelper(sellerItem11, BigInt.fromString('0'));

    handleCommitItemDummy0(sellerItem11, buyer, BigInt.fromString(buyamount));

    let sellerItemSwap11 = safeLoadItemSwapHelper(sellerItem11, BigInt.fromString('1'));

    handleOfferItemDummy0(sellerItem11, buyer2, BigInt.fromString(buyamount2));

    let proto = safeLoadProtocol('0x42069');
    let epoch = new Epoch('1');
    epoch.save();

    proto.epoch = epoch.id;
    proto.save();

    handleClaimItemDummy0(sellerItem11, seller, BigInt.fromString(endingEpoch));

    let itemOffer11 = safeLoadItemOfferHelper(sellerItemSwap11, seller);

    // seller
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'id', itemOffer11.id);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'owner', 'true');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'nugg', seller.id);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'eth', floor);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'claimed', 'true');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'swap', sellerItemSwap11.id);

    assert.fieldEquals('NuggItem', sellerItem11.id, 'activeSwap', sellerItemSwap11.id);

    handleClaimItemDummy0(sellerItem11, buyer2, BigInt.fromString(endingEpoch));

    let buyer2ItemOffer11 = safeLoadItemOfferHelper(sellerItemSwap11, buyer2);

    assert.fieldEquals('NuggItem', sellerItem11.id, 'activeSwap', 'null');

    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'id', sellerItemSwap11.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'leader', buyer2.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'owner', seller.id);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'eth', buyamount2);
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemSwap', sellerItemSwap11.id, 'epoch', endingEpoch);

    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'id', buyer2ItemOffer11.id);
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'owner', 'false');
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'nugg', buyer2.id);
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'eth', buyamount2);
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'claimed', 'true');
    assert.fieldEquals('ItemOffer', buyer2ItemOffer11.id, 'swap', sellerItemSwap11.id);

    let buyerItemOffer11 = safeLoadItemOfferHelper(sellerItemSwap11, buyer);
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'claimed', 'false');
    handleClaimItemDummy0(sellerItem11, buyer, BigInt.fromString(endingEpoch));
    assert.fieldEquals('ItemOffer', buyerItemOffer11.id, 'claimed', 'true');

    clearStore();
});

export { handleClaimItem };
