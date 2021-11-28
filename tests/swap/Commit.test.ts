import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Nugg, Protocol, User } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleCommit } from '../../mappings/swap';
import { logStore } from 'matchstick-as/assembly/store';
import { Commit, Commit__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';

import { handleSwapDummy0 } from './Swap.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';
let address1 = '0xa16081f360e3847006db660bae1c6d1b2ebbbbbb';

export function handleCommitDummy0(user: User, nugg: Nugg, floor: BigInt): void {
    handleEvent(createEvent(Address.fromString(user.id), BigInt.fromString(nugg.id), floor));
}

export function handleEvent(event: Commit): void {
    handleCommit(event);
}
// const help: { [key in keyof Commit__Params]: Commit__Params[key] };

export function createEvent(account: Address, tokenId: BigInt, value: BigInt): Commit {
    let event = changetype<Commit>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
        new ethereum.EventParam('eth', ethereum.Value.fromUnsignedBigInt(value)),
    ];
    // help;
    event.transaction.value = value;

    return event;
}

test('Commit 0 - with value', () => {
    runGenesisxNugg();

    let seller = new User(address0);
    seller.xnugg = BigInt.fromString('0');
    seller.ethin = BigInt.fromString('0');
    seller.ethout = BigInt.fromString('0');
    seller.nuggs = [];
    seller.offers = [];
    seller.save();

    let buyer = new User(address1);
    buyer.xnugg = BigInt.fromString('0');
    buyer.ethin = BigInt.fromString('0');
    buyer.ethout = BigInt.fromString('0');
    buyer.nuggs = [];
    buyer.offers = [];
    buyer.save();

    let nugg = new Nugg('420');
    nugg.swaps = [];
    nugg.items = [];
    nugg.offers = [];
    nugg.user = seller.id;
    nugg.save();

    let floor = '200';
    let buyamount = '900';

    handleSwapDummy0(seller, nugg, BigInt.fromString(floor));

    let swapId = nugg.id + '-0';
    let offerId_seller = swapId + '-' + seller.id;

    assert.fieldEquals('Swap', swapId, 'id', swapId);
    assert.fieldEquals('Swap', swapId, 'leader', seller.id);
    assert.fieldEquals('Swap', swapId, 'owner', seller.id);
    assert.fieldEquals('Swap', swapId, 'eth', floor);
    assert.fieldEquals('Swap', swapId, 'ethUsd', '0');
    assert.fieldEquals('Swap', swapId, 'epoch', '');
    // assert.fieldEquals('Swap', swapId, 'epochId', '0');

    assert.fieldEquals('Offer', offerId_seller, 'id', offerId_seller);
    assert.fieldEquals('Offer', offerId_seller, 'owner', 'true');
    assert.fieldEquals('Offer', offerId_seller, 'user', seller.id);
    assert.fieldEquals('Offer', offerId_seller, 'eth', floor);
    assert.fieldEquals('Offer', offerId_seller, 'ethUsd', '0');
    assert.fieldEquals('Offer', offerId_seller, 'claimed', 'false');
    assert.fieldEquals('Offer', offerId_seller, 'swap', swapId);

    handleCommitDummy0(buyer, nugg, BigInt.fromString(buyamount));

    swapId = nugg.id + '-1';
    let offerId_buyer = swapId + '-' + buyer.id;

    assert.fieldEquals('Swap', swapId, 'id', swapId);
    assert.fieldEquals('Swap', swapId, 'leader', buyer.id);
    assert.fieldEquals('Swap', swapId, 'owner', seller.id);
    assert.fieldEquals('Swap', swapId, 'eth', buyamount);
    assert.fieldEquals('Swap', swapId, 'ethUsd', '0');
    assert.fieldEquals('Swap', swapId, 'epoch', '1');
    // assert.fieldEquals('Swap', swapId, 'epochId', '0');

    assert.fieldEquals('Offer', offerId_buyer, 'id', offerId_buyer);
    assert.fieldEquals('Offer', offerId_buyer, 'owner', 'false');
    assert.fieldEquals('Offer', offerId_buyer, 'user', buyer.id);
    assert.fieldEquals('Offer', offerId_buyer, 'eth', buyamount);
    assert.fieldEquals('Offer', offerId_buyer, 'ethUsd', '0');
    assert.fieldEquals('Offer', offerId_buyer, 'claimed', 'false');
    assert.fieldEquals('Offer', offerId_buyer, 'swap', swapId);

    clearStore();
});

export { handleCommit };
