import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Protocol } from '../../generated/schema';
import { Genesis } from '../../generated/NuggFT/NuggFT';
import { logStore } from 'matchstick-as/assembly/store';
import { handleGenesis } from '../../mappings/nuggft';
import { runGenesisxNugg } from '../xnugg/Genesis.test';

export function createNewGenesisEvent(): Genesis {
    let newGenesisEvent = changetype<Genesis>(newMockEvent());

    return newGenesisEvent;
}

export function runGenesisNuggFT(): void {
    let newGenesisEvent = createNewGenesisEvent();
    handleGenesis(newGenesisEvent);
}

test('handleGenesis 0', () => {
    runGenesisxNugg();

    let newGenesisEvent = createNewGenesisEvent();

    handleGenesis(newGenesisEvent);

    assert.fieldEquals('Protocol', '0x42069', 'nuggftUser', newGenesisEvent.address.toHexString());

    assert.fieldEquals('User', newGenesisEvent.address.toHexString(), 'xnugg', '0');

    clearStore();
});

export { handleGenesis };
