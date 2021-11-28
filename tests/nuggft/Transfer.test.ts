import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/NuggFT/NuggFT';
import { handleTransfer } from '../../mappings/nuggft';
import { logStore } from 'matchstick-as/assembly/store';
import { Transfer } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { handlePreMintDummy1 } from './PreMint.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';

export function createEvent(tokenId: string, from: string, to: string): Transfer {
    let event = changetype<Transfer>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('from', ethereum.Value.fromAddress(Address.fromString(from))),
        new ethereum.EventParam('to', ethereum.Value.fromAddress(Address.fromString(to))),
        new ethereum.EventParam('tokenid', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(tokenId))),
    ];

    return event;
}

test('Transfer 0', () => {
    runGenesisxNugg();
    handlePreMintDummy1();

    let event = createEvent('3', niladdress, address0);

    handleTransfer(event);

    assert.fieldEquals('Nugg', '3', 'user', address0);

    assert.fieldEquals('User', address0, 'id', address0);
    assert.fieldEquals('User', address0, 'xnugg', '0');
    clearStore();
});

export { handleTransfer };
