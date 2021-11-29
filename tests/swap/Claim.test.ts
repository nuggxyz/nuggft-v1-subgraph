import { clearStore, test, assert, newMockEvent } from 'matchstick-as';
import { Nugg, Protocol, User } from '../../generated/local/schema';
import { Genesis } from '../../generated/local/xNUGG/xNUGG';
import { handleClaim } from '../../mappings/swap';
import { logStore } from 'matchstick-as/assembly/store';
import { Claim, Claim__Params } from '../../generated/local/NuggFT/NuggFT';
import { Address, ethereum, BigInt, log } from '@graphprotocol/graph-ts';
import { runGenesisxNugg } from '../xnugg/Genesis.test';
import { Receive } from '../../generated/local/xNUGG/xNUGG';
import { handlePreMintDummy1, handlePreMintDummy0 } from '../nuggft/PreMint.test';
import { handleMintDummy0 } from './Mint.test';
import { handleSwapDummy0 } from './Swap.test';

let niladdress = '0x0000000000000000000000000000000000000000';

let address0 = '0xa16081f360e3847006db660bae1c6d1b2eaaaaaa';
let address1 = '0xa16081f360e3847006db660bae1c6d1b2eabcdef';
export function handleEvent(event: Claim): void {
    handleClaim(event);
}
// const help: { [key in keyof Claim__Params]: Claim__Params[key] };

export function createEvent(tokenId: BigInt, endingEpoch: BigInt, account: Address): Claim {
    let event = changetype<Claim>(newMockEvent());

    event.parameters = [
        new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)),
        new ethereum.EventParam('endingEpoch', ethereum.Value.fromUnsignedBigInt(endingEpoch)),
        new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
    ];
    // help;
    // event.transaction.value = value;

    return event;
}

test('Claim 0 - winner', () => {
    runGenesisxNugg();
    handlePreMintDummy0();
    handleMintDummy0();

    let offerId = '0-0-' + address1;

    assert.fieldEquals('Swap', '0-0', 'eth', '1000000');
    // assert.notInStore('Claim', offerId);
    assert.fieldEquals('Nugg', '0', 'activeSwap', '0-0');

    handleEvent(createEvent(BigInt.fromString('0'), BigInt.fromString('0'), Address.fromString(address1)));

    assert.fieldEquals('Nugg', '0', 'activeSwap', 'null');

    assert.fieldEquals('Offer', offerId, 'claimed', 'true');
    assert.fieldEquals('Offer', offerId, 'swap', '0-0');

    clearStore();
});

test('Claim 1 - owner', () => {
    runGenesisxNugg();

    let user = new User(address1);
    user.xnugg = BigInt.fromString('0');
    user.ethin = BigInt.fromString('0');
    user.ethout = BigInt.fromString('0');
    //     user.nuggs = [];
    //     user.offers = [];
    user.save();

    let nugg = new Nugg('420');
    //     nugg.swaps = [];
    //     nugg.items = [];
    //     nugg.offers = [];
    nugg.user = user.id;
    nugg.save();

    let floor = '200';

    handleSwapDummy0(user, nugg, BigInt.fromString(floor));

    handleEvent(createEvent(BigInt.fromString('420'), BigInt.fromString('0'), Address.fromString(user.id)));

    let swapId = nugg.id + '-0';
    let offerId = swapId + '-' + user.id;

    assert.notInStore('Offer', offerId);
    assert.notInStore('Swap', swapId);
    assert.fieldEquals('Nugg', nugg.id, 'activeSwap', 'null');

    clearStore();
});

export { handleClaim };
