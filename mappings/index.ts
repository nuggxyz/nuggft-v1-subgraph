import { Address, BigInt, ethereum, log } from '@graphprotocol/graph-ts';

import {
    OfferMint,
    Rotate,
    Sell,
    Claim,
    Offer,
    Genesis,
    Stake,
    Transfer,
    ClaimItem,
    OfferItem,
    SellItem,
    Liquidate,
    Rebalance,
    Loan,
} from '../generated/NuggftV1/NuggftV1';
import { Protocol, Epoch, User } from '../generated/schema';

import { LIQUDATION_PERIOD } from './constants';
import { onEpochGenesis, onBlockFinishedIndexing } from './epoch';
import { _offer } from './handlers/offer';
import { _offerItem } from './handlers/offerItem';
import { _rotate } from './handlers/rotate';
import { _sell } from './handlers/sell';
import { _sellItem } from './handlers/sellItem';
import { _stake } from './handlers/stake';
import { _transfer } from './handlers/transfer';
import {
    cacheDotnugg,
    getDotnuggUserId,
    getItemURIs,
    getPremints,
    updateProof,
    update__iloop,
    update__tloop,
} from './onchain';
import {
    safeLoadProtocol,
    safeLoadNugg,
    safeLoadUser,
    safeGetAndDeleteUserActiveSwap,
    safeLoadOfferHelper,
    safeRemoveNuggActiveSwap,
    safeNewUser,
    safeGetAndDeleteNuggActiveItemSwap,
    safeLoadItem,
    safeLoadItemOfferHelper,
    safeLoadNuggItemHelper,
    safeRemoveNuggItemActiveSwap,
    safeLoadLoanHelper,
    safeLoadUserNull,
    safeNewLoanHelper,
    safeRemoveNuggActiveLoan,
    safeSetNuggActiveLoan,
} from './safeload';
import { wethToUsdc } from './uniswap';
import { addr_i, b32toBigEndian, bigi, mask, MAX_UINT160 } from './utils';

export function handleBlock__every(block: ethereum.Block): void {
    onBlockFinishedIndexing(block);
}

export function handleEvent__Genesis(event: Genesis): void {
    log.info('BRUH', []);
    log.info(
        `handleEvent__Genesis start
    [blocknum:{},dotnugg:{},early:{},interval:{},intervalOffset:{},offset:{},stake:{},xnuggftv1:{}]`,
        [
            event.params.blocknum.toString(),
            event.params.dotnugg.toHex(),
            event.params.early.toString(),
            event.params.interval.toString(),
            event.params.intervalOffset.toString(),
            event.params.offset.toString(),
            event.params.stake.toHexString(),
            event.params.xnuggftv1.toHexString(),
        ],
    );

    let proto = new Protocol('0x42069');

    proto.init = false;
    proto.nuggsNotCached = [];
    proto.totalSwaps = bigi(0);
    proto.totalUsers = bigi(0);

    proto.genesisBlock = event.params.blocknum;
    proto.interval = event.params.interval;

    proto.nuggftTotalEth = bigi(0);

    proto.priceUsdcWeth = bigi(0);
    proto.totalSwaps = bigi(0);
    proto.totalUsers = bigi(0);
    proto.totalNuggs = bigi(0);
    proto.totalItems = bigi(0);
    proto.totalLoans = bigi(0);

    proto.totalItemSwaps = bigi(0);
    proto.epochOffset = bigi(event.params.offset);
    proto.nuggftStakedEthPerShare = bigi(0);
    proto.nuggftStakedEth = bigi(0);
    proto.nuggftStakedUsd = bigi(0);
    proto.nuggftStakedUsdPerShare = bigi(0);
    proto.featureTotals = [0, 0, 0, 0, 0, 0, 0, 0];
    proto.nuggftStakedShares = bigi(0);

    proto.iloop = '0x0';
    proto.tloop = '0x0';
    proto.sloop = '0x0';

    let epoch = new Epoch('NOTLIVE');
    epoch.startblock = bigi(0);
    epoch.endblock = bigi(0);
    epoch.status = 'PENDING';
    epoch.idnum = bigi(0);
    epoch._activeItemSwaps = [];
    epoch._activeSwaps = [];
    epoch._upcomingActiveItemSwaps = [];
    epoch._activeNuggItemSwaps = [];
    epoch.save();

    let nil = new User('0x0000000000000000000000000000000000000000');
    nil.shares = bigi(0);
    nil.save();
    proto.nextEpoch = epoch.id;
    proto.lastEpoch = epoch.id;
    proto.epoch = epoch.id;
    proto.dotnuggv1 = nil.id;
    proto.xnuggftv1 = nil.id;

    proto.nuggftUser = nil.id;
    proto.nuggftUser = nil.id;

    proto.nullUser = nil.id;
    proto.nuggsPendingRemoval = [];
    proto.dotnuggV1Processor = getDotnuggUserId(event.address).toHexString();
    proto.nuggsNotCached = [];

    proto.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let xnuggftv1 = safeNewUser(event.params.xnuggftv1);
    xnuggftv1.shares = bigi(0);
    xnuggftv1.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let dotnuggv1 = safeNewUser(event.params.dotnugg);
    dotnuggv1.shares = bigi(0);
    dotnuggv1.save();

    // safeNewUser loads Protocol, so this needs to be below proto.save()
    let nuggft = safeNewUser(event.address);
    nuggft.shares = bigi(0);
    nuggft.save();
    proto.nuggftUser = nuggft.id;

    proto.xnuggftv1 = xnuggftv1.id;
    proto.dotnuggv1 = dotnuggv1.id;
    // proto.xnuggftv1 = xnuggftv1.id;

    proto.save();

    getItemURIs(event.params.xnuggftv1);

    proto = onEpochGenesis(
        proto,
        event.block,
        event.params.blocknum,
        event.params.interval,
        bigi(event.params.offset),
    );

    getPremints(event, event.address, nuggft, event.block);

    _stake(b32toBigEndian(event.params.stake));

    proto = update__iloop(proto);
    proto = update__tloop(proto);

    proto.save();

    log.info('handleEvent__Genesis end {}', [proto.epoch]);
}

