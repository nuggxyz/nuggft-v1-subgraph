import { BigInt, log } from '@graphprotocol/graph-ts';
import { Epoch, Protocol, User } from '../generated/local/schema';
import { Transfer, Receive, Send, Genesis } from '../generated/local/xNUGG/xNUGG';
import { invariant } from './uniswap';

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesisxNUGG start', []);

    let proto = new Protocol('0x42069');

    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');

    proto.genesisBlock = event.block.number;
    proto.interval = BigInt.fromString('25');

    proto.xnuggTotalSupply = BigInt.fromString('0');
    proto.xnuggTotalEth = BigInt.fromString('0');
    proto.nuggftTotalEth = BigInt.fromString('0');

    proto.tvlEth = BigInt.fromString('0');
    proto.tvlUsd = BigInt.fromString('0');

    proto.priceUsdcWeth = BigInt.fromString('0');
    proto.priceWethXnugg = BigInt.fromString('0');

    let xnugg = new User(event.address.toHexString());
    xnugg.xnugg = BigInt.fromString('0');
    xnugg.nuggs = [];
    xnugg.offers = [];
    xnugg.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.xnugg = BigInt.fromString('0');
    nil.nuggs = [];
    nil.offers = [];
    nil.save();

    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');
    proto.totalNuggs = BigInt.fromString('0');
    proto.totalItems = BigInt.fromString('0');
    proto.totalItemSwaps = BigInt.fromString('0');

    let epoch = new Epoch('0');

    epoch.save();

    proto.epoch = epoch.id;
    proto.xnuggUser = xnugg.id;
    proto.nuggftUser = nil.id;
    proto.nullUser = nil.id;

    proto.save();

    log.info('handleGenesisxNUGG end', []);
}

export function handleTransfer(event: Transfer): void {
    log.info('xNUGG handleTransfer start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleTransfer: PROTOCOL CANNOT BE NULL');

    if (event.params.to.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.minus(event.params.value);
    } else {
        let to = User.load(event.params.to.toHexString()) as User;

        if (to == null) {
            to = new User(event.params.to.toHexString()) as User;
            to.xnugg = BigInt.fromString('0');
        }

        to.xnugg = to.xnugg.plus(event.params.value);

        to.save();
    }

    if (event.params.from.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.plus(event.params.value);
    } else {
        let from = User.load(event.params.from.toHexString()) as User;

        invariant(from != null, 'xNUGG handleTransfer: FROM ADDRESS CANNOT BE NULL');

        from.xnugg = from.xnugg.minus(event.params.value);

        from.save();
    }

    proto.save();

    log.info('xNUGG handleTransfer end', []);
}

export function handleReceive(event: Receive): void {
    log.info('xNUGG handleReceive start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleReceive: PROTOCOL CANNOT BE NULL');

    let user = User.load(event.params.sender.toHexString()) as User;
    if (user == null) {
        user = new User(event.params.sender.toHexString()) as User;
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
    }

    proto.tvlEth = proto.tvlEth.plus(event.params.eth);
    user.ethin = user.ethin.plus(event.params.eth);

    user.save();

    proto.save();
    log.info('xNUGG handleReceive end', []);
}

export function handleSend(event: Send): void {
    log.info('xNUGG handleSend start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'xNUGG handleSend: PROTOCOL CANNOT BE NULL');

    let user = User.load(event.params.receiver.toHexString()) as User;

    if (user == null) {
        user = new User(event.params.receiver.toHexString()) as User;
        user.xnugg = BigInt.fromString('0');
        user.ethin = BigInt.fromString('0');
        user.ethout = BigInt.fromString('0');
    }

    proto.tvlEth = proto.tvlEth.minus(event.params.eth);

    user.ethout = user.ethout.plus(event.params.eth);

    proto.save();
    user.save();

    log.info('xNUGG handleSend end', []);
}
