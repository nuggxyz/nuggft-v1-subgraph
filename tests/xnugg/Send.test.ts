import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from './../../generated/local/schema';
import { Genesis, Send__Params } from './../../generated/local/xNUGG/xNUGG';
import { handleSend } from './../../mappings/xnugg';
import { logStore } from 'matchstick-as/assembly/store';
import { Send } from './../../generated/local/xNUGG/xNUGG';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from './Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function handleEvent(event: Send): void {
    handleSend(event);
}
// { [key in keyof Send__Params]: Send__Params[key] }
export function createEvent(eth: BigInt, receiver: Address): Send {
    let event = changetype<Send>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('receiver', ethereum.Value.fromAddress(receiver)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(eth)),
    ];

    return event;
}

test('Send 0', () => {
    runGenesisxNugg();

    let p = Protocol.load('0x42069') as Protocol;
    p.tvlEth = BigInt.fromString('1000000');
    p.save();

    handleEvent(createEvent(BigInt.fromString('300000'), Address.fromString(address0)));

    assert.fieldEquals('Protocol', '0x42069', 'id', '0x42069');
    assert.fieldEquals('Protocol', '0x42069', 'tvlEth', '700000');

    assert.fieldEquals('User', address0, 'id', address0);
    assert.fieldEquals('User', address0, 'ethout', '300000');

    clearStore();
});

export { handleSend };
