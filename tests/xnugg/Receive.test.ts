import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/schema';
import { Genesis, Receive__Params } from '../../generated/xNUGG/xNUGG';
import { handleReceive } from '../../archive/xnugg';
import { logStore } from 'matchstick-as/assembly/store';
import { Address, ethereum, BigInt } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from './Genesis.test';
import { Receive } from '../../generated/xNUGG/xNUGG';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function handleEvent(event: Receive): void {
    handleReceive(event);
}
// { [key in keyof Receive__Params]: Receive__Params[key] }
export function createEvent(eth: BigInt, receiver: Address): Receive {
    let event = changetype<Receive>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('receiver', ethereum.Value.fromAddress(receiver)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(eth)),
    ];

    return event;
}

test('Receive 0', () => {
    runGenesisxNugg();

    let p = Protocol.load('0x42069') as Protocol;
    p.tvlEth = BigInt.fromString('1000000');
    p.save();

    handleEvent(createEvent(BigInt.fromString('300000'), Address.fromString(address0)));

    assert.fieldEquals('Protocol', '0x42069', 'id', '0x42069');
    assert.fieldEquals('Protocol', '0x42069', 'tvlEth', '1300000');

    assert.fieldEquals('User', address0, 'id', address0);
    assert.fieldEquals('User', address0, 'ethin', '300000');
    assert.fieldEquals('User', address0, 'ethout', '0');

    clearStore();
});

export { handleReceive };
