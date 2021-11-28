import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { logStore } from 'matchstick-as/assembly/store';
import { handleGenesis } from '../../mappings/xnugg';
import { runGenesisNuggFT } from '../nuggft/Genesis.test';
import { Address, BigInt, log, dataSource, ethereum } from '@graphprotocol/graph-ts';
let niladdress = '0x0000000000000000000000000000000000000000';

export function createNewGenesisXNUGGEvent(): Genesis {
    let newGenesisEvent = changetype<Genesis>(newMockEvent());
    return newGenesisEvent;
}

export function runGenesisxNugg(): void {
    let newGenesisEvent = createNewGenesisXNUGGEvent();
    handleGenesis(newGenesisEvent);

    runGenesisNuggFT();
}

test('handleGenesis 0', () => {
    let newGenesisEvent = createNewGenesisXNUGGEvent();

    handleGenesis(newGenesisEvent);
    assert.fieldEquals('Protocol', '0x42069', 'id', '0x42069');

    assert.fieldEquals('Protocol', '0x42069', 'xnuggUser', '' + newGenesisEvent.address.toHexString());
    assert.fieldEquals('Protocol', '0x42069', 'nuggftUser', '' + niladdress);

    assert.fieldEquals('Epoch', 'NOTLIVE', 'id', 'NOTLIVE');

    assert.fieldEquals('Protocol', '0x42069', 'genesisBlock', '0');

    clearStore();
});

export { handleGenesis };
