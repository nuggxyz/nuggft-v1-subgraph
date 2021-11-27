import { BigInt, log } from '@graphprotocol/graph-ts';
import { Protocol, User } from '../generated/local/schema';
import { Transfer, Receive, Send, Genesis } from '../generated/local/xNUGG/xNUGG';

export function handleTransfer(event: Transfer) {
    log.info('xNUGG handleTransfer start', []);

    let proto = Protocol.load('0x42069');

    assert(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    if (event.params.to.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.minus(event.params.value);
    } else {
        let to = User.load(event.params.to.toHexString().toLowerCase());

        if (to == null) {
            to = new User(event.params.to.toHexString().toLowerCase());
            to.xnugg = BigInt.fromString('0');
        }

        to.xnugg = to.xnugg.plus(event.params.value);

        to.save();
    }

    if (event.params.from.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.plus(event.params.value);
    } else {
        let from = User.load(event.params.from.toHexString().toLowerCase());

        assert(from != null, 'xNUGG handleTransfer: FROM ADDRESS CANNOT BE NULL');

        from.xnugg = from.xnugg.minus(event.params.value);

        from.save();
    }

    proto.save();

    log.info('xNUGG handleTransfer end', []);
}

export function handleReceive(event: Receive): void {
    let proto = Protocol.load('0x42069');

    assert(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    proto.tvlEth = proto.tvlEth.plus(event.params.eth);

    proto.save();
}

export function handleSend(event: Send): void {
    let proto = Protocol.load('0x42069');

    assert(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    proto.tvlEth = proto.tvlEth.minus(event.params.eth);

    proto.save();
}