export function handleEvent__Stake(event: Stake): void {
    _stake(b32toBigEndian(event.params.stake));
}

export function handleEvent__Transfer(event: Transfer): void {
    _transfer(event.params._from, event.params._to, event.params._tokenId, event.block);
}

export function handleEvent__OfferMint(event: OfferMint): void {
    const inter = b32toBigEndian(event.params.stake);
    _offer(
        event.transaction.hash.toHexString(),
        bigi(event.params.tokenId),
        event.params.agency,
        event.block,
        inter,
    );
    _rotate(bigi(event.params.tokenId), event.block, event.params.proof, true);
    _stake(inter);

    update__tloop(null);
}

export function handleEvent__Offer(event: Offer): void {
    const inter = b32toBigEndian(event.params.stake);

    _offer(
        event.transaction.hash.toHexString(),
        bigi(event.params.tokenId),
        event.params.agency,
        event.block,
        inter,
    );
    _stake(inter);
}

export function handleEvent__Rotate(event: Rotate): void {
    _rotate(bigi(event.params.tokenId), event.block, event.params.proof, false);
}

export function handleEvent__Sell(event: Sell): void {
    _sell(event, b32toBigEndian(event.params.agency), event.params.tokenId);
}

export function handleEvent__Claim(event: Claim): void {
    log.info('handleEvent__Claim start', []);

    const proto = safeLoadProtocol();

    const nugg = safeLoadNugg(bigi(event.params.tokenId));

    const user = safeLoadUser(event.params.account);

    const swap = safeGetAndDeleteUserActiveSwap(user, nugg);

    const offer = safeLoadOfferHelper(swap, user);

    offer.claimed = true;
    offer.claimer = null;
    offer.save();

    if (swap.leader == user.id) {
        if (swap.owner == user.id) {
            safeRemoveNuggActiveSwap(nugg);
            swap.canceledEpoch = BigInt.fromString(proto.epoch);
            swap.save();
        }
    }

    // updatedStakedSharesAndEth();

    log.info('handleEvent__Claim end', []);
}

export function handleEvent__OfferItem(event: OfferItem): void {
    _offerItem(
        event,
        b32toBigEndian(event.params.agency),
        bigi(event.params.sellingTokenId),
        bigi(event.params.itemId),
    );

    _stake(b32toBigEndian(event.params.stake));
}

