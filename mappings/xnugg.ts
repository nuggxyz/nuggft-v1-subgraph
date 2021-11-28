import { Address, BigInt, log, dataSource, ethereum } from '@graphprotocol/graph-ts';
import { Epoch, Protocol, User } from '../generated/local/schema';
import { Transfer, Receive, Send, Genesis } from '../generated/local/xNUGG/xNUGG';
import { invariant } from './uniswap';
import { safeLoadProtocol, safeLoadUser, safeNewUser, safeLoadUserNull } from './safeload';

export function handleGenesis(event: Genesis): void {
    log.info('handleGenesisxNUGG start', []);

    let proto = new Protocol('0x42069');

    proto.init = false;
    proto.lastBlock = event.block.number;

    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');

    proto.genesisBlock = BigInt.fromString('0');
    proto.interval = BigInt.fromString('0');

    proto.xnuggTotalSupply = BigInt.fromString('0');
    proto.xnuggTotalEth = BigInt.fromString('0');
    proto.nuggftTotalEth = BigInt.fromString('0');

    proto.tvlEth = BigInt.fromString('0');
    proto.tvlUsd = BigInt.fromString('0');

    proto.priceUsdcWeth = BigInt.fromString('0');
    proto.priceWethXnugg = BigInt.fromString('0');
    proto.totalSwaps = BigInt.fromString('0');
    proto.totalUsers = BigInt.fromString('0');
    proto.totalNuggs = BigInt.fromString('0');
    proto.totalItems = BigInt.fromString('0');
    proto.totalItemSwaps = BigInt.fromString('0');

    let epoch = new Epoch('NOTLIVE');
    epoch.startblock = BigInt.fromString('0');
    epoch.endblock = BigInt.fromString('0');
    epoch.status = 'PENDING';
    epoch.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.xnugg = BigInt.fromString('0');
    nil.nuggs = [];
    nil.offers = [];
    nil.save();

    proto.epoch = epoch.id;
    proto.xnuggUser = nil.id;
    proto.nuggftUser = nil.id;
    proto.nullUser = nil.id;

    proto.save();

    let xnugg = safeNewUser(event.address);
    xnugg.xnugg = BigInt.fromString('0');
    xnugg.nuggs = [];
    xnugg.offers = [];
    xnugg.save();

    proto.xnuggUser = xnugg.id;

    proto.save();

    log.info('handleGenesisxNUGG end', []);
}

export function handleTransfer(event: Transfer): void {
    log.info('xNUGG handleTransfer start', []);

    let proto = safeLoadProtocol('0x42069');

    if (event.params.to.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.minus(event.params.value);
    } else {
        let to = safeLoadUserNull(event.params.to);

        if (to == null) {
            to = safeNewUser(event.params.to);
            to.xnugg = BigInt.fromString('0');
        }

        to.xnugg = to.xnugg.plus(event.params.value);

        to.save();
    }

    if (event.params.from.toHexString() == proto.nullUser) {
        proto.xnuggTotalSupply = proto.xnuggTotalSupply.plus(event.params.value);
    } else {
        let from = safeLoadUser(event.params.from);

        from.xnugg = from.xnugg.minus(event.params.value);

        from.save();
    }

    proto.save();

    log.info('xNUGG handleTransfer end', []);
}

export function handleReceive(event: Receive): void {
    log.info('xNUGG handleReceive start', []);

    let proto = safeLoadProtocol('0x42069');

    let user = safeLoadUserNull(event.params.sender);
    if (user == null) {
        user = safeNewUser(event.params.sender);
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

    let proto = safeLoadProtocol('0x42069');

    let user = safeLoadUserNull(event.params.receiver);

    if (user == null) {
        user = safeNewUser(event.params.receiver);
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
