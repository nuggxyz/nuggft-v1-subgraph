import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/NuggFT/NuggFT';
import { logStore } from 'matchstick-as/assembly/store';
import { handleGenesis } from '../../mappings/nuggft';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { handleBlock } from '../../mappings/epoch';
import { safeLoadProtocol } from '../../mappings/safeload';

export function createBlock(num: string): ethereum.Block {
    let event = newMockEvent();
    event.block.number = BigInt.fromString(num);
    return event.block;
}

test('handleGenesis 0', () => {
    runGenesisxNugg();

    let block = createBlock('34');

    handleBlock(block);

    let proto = safeLoadProtocol();

    logStore();

    assert.fieldEquals('Protocol', proto.id, 'epoch', '1');

    clearStore();
});

export { handleGenesis };