export function handleEvent__ClaimItem(event: ClaimItem): void {
    const sellingNuggId = event.params.sellingTokenId;

    const sellingItemId = bigi(event.params.itemId);

    const sellingNugg = safeLoadNugg(bigi(sellingNuggId));

    const item = safeLoadItem(sellingItemId);

    let buyingNugg = safeLoadNugg(bigi(event.params.buyerTokenId));

    const nuggitem = safeLoadNuggItemHelper(sellingNugg, item);

    const itemswap = safeGetAndDeleteNuggActiveItemSwap(buyingNugg, nuggitem);

    const itemoffer = safeLoadItemOfferHelper(itemswap, buyingNugg);

    safeRemoveNuggItemActiveSwap(nuggitem);

    itemoffer.claimed = true;

    itemoffer.save();

    const proof = b32toBigEndian(event.params.proof);

    if (proof.notEqual(bigi(0))) {
        buyingNugg = updateProof(buyingNugg, proof, false, event.block);

        buyingNugg = cacheDotnugg(buyingNugg, event.block.number);

        const tmp = buyingNugg._pickups;

        for (let i = 0; i < tmp.length; i++) {
            if (item.id == tmp[i]) {
                tmp.splice(i, 1);
                buyingNugg._pickups = tmp;
                buyingNugg.save();
                break;
            }
        }
    }
}

export function handleEvent__SellItem(event: SellItem): void {
    _sellItem(
        event,
        b32toBigEndian(event.params.agency),
        event.params.sellingTokenId,
        event.params.itemId,
        b32toBigEndian(event.params.proof),
    );
}

export function handleEvent__Loan(event: Loan): void {
    log.info('handleEvent__Loan start', []);

    const nugg = safeLoadNugg(bigi(event.params.tokenId));

    const agency = b32toBigEndian(event.params.agency);

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    const agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    const user = safeLoadUser(Address.fromString(nugg.user));

    const loan = safeNewLoanHelper();

    loan.liquidated = false;
    loan.liquidatedForEth = BigInt.fromString('0');
    loan.liquidatedForUsd = BigInt.fromString('0');

    loan.epoch = agency__epoch.toString();
    loan.user = user.id;
    loan.nugg = nugg.id;

    loan.toPayoff = BigInt.fromString('0');
    loan.toRebalance = BigInt.fromString('0');
    loan.earned = BigInt.fromString('0');
    loan.epochDue = BigInt.fromString('0');

    // dep
    loan.eth = agency__eth;
    loan.ethUsd = wethToUsdc(loan.eth);
    loan.feeEth = BigInt.fromString('0');
    loan.feeUsd = BigInt.fromString('0');
    loan.endingEpoch = agency__epoch.plus(LIQUDATION_PERIOD);

    // loan.save();

    // saves
    // updateLoanFromChain(loan);

    // loan.toPayoff = tmp.value.value1;
    // loan.toRebalance = tmp.value.value2;
    // loan.earned = tmp.value.value3;
    // loan.epochDue = BigInt.fromI32(tmp.value.value4);

    safeSetNuggActiveLoan(nugg, loan);

    log.info('handleEvent__Loan end', []);
}

export function handleEvent__Liquidate(event: Liquidate): void {
    log.info('handlePayoff', []);

    const agency = b32toBigEndian(event.params.agency);

    const agency__account = addr_i(agency.bitAnd(MAX_UINT160));

    const nugg = safeLoadNugg(bigi(event.params.tokenId));

    const loan = safeLoadLoanHelper(nugg);

    const user = safeLoadUserNull(agency__account);

    loan.liquidated = true;

    loan.liquidatedForEth = event.transaction.value;
    loan.liquidatedForUsd = wethToUsdc(loan.liquidatedForEth);
    loan.liquidatedBy = user.id;

    loan.save();

    safeRemoveNuggActiveLoan(nugg);

    log.info('handlePayoff', []);
}

export function handleEvent__Rebalance(event: Rebalance): void {
    log.info('handleRebalance', []);

    const nugg = safeLoadNugg(bigi(event.params.tokenId));

    const loan = safeLoadLoanHelper(nugg);

    const agency = b32toBigEndian(event.params.agency);

    // const agency__account = Address.fromBigInt(agency.bitAnd(MAX_UINT160));

    const agency__eth = agency.rightShift(160).bitAnd(mask(70)).times(bigi(10).pow(8));

    const agency__epoch = agency.rightShift(230).bitAnd(mask(24));

    // const agency__flag = agency.rightShift(254);

    loan.eth = agency__eth;
    loan.epoch = agency__epoch.toString();
    loan.endingEpoch = agency__epoch.plus(LIQUDATION_PERIOD);

    loan.save();

    log.info('handleRebalance', []);
}
