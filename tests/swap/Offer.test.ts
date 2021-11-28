import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleOffer } from '../../mappings/swap';
import { logStore } from 'matchstick-as/assembly/store';
import { Offer, Offer__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';
import { handlePreMintDummy1, handlePreMintDummy0 } from '../nuggft/PreMint.test';
import { handleMintDummy0 } from './Mint.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';

export function handleEvent(event: Offer): void {
    handleOffer(event);
}
// const help: { [key in keyof Offer__Params]: Offer__Params[key] };

export function createEvent(account: Address, tokenId: BigInt, value: BigInt): Offer {
    let event = changetype<Offer>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(value)),
    ];
    // help;
    event.transaction.value = value;

    return event;
}

test('Offer 0 - with value', () => {
    runGenesisxNugg();
    handlePreMintDummy0();
    handleMintDummy0();

    let offerId = '0-0-' + address0;

    assert.fieldEquals('Swap', '0-0', 'eth', '1000000');
    assert.notInStore('Offer', offerId);

    handleEvent(createEvent(Address.fromString(address0), BigInt.fromString('0'), BigInt.fromString('2000000')));

    assert.fieldEquals('Swap', '0-0', 'id', '0-0');
    assert.fieldEquals('Swap', '0-0', 'leader', address0);
    assert.fieldEquals('Swap', '0-0', 'owner', niladdress);
    assert.fieldEquals('Swap', '0-0', 'eth', '2000000');
    assert.fieldEquals('Swap', '0-0', 'ethUsd', '0');
    assert.fieldEquals('Swap', '0-0', 'epoch', '0');
    // assert.fieldEquals('Swap', '0-0', 'epochId', '0');

    assert.fieldEquals('Offer', offerId, 'id', offerId);
    assert.fieldEquals('Offer', offerId, 'owner', 'false');
    assert.fieldEquals('Offer', offerId, 'user', address0);
    assert.fieldEquals('Offer', offerId, 'eth', '2000000');
    assert.fieldEquals('Offer', offerId, 'ethUsd', '0');
    assert.fieldEquals('Offer', offerId, 'claimed', 'false');
    assert.fieldEquals('Offer', offerId, 'swap', '0-0');

    clearStore();
});

export { handleOffer };
