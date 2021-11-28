import { BigInt, log } from '@graphprotocol/graph-ts';
import { Protocol, User } from '../generated/local/schema';
import { Transfer, Receive, Send, Genesis } from '../generated/local/xNUGG/xNUGG';
import { invariant } from './uniswap';
export { runTests } from '../../tests/protocol.test';

export function handleTransfer(event: Transfer): void {
    log.info('xNUGG handleTransfer start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    if (event.params.to.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.minus(event.params.value);
    } else {
        let to = User.load(event.params.to.toHexString().toLowerCase()) as User;

        if (to == null) {
            to = new User(event.params.to.toHexString().toLowerCase()) as User;
            to.xnugg = BigInt.fromString('0');
        }

        to.xnugg = to.xnugg.plus(event.params.value);

        to.save();
    }

    if (event.params.from.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.plus(event.params.value);
    } else {
        let from = User.load(event.params.from.toHexString().toLowerCase()) as User;

        invariant(from != null, 'xNUGG handleTransfer: FROM ADDRESS CANNOT BE NULL');

        from.xnugg = from.xnugg.minus(event.params.value);

        from.save();
    }

    proto.save();

    log.info('xNUGG handleTransfer end', []);
}

export function handleReceive(event: Receive): void {
    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    proto.tvlEth = proto.tvlEth.plus(event.params.eth);

    proto.save();
}

export function handleSend(event: Send): void {
    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    proto.tvlEth = proto.tvlEth.minus(event.params.eth);

    proto.save();
}
