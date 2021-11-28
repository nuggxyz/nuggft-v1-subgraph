import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from './../../generated/local/schema';
import { Genesis, PreMint__Params } from './../../generated/local/NuggFT/NuggFT';
import { handlePreMint } from './../../mappings/nuggft';
import { logStore } from 'matchstick-as/assembly/store';
import { PreMint } from './../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function handlePreMintDummy1(): void {
    handleEvent(createEvent(BigInt.fromString('3'), [BigInt.fromString('5'), BigInt.fromString('11'), BigInt.fromString('11')]));
}

export function handleEvent(event: PreMint): void {
    handlePreMint(event);
}
// const help: { [key in keyof PreMint__Params]: PreMint__Params[key] };
export function createEvent(tokenId: BigInt, items: BigInt[]): PreMint {
    let event = changetype<PreMint>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('items', ethereum.Value.fromUnsignedBigIntArray(items)),
    ];

    return event;
}
test('PreMint 0', () => {
    runGenesisxNugg();

    handlePreMintDummy1();

    assert.fieldEquals('Nugg', '3', 'id', '3');
    assert.fieldEquals('Item', '5', 'id', '5');
    assert.fieldEquals('NuggItem', '3-5', 'id', '3-5');
    assert.fieldEquals('NuggItem', '3-11', 'id', '3-11');

    assert.fieldEquals('Item', '5', 'count', '1');
    assert.fieldEquals('NuggItem', '3-5', 'count', '1');
    assert.fieldEquals('NuggItem', '3-11', 'count', '2');

    clearStore();
});

export { handlePreMint };
