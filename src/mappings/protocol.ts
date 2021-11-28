import { BigInt, dataSource, log } from '@graphprotocol/graph-ts';
import { Genesis as GenesisXNUGG } from '../generated/local/xNUGG/xNUGG';
import { Genesis as GenesisNuggFT } from '../generated/local/NuggFT/NuggFT';

import { Epoch, Protocol, User } from '../generated/local/schema';
import { invariant } from './uniswap';

export function handleGenesisxNUGG(event: GenesisXNUGG) {
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
    xnugg.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.xnugg = BigInt.fromString('0');
    nil.save();

    proto.totalSwaps = BigInt.fromString('');
    proto.totalUsers = BigInt.fromString('');
    proto.totalNuggs = BigInt.fromString('');
    proto.totalItems = BigInt.fromString('');
    proto.totalItemSwaps = BigInt.fromString('');

    let epoch = new Epoch('0');

    epoch.save();

    proto.epoch = epoch.id;
    proto.xnuggUser = xnugg.id;
    proto.nuggftUser = nil.id;
    proto.nullUser = nil.id;

    proto.save();

    log.info('handleGenesisxNUGG end', []);
}

export function handleGenesisNuggFT(event: GenesisNuggFT) {
    log.info('handleGenesisNuggFT start', []);

    let proto = Protocol.load('0x42069') as Protocol;

    invariant(proto != null, 'handleGenesisNuggFT: PROTOCALL CANNOT BE NULL');

    let nuggft = new User(event.address.toHexString());

    nuggft.xnugg = BigInt.fromString('0');

    nuggft.save();

    proto.genesisBlock = event.block.number;

    proto.nuggftUser = nuggft.id;

    proto.save();

    log.info('handleGenesisNuggFT end', []);
}
