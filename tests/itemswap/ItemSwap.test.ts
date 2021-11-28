import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Nugg, User, Item, NuggItem, ItemSwap, ItemOffer } from '../../generated/local/schema';
import { handleSwapItem } from '../../mappings/itemswap';
import { SwapItem, SwapItem__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { handlePreMintDummy2 } from '../nuggft/PreMint.test';
import { safeLoadItem } from '../../mappings/safeload';
import { safeNewUser, safeNewNugg, safeLoadNuggItemHelper, safeLoadItemSwapHelper, safeLoadItemOfferHelper } from '../../mappings/safeload';

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
    log.info('here1', []);

    let user = safeNewUser(Address.fromString(address3));
    log.info('here1', []);

    user.xnugg = BigInt.fromString('0');
    user.ethin = BigInt.fromString('0');
    user.ethout = BigInt.fromString('0');
    user.nuggs = [];
    user.offers = [];
    user.save();

    let nugg = safeNewNugg(BigInt.fromString('420'));
    log.info('here1', []);

    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];
    nugg.user = user.id;
    nugg.save();

    let floor = '200';
    log.info('here1', []);

    handlePreMintDummy2(nugg, [BigInt.fromI32(11), BigInt.fromI32(12)]);
    log.info('here2', []);

    let item11 = safeLoadItem(BigInt.fromString('11'));
    let item12 = safeLoadItem(BigInt.fromString('12'));

    let nuggItem11 = safeLoadNuggItemHelper(nugg, item11);
    let nuggItem12 = safeLoadNuggItemHelper(nugg, item12);

    handleSwapItemDummy0(nuggItem11, BigInt.fromString(floor));

    let itemSwap11 = safeLoadItemSwapHelper(nuggItem11, BigInt.fromString('0'));

    let itemOffer11 = safeLoadItemOfferHelper(itemSwap11, nugg);

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
