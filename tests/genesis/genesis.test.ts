import { test, newMockEvent } from 'matchstick-as';
import { ethereum, BigInt, log, Address, Bytes } from '@graphprotocol/graph-ts';

import { handleEvent__Genesis } from '../../mappings';
import { Genesis } from '../../generated/NuggftV1/NuggftV1';
import { b32toBigEndian } from '../../mappings/utils';

const address0 = '0xa16081f360e3847006db660bae1c6d1b2e17ec2a';

export function mock__event__Genesis(): Genesis {
    const event = changetype<Genesis>(newMockEvent());

    const abc = Address.fromString(address0);

    log.info('A {}', [abc.toHexString()]);

    event.address = abc;

    event.parameters = [
        new ethereum.EventParam(
            'blocknum',
            ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(10767936)),
        ),
        new ethereum.EventParam(
            'dotnugg',
            ethereum.Value.fromAddress(Address.fromString(address0)),
        ),
        new ethereum.EventParam('early', ethereum.Value.fromI32(500)),
        new ethereum.EventParam('interval', ethereum.Value.fromI32(64)),
        new ethereum.EventParam('intervalOffset', ethereum.Value.fromI32(16)),
        new ethereum.EventParam('offset', ethereum.Value.fromI32(1)),
        new ethereum.EventParam(
            'stake',
            ethereum.Value.fromUnsignedBigInt(
                b32toBigEndian(
                    Bytes.fromHexString(
                        '0x00000000000001f40000000006f05b59d3b20000000000000000000000000000',
                    ),
                ),
            ),
        ),
        new ethereum.EventParam(
            'xnuggftv1',
            ethereum.Value.fromAddress(Address.fromString(address0)),
        ),
    ];
    log.info('B {}', [abc.toHexString()]);

    for (let index = 0; index < event.parameters.length; index++) {
        const c = event.params.early;
        log.info('{}', [c.toString()]);
    }
    log.info('C {}', [abc.toHexString()]);

    // log.info(
    //     'aaa{}{}{}{}{}{}{}{}{}',
    //     event.parameters.map<string>((x) => x.value.toString()),
    // );

    return event;
}

test('handleGenesis 0', () => {
    const event = mock__event__Genesis();

    // log.info('ABC {}', [BigInt.fromI32(event.params.early).toString()]);
    handleEvent__Genesis(event);

    // let proto = safeLoadProtocol();

    // logStore();

    // assert.fieldEquals('Protocol', proto.id, 'epoch', '1');

    // clearStore();
});
