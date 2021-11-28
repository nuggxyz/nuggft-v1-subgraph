import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis, PopItem__Params } from '../../generated/local/NuggFT/NuggFT';
import { handlePopItem } from '../../mappings/nuggft';
import { logStore } from 'matchstick-as/assembly/store';
import { PopItem } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { handlePreMintDummy1 } from './PreMint.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function handleEvent(event: PopItem): void {
    handlePopItem(event);
}
// const help: { [key in keyof PopItem__Params]: PopItem__Params[key] };
export function createEvent(tokenId: BigInt, itemId: BigInt): PopItem {
    let event = changetype<PopItem>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('itemId', ethereum.Value.fromUnsignedBigInt(itemId)),
    ];

    return event;
}
test('PopItem 0', () => {
    runGenesisxNugg();
    handlePreMintDummy1();

    handleEvent(createEvent(BigInt.fromString('3'), BigInt.fromString('11')));

    handleEvent(createEvent(BigInt.fromString('3'), BigInt.fromString('5')));

    assert.fieldEquals('Nugg', '3', 'id', '3');
    assert.fieldEquals('Item', '5', 'id', '5');
    assert.notInStore('NuggItem', '3-5');
    assert.fieldEquals('NuggItem', '3-11', 'id', '3-11');

    assert.fieldEquals('Item', '5', 'count', '1');
    assert.fieldEquals('Item', '11', 'count', '2');

    assert.fieldEquals('NuggItem', '3-11', 'count', '1');

    clearStore();
});

export { handlePopItem };
