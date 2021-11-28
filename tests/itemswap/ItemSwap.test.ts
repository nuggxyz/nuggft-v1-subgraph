import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Nugg, User, Item, NuggItem, ItemSwap, ItemOffer } from '../../generated/local/schema';
import { handleSwapItem } from '../../mappings/itemswap';
import { SwapItem, SwapItem__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { handlePreMintDummy2 } from '../nuggft/PreMint.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eabcdef';
let address3 = '0xa16081f360e3847006db660bae1c6d1b23333333';

export function handleSwapItemDummy0(nuggItem: NuggItem, floor: BigInt): void {
    handleEvent(createEvent(BigInt.fromString(nuggItem.nugg), BigInt.fromString(nuggItem.item), floor));
}

export function handleEvent(event: SwapItem): void {
    handleSwapItem(event);
}
// const help: { [key in keyof SwapItem__Params]: SwapItem__Params[key] };

export function createEvent(sellingTokenId: BigInt, itemId: BigInt, value: BigInt): SwapItem {
    let event = changetype<SwapItem>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('sellingTokenId', ethereum.Value.fromUnsignedBigInt(sellingTokenId)),
        new ethereum.EventParam('itemId', ethereum.Value.fromUnsignedBigInt(itemId)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(value)),
    ];
    // help;
    event.transaction.value = value;

    return event;
}

test('SwapItem 0 - no value', () => {
    runGenesisxNugg();
    // handlePreMintDummy0();

    let user = new User(address3);
    user.xnugg = BigInt.fromString('0');
    user.ethin = BigInt.fromString('0');
    user.ethout = BigInt.fromString('0');
    user.nuggs = [];
    user.offers = [];
    user.save();

    let nugg = new Nugg('420');
    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];
    nugg.user = user.id;
    nugg.save();

    let floor = '200';

    handlePreMintDummy2(nugg, [BigInt.fromI32(11), BigInt.fromI32(12)]);

    let item11 = Item.load('11') as Item;
    let item12 = Item.load('12') as Item;

    let nuggItem11 = NuggItem.load(nugg.id + '-' + item11.id) as NuggItem;
    let nuggItem12 = NuggItem.load(nugg.id + '-' + item12.id) as NuggItem;

    assert.fieldEquals('NuggItem', nuggItem11.id, 'count', '1');
    assert.fieldEquals('NuggItem', nuggItem12.id, 'count', '1');
    // assert.fieldEquals('NuggItem', nuggItem11.id, 'activeSwap', '');
    // assert.fieldEquals('NuggItem', nuggItem12.id, 'activeSwap', '');

    handleSwapItemDummy0(nuggItem11, BigInt.fromString(floor));

    assert.fieldEquals('NuggItem', nuggItem11.id, 'count', '0');
    assert.fieldEquals('NuggItem', nuggItem12.id, 'count', '1');

    let itemSwap11 = ItemSwap.load(nuggItem11.id + '-' + '0') as ItemSwap;

    let itemOffer11 = ItemOffer.load(itemSwap11.id + '-' + nugg.id) as ItemOffer;

    assert.notInStore('ItemSwap', nuggItem12.id + '-' + '0');

    assert.fieldEquals('NuggItem', nuggItem11.id, 'activeSwap', itemSwap11.id);

    assert.fieldEquals('ItemSwap', itemSwap11.id, 'id', itemSwap11.id);
    assert.fieldEquals('ItemSwap', itemSwap11.id, 'leader', nugg.id);
    assert.fieldEquals('ItemSwap', itemSwap11.id, 'owner', nugg.id);
    assert.fieldEquals('ItemSwap', itemSwap11.id, 'eth', floor);
    assert.fieldEquals('ItemSwap', itemSwap11.id, 'ethUsd', '0');
    // assert.fieldEquals('ItemSwap', itemSwap11.id, 'epoch', '');

    assert.fieldEquals('ItemOffer', itemOffer11.id, 'id', itemOffer11.id);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'owner', 'true');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'nugg', nugg.id);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'eth', floor);
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'ethUsd', '0');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'claimed', 'false');
    assert.fieldEquals('ItemOffer', itemOffer11.id, 'swap', itemSwap11.id);

    clearStore();
});

export { handleSwapItem };
