import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleTransfer } from '../../archive/xnugg';
import { logStore } from 'matchstick-as/assembly/store';
import { Transfer } from '../../generated/local/xNUGG/xNUGG';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from './Genesis.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function createEvent(from: string, to: string, amount: string): Transfer {
    let event = changetype<Transfer>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('from', ethereum.Value.fromAddress(Address.fromString(from))),
        new ethereum.EventParam('to', ethereum.Value.fromAddress(Address.fromString(to))),
        new ethereum.EventParam('amount', ethereum.Value.fromUnsignedBigInt(BigInt.fromString(amount))),
    ];

    return event;
}

test('Transfer 0', () => {
    runGenesisxNugg();

    let event = createEvent(niladdress, address0, '42');

    handleTransfer(event);

    assert.fieldEquals('User', niladdress, 'id', niladdress);
    assert.fieldEquals('User', niladdress, 'xnugg', '0');

    assert.fieldEquals('User', address0, 'id', address0);
    assert.fieldEquals('User', address0, 'xnugg', '42');
    clearStore();
});

export { handleTransfer };
