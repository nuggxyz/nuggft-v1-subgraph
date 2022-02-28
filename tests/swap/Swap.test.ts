import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Nugg, Protocol, User } from '../../generated/schema';
import { Genesis } from '../../generated/xNUGG/xNUGG';
import { handleSwap } from '../../mappings/swap';
import { logStore } from 'matchstick-as/assembly/store';
import { Swap, Swap__Params } from '../../generated/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/xNUGG/xNUGG';
import { handlePreMintDummy1, handlePreMintDummy0 } from '../nuggft/PreMint.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eabcdef';
let address3 = '0xa16081f360e3847006db660bae1c6d1b23333333';

export function handleSwapDummy0(user: User, nugg: Nugg, floor: BigInt): void {
    handleEvent(createEvent(Address.fromString(user.id), BigInt.fromString(nugg.id), floor));
}

export function handleEvent(event: Swap): void {
    handleSwap(event);
}
// const help: { [key in keyof Swap__Params]: Swap__Params[key] };

export function createEvent(account: Address, tokenId: BigInt, value: BigInt): Swap {
    let event = changetype<Swap>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(value)),
    ];
    // help;
    event.transaction.value = value;

    return event;
}

test('Swap 0 - no value', () => {
    runGenesisxNugg();
    // handlePreMintDummy0();
    let user = new User(address3);

    user.xnugg = BigInt.fromString('0');
    user.ethin = BigInt.fromString('0');
    user.ethout = BigInt.fromString('0');
    user.nuggs = [];
    user.offers = [];
    user.save();

    let nugg = new Nugg('420');
    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];
    nugg.user = user.id;
    nugg.save();

    let floor = '200';

    handleSwapDummy0(user, nugg, BigInt.fromString(floor));

    let swapId = nugg.id + '-0';
    let offerId = swapId + '-' + user.id;

    assert.fieldEquals('Swap', swapId, 'id', swapId);
    assert.fieldEquals('Swap', swapId, 'leader', user.id);
    assert.fieldEquals('Swap', swapId, 'owner', user.id);
    assert.fieldEquals('Swap', swapId, 'eth', floor);
    assert.fieldEquals('Swap', swapId, 'ethUsd', '0');
    assert.fieldEquals('Swap', swapId, 'epoch', '');
    // assert.fieldEquals('Swap', '0-0', 'epochId', '0');

    assert.fieldEquals('Offer', offerId, 'id', offerId);
    assert.fieldEquals('Offer', offerId, 'owner', 'true');
    assert.fieldEquals('Offer', offerId, 'user', user.id);
    assert.fieldEquals('Offer', offerId, 'eth', floor);
    assert.fieldEquals('Offer', offerId, 'ethUsd', '0');
    assert.fieldEquals('Offer', offerId, 'claimed', 'false');
    assert.fieldEquals('Offer', offerId, 'swap', swapId);

    clearStore();
});

export { handleSwap };
