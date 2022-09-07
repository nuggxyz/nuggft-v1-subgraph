import { log, BigInt, ethereum } from '@graphprotocol/graph-ts';

import { safeLoadProtocol } from '../safeload';
import { mask, safeDiv } from '../utils';

export function _stake(agency: BigInt, block: ethereum.Block): void {
    // let copy = Bytes.fromHexString(cache.toHexString());
    // let agency = b32toBigEndian(copy);

    // let protocolEth = event.params.stake.bitAnd(mask(96));
    const eth = agency.rightShift(96).bitAnd(mask(96));
    const shares = agency.rightShift(192);

    log.warning('handleEvent__Stake start [Hex:{}] [eth:{}] [shares:{}]', [
        // BigInt.fromUnsignedBytes(agency).reverse().toString(),
        agency.toHexString(),
        // agency.toHexString(),
        eth.toString(),
        shares.toString(),
    ]);

    const proto = safeLoadProtocol();

    proto.nuggftStakedEth = eth;
    proto.nuggftStakedShares = shares;
    proto.nuggftStakedEthPerShare = safeDiv(eth, shares);
    proto.updatedAt = block.number;

    proto.save(); // OK

    log.info('handleEvent__Stake end', []);
}
