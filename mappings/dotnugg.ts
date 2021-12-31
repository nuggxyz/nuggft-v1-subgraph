import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { DotnuggV1Processor } from '../generated/local/NuggFT/DotnuggV1Processor';
import { NuggFT } from '../generated/local/NuggFT/NuggFT';
import { Nugg } from '../generated/local/schema';
import { safeLoadProtocol } from './safeload';
import { safeDiv } from './uniswap';

export function getDotnuggUserId(nuggftAddress: Address): Address {
    let nuggft = NuggFT.bind(nuggftAddress);
    let callResult = nuggft.dotnuggV1Processor();
    return callResult;
}

export function cacheDotnugg(nugg: Nugg): void {
    let proto = safeLoadProtocol('0x42069');

    let dotnugg = DotnuggV1Processor.bind(Address.fromString(proto.dotnuggV1Processor));
    let callResult = dotnugg.try_dotnuggToRaw(Address.fromString(proto.nuggftUser), nugg.idnum, Address.fromString(nugg.resolver), 45, 10);

    if (callResult.reverted) {
        log.info('cacheDotnugg reverted with user defined resolver', []);

        callResult = dotnugg.try_dotnuggToRaw(Address.fromString(proto.nuggftUser), nugg.idnum, Address.fromString(proto.nullUser), 45, 10);
    }

    if (!callResult.reverted) {
        nugg.dotnuggRawCache = callResult.value.value1.map<string>((x: BigInt): string => x.toHexString()).join('');

        log.info('cacheDotnugg updated dotnugg cache', []);
    } else {
        if (nugg.dotnuggRawCache === null || nugg.dotnuggRawCache === '') {
            nugg.dotnuggRawCache = 'ERROR_WITH_DOTNUGG_CACHE: try getting data on chain';
        }

        log.info('cacheDotnugg reverted with default resolver', []);
    }

    nugg.save();
}
// nuggs (first:5) {
//     dotnuggRawCache
//   }

export function updatedStakedSharesAndEth(): void {
    let proto = safeLoadProtocol('0x42069');
    let nuggft = NuggFT.bind(Address.fromString(proto.nuggftUser));
    proto.nuggftStakedEth = nuggft.stakedShares();
    proto.nuggftStakedShares = nuggft.stakedShares();
    proto.nuggftStakedEthPerShare = safeDiv(proto.nuggftStakedEth, proto.nuggftStakedShares);
    proto.save();
}
