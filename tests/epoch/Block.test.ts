import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { logStore } from 'matchstick-as/assembly/store';
import { ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { safeLoadProtocol } from '../../mappings/safeload';
import { handleBlock__every } from '../../mappings/epoch';

export function createBlock(num: string): ethereum.Block {
    let event = newMockEvent();
    event.block.number = BigInt.fromString(num);
    return event.block;
}

test('handleGenesis 0', () => {
    let block = createBlock('34');

    handleBlock__every(block);

    // let proto = safeLoadProtocol();

    // logStore();

    // assert.fieldEquals('Protocol', proto.id, 'epoch', '1');

    clearStore();
});
