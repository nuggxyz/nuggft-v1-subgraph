import { clearStore, test, assert, newMockEvent } from 'matchstick-as/assembly/index';
import { Genesis as GenesisXNUGG } from '../src/generated/local/xNUGG/xNUGG';
import { Genesis as GenesisNuggFT } from '../src/generated/local/NuggFT/NuggFT';
import { Address, ethereum } from '@graphprotocol/graph-ts';
import { Transfer } from '../src/generated/ropsten/xNUGG/xNUGG';
import { Nugg, Protocol } from '../src/generated/local/schema';
import { handleGenesisxNUGG } from '../src/mappings/protocol';

export function createNewGenesisXNUGGEvents(events: GenesisXNUGG[]): void {
    events.forEach((event) => {
        handleGenesisxNUGG(event);
    });
}

export function createNewGenesisXNUGGEvent(): GenesisXNUGG {
    let mockEvent = newMockEvent();
    let newGenesisEvent = new GenesisXNUGG(
        mockEvent.address,
        mockEvent.logIndex,
        mockEvent.transactionLogIndex,
        mockEvent.logType,
        mockEvent.block,
        mockEvent.transaction,
        mockEvent.parameters,
    );
    newGenesisEvent.parameters = new Array();

    // let idParam = new ethereum.EventParam('id', ethereum.Value.fromI32(id));
    // let addressParam = new ethereum.EventParam('ownderAddress', ethereum.Value.fromAddress(Address.fromString(ownerAddress)));
    // let displayNameParam = new ethereum.EventParam('displayName', ethereum.Value.fromString(displayName));
    // let imageUrlParam = new ethereum.EventParam('imageUrl', ethereum.Value.fromString(imageUrl));

    // newGenesisEvent.parameters.push(idParam);
    // newGenesisEvent.parameters.push(addressParam);
    // newGenesisEvent.parameters.push(displayNameParam);
    // newGenesisEvent.parameters.push(imageUrlParam);

    return newGenesisEvent;
}

export function runTests(): void {
    test('Can call mappings with custom events', () => {
        // // Initialise
        // let m1 = new Protocol('gravatarId0');
        // m1.save();

        // Call mappings
        let newGenesisEvent = createNewGenesisXNUGGEvent();

        let anotherGenesisEvent = createNewGenesisXNUGGEvent();

        createNewGenesisXNUGGEvents([newGenesisEvent, anotherGenesisEvent]);

        assert.fieldEquals('Protocol', '0x42069', 'id', '0x42069');
        // assert.fieldEquals('Protocol', '12345', 'owner', '0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7');
        // assert.fieldEquals('Protocol', '3546', 'displayName', 'cap');

        clearStore();
    });

    // test('Next test', () => {
    //     //...
    // });
}
