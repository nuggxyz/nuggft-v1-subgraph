import { ethereum } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';
// import { Market, Swap, Offer, OfferTransaction, Account, Token } from '../generated/local/schema';
import { BigInt, Address } from '@graphprotocol/graph-ts';
import { toUsd } from './oracle';
import { onSubmitOffer } from './intervals';
import { Genesis, SubmitClaim, SubmitOffer, SubmitSwap } from '../generated/local/NuggSwap/NuggSwap';
import { Offer, OfferTransaction, Market, Swap, Account, Token } from '../generated/local/schema';

export const MARKET_ID = '42069';

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000');
export const ADDRESS_NULL = Address.fromString('0x0000000000000000000000000000000000000001');

export const Q256 = BigInt.fromI32(2).pow(255);
export const Q128 = BigInt.fromI32(2).pow(128);

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);
export const THREE = BigInt.fromI32(3);
export const ONEe18 = BigInt.fromString('1000000000000000000');

export const THREE_THOUSAND = BigInt.fromI32(3)
    .times(BigInt.fromI32(1000))
    .times(ONEe18);

export function safeCreateMarket(event: ethereum.Event): Market {
    log.info('safeCreateMarket start', []);

    let market = Market.load(MARKET_ID);
    if (market === null) {
        market = new Market(MARKET_ID);
        market.id = MARKET_ID;
        market.totalUsers = ZERO;
        market.genesisBlock = event.block.number;
        market.shares = ZERO;
        market.tvl = ZERO;
        market.tvlUsd = ZERO;
        market.interval = BigInt.fromI32(25);
        market.ethPriceUsd = ZERO;

        market.save();

        let account1 = safeCreateAccount(ADDRESS_NULL.toHexString());
        let account = safeCreateAccount(ADDRESS_ZERO.toHexString());
        account.save();
        account1.save();

        market.nuggswap = account1.id;

        market.save();
    }
    log.info('safeCreateMarket end', []);

    return market as Market;
}

function safeLoadOffer(swap: Swap, account: Account): Offer {
    log.info('safeLoadOffer start', []);

    let offer = Offer.load(getOfferIdRaw(swap, account));
    if (offer === null) {
        log.error('Tried query offer that does not exist ', []);
    }
    log.info('safeLoadOffer end', []);

    return offer as Offer;
}

export function safeLoadMarket(id: string): Market {
    log.info('safeLoadMarket start', []);

    let market = Market.load(id);
    if (market === null) {
        log.error('Tried query market that does not exist ', []);
    }
    log.info('safeLoadMarket end', []);

    return market as Market;
}

function safeLoadSwap(id: string): Swap {
    log.info('safeLoadSwap start', []);

    let swap = Swap.load(id);
    if (swap === null) {
        log.error('Tried query swap that does not exist ', []);
    }
    log.info('safeLoadSwap end', []);

    return swap as Swap;
}

export function safeLoadAccount(id: string): Account {
    log.info('safeLoadAccount start', []);

    let account = Account.load(id);
    if (account === null) {
        log.error('Tried query account that does not exist ', []);
    }
    log.info('safeLoadAccount end', []);

    return account as Account;
}

export function safeCreateToken(tokenid: string): Token {
    log.info('safeCreateToken start', []);

    let token = Token.load(tokenid.toString());
    if (token === null) {
        token = new Token(tokenid.toString());
        token.market = MARKET_ID;
        token.owner = ADDRESS_ZERO.toHexString();
        token.swapsCount = ZERO;
        // token.mintSwap = 'MINT-'.concat(id);
        // token.lastSwap = 'MINT-'.concat(id);
        token.save();
    }
    log.info('safeCreateToken end', []);

    return token as Token;
}

export function safeCreateSwap(event: ethereum.Event, nft: Address, tokenid: BigInt, swapnum: BigInt): Swap {
    log.info('safeCreateSwap start', []);

    let id = getSwapId(nft, tokenid, swapnum);
    let token = safeCreateToken(getTokenId(nft, tokenid));

    let zero = safeCreateAccount(ADDRESS_ZERO.toHexString());

    let swap = Swap.load(id);
    if (swap === null) {
        swap = new Swap(id);
        swap.id = id;
        swap.amount = ZERO;
        swap.amountUsd = ZERO;

        swap.epoch = getCurrentEpoch(event);
        swap.market = MARKET_ID;
        swap.token = token.id;
        swap.seller = ADDRESS_ZERO.toHexString();
        // swap.buyer = ADDRESS_NULL.toHexString();

        swap.sold = false;
        swap.finalized = false;
        swap.startepoch = getCurrentEpoch(event);
        // swap.endepoch = getCurrentEpoch(event);
        swap.floor = ZERO;
        swap.mint = true;
        swap.offerCount = ZERO;
        swap.save();

        token.swapsCount = token.swapsCount.plus(ONE);
        token.mintSwap = swap.id;
        token.lastSwap = swap.id;
        token.save();

        zero.totalTokens = zero.totalTokens.plus(ONE);
        zero.save();
    }
    log.info('safeCreateSwap end', []);

    return swap as Swap;
}

export function getOfferId(nft: Address, tokenid: BigInt, swapnum: BigInt, account: Address): string {
    return getSwapId(nft, tokenid, swapnum)
        .concat('-')
        .concat(account.toHexString());
}

export function getOfferIdRaw(swap: Swap, account: Account): string {
    return swap.id.concat('-').concat(account.id);
}

// export function sentByMinterEvent(event: ethereum.Event): boolean {
//     let market = safeCreateMarket(event);
//     return sentByMinter(event.address, market.nuggswap);
// }

// export function sentBySellerEvent(event: ethereum.Event): boolean {
//     let market = safeCreateMarket(event);
//     return sentBySeller(event.address, market.seller);
// }

// export function sentByMinter(check: Address, minter: string | null): boolean {
//     if (minter !== null) {
//         return check.equals(Address.fromString(minter));
//     } else return false;
// }

// export function sentBySeller(check: Address, seller: string | null): boolean {
//     if (seller !== null) {
//         return check.equals(Address.fromString(seller));
//     } else return false;
// }

export function getSwapId(nft: Address, tokenid: BigInt, swapnum: BigInt): string {
    return nft
        .toHexString()
        .concat('-')
        .concat(tokenid.toString())
        .concat('-')
        .concat(swapnum.toString());
}

export function getTokenId(nft: Address, tokenid: BigInt): string {
    return nft
        .toHexString()
        .concat('-')
        .concat(tokenid.toString());
}

export function getCurrentEpoch(event: ethereum.Event): BigInt {
    let market = safeCreateMarket(event);
    return event.block.number.minus(market.genesisBlock).div(market.interval);
}

export function safeCreateAccount(id: string): Account {
    log.info('safeCreateAccount start', []);

    let account = Account.load(id);
    if (account === null) {
        account = new Account(id);
        account.id = id;
        account.market = MARKET_ID;
        account.shares = ZERO;
        account.earnings = ZERO;
        account.deposits = ZERO;
        account.withdrawals = ZERO;
        account.earningsUsd = ZERO;
        account.withdrawalsUsd = ZERO;
        account.depositsUsd = ZERO;
        account.totalOffers = ZERO;
        account.totalTokens = ZERO;
        account.totalTrades = ZERO;
        // account.address = Address.fromString(id).to;
        account.save();

        let market = safeLoadMarket(MARKET_ID);
        market.totalUsers = market.totalUsers.plus(ONE);
        market.save();
    }
    log.info('safeCreateAccount end', []);

    return account as Account;
}

function safeCreateOffer(swap: Swap, account: Account): Offer {
    log.info('safeCreateOffer start', []);

    let id = getOfferIdRaw(swap, account);
    let offer = Offer.load(id);
    if (offer === null) {
        offer = new Offer(id);
        offer.id = id;
        offer.swap = swap.id;
        offer.account = account.id;
        offer.amount = ZERO;
        offer.amountUsd = ZERO;
        offer.claimed = false;
        offer.txCount = ZERO;
        offer.save();
        account.totalOffers = account.totalOffers.plus(ONE);
        account.save();
    }
    log.info('safeCreateOffer end', []);

    return offer;
}

export function handleGenesis(event: Genesis): void {
    // TODO
    log.info('handleGenesis start', []);
    let market = safeCreateMarket(event);

    let account = safeCreateAccount(event.address.toHexString());
    account.save();
    market.genesisBlock = event.params.baseblock;
    market.interval = event.params.interval;

    market.nuggswap = account.id;

    market.save();
    log.info('handleGenesis end', []);
}

export function handleSubmitSwap(event: SubmitSwap): void {
    let id = getSwapId(event.params.nft, event.params.tokenid, event.params.swapnum);
    // let swap = Swap.load(id);
    let market = safeLoadMarket(MARKET_ID);
    let seller = safeCreateAccount(event.transaction.from.toHexString());

    let token = Token.load(getTokenId(event.params.nft, event.params.tokenid)) as Token;

    let swap = new Swap(id);
    swap.amount = ZERO;
    swap.amountUsd = ZERO;
    swap.epoch = event.params.epoch;
    swap.market = market.id;
    swap.token = getTokenId(event.params.nft, event.params.tokenid);
    swap.seller = seller.id;

    swap.sold = false;
    swap.finalized = false;
    swap.startepoch = getCurrentEpoch(event);
    // swap.endepoch = event.params.epoch;
    swap.floor = event.params.amount;
    swap.mint = false;
    swap.activeMarket = market.id;
    swap.offerCount = ZERO;

    swap.save();

    token.swapsCount = token.swapsCount.plus(ONE);
    token.lastSwap = swap.id;
    // let seller = market.seller;
    // if (seller !== null) token.owner = seller;

    token.save();
}

// export function handleSaleStop(event: SaleStop): void {
//     let id = getSwapId(event.params.saleId, event);
//     let swap = safeLoadSwap(id);
//     // let token = safeCreateToken(swap.token);

//     // swap.activeMarket = null;
//     swap.finalized = true;
//     // token.owner = swap.seller;
//     swap.save();
// }

export function handleSubmitOffer(event: SubmitOffer): void {
    let swap = safeCreateSwap(event, event.params.nft, event.params.tokenid, event.params.swapnum);

    // if (swap === null) {
    //     swap = safeCreateSwap(event, event.params.nft, event.params.tokenid, event.params.swapnum);
    // }

    let account = safeCreateAccount(event.params.account.toHexString());
    // let token = safeCreateToken(swap.token);
    let offer = safeCreateOffer(swap, account);

    let id = event.transaction.hash.toHexString();
    let offerTransaction = new OfferTransaction(id);
    offerTransaction.offer = offer.id;
    offerTransaction.amount = event.params.amount.minus(offer.amount);
    offerTransaction.amountUsd = toUsd(offerTransaction.amount);
    // offerTransaction.currency = BigInt.fromI32(event.params.currency);
    offerTransaction.blockNumber = event.block.number;
    offerTransaction.index = offer.txCount;
    offerTransaction.timestamp = event.block.timestamp;

    offerTransaction.claim = false;
    // offerTransaction.winning = sentByMinterEvent(event);
    // buyer.totalTokens = buyer.totalTokens.plus(ONE);

    offer.amount = offer.amount.plus(offerTransaction.amount);
    offer.amountUsd = offer.amountUsd.plus(toUsd(offerTransaction.amount));
    offer.lastTransaction = offerTransaction.id;
    offer.txCount = offer.txCount.plus(ONE);

    if (offer.txCount.equals(ONE)) swap.offerCount = swap.offerCount.plus(ONE);
    swap.amount = offer.amount;
    swap.amountUsd = offer.amountUsd;
    swap.top = offer.id;

    // snapshot
    offerTransaction.activeOfferAmount = offer.amount;
    offerTransaction.activeOfferAmountUsd = offer.amountUsd;

    swap.save();
    offer.save();
    offerTransaction.save();

    onSubmitOffer(event, offerTransaction.amount);

    // if (sentByMinterEvent(event)) onMintOffer(event, offer.amount);
    // else if (sentBySellerEvent(event)) onSaleOffer(event, offer.amount);
}

export function handleSubmitClaim(event: SubmitClaim): void {
    // TODO handle winning, ending early, and owner claim
    let market = safeCreateMarket(event);
    let swap = safeLoadSwap(getSwapId(event.params.nft, event.params.tokenid, event.params.swapnum));
    let account = safeLoadAccount(event.params.account.toHexString());
    let offer = safeLoadOffer(swap, account);

    offer.claimed = true;
    // swap.activeMarket = null;

    let id = event.transaction.hash.toHexString();
    let offerTransaction = new OfferTransaction(id);
    offerTransaction.id = id;
    offerTransaction.offer = offer.id;

    offerTransaction.amount = offer.amount;
    offerTransaction.amountUsd = toUsd(offerTransaction.amount);

    // offerTransaction.currency = BigInt.fromI32(event.params.currency);
    offerTransaction.blockNumber = event.block.number;
    offerTransaction.timestamp = event.block.timestamp;

    offerTransaction.index = swap.offerCount;
    offerTransaction.claim = true;
    offerTransaction.winning = false;

    offerTransaction.activeOfferAmount = offer.amount;
    offerTransaction.activeOfferAmountUsd = offer.amountUsd;
    offer.txCount = offer.txCount.plus(ONE);
    offer.lastTransaction = offerTransaction.id;

    account.save();
    swap.save();
    offer.save();
    offerTransaction.save();
}

// export function handleWinningClaim(event: WinningClaim): void {
//     let swap = safeLoadSwap(getSwapId(event.params.epoch, event));
//     log.info('safeCreateAccount start', [swap.id.toString()]);

//     let token = safeCreateToken(swap.token);
//     let buyerAccount = safeLoadAccount(event.params.user.toHexString());
//     let sellerAccount = safeLoadAccount(event.params.user.toHexString());

//     let offer = safeLoadOffer(swap, buyerAccount);

//     offer.claimed = true;
//     swap.finalized = true;
//     // token.owner = offer.account;
//     swap.buyer = buyerAccount.id;
//     swap.activeMarket = null;
//     // buyerAccount.totalTokens = buyerAccount.totalTokens.plus(ONE);
//     // sellerAccount.totalTokens = sellerAccount.totalTokens.minus(ONE);

//     let id = event.transaction.hash.toString();
//     let offerTransaction = new OfferTransaction(id);
//     offerTransaction.offer = offer.id;
//     offerTransaction.amount = event.params.amount;
//     offerTransaction.currency = THREE;
//     offerTransaction.blockNumber = event.block.number;
//     offerTransaction.timestamp = event.block.timestamp;

//     offerTransaction.amountUsd = toUsd(offerTransaction.amount);
//     offerTransaction.index = offer.txCount;
//     offerTransaction.claim = true;
//     offerTransaction.winning = true;

//     offerTransaction.activeOfferAmount = offer.amount;
//     offerTransaction.activeOfferAmountUsd = offer.amountUsd;

//     offer.lastTransaction = offerTransaction.id;
//     offer.txCount = offer.txCount.plus(ONE);

//     buyerAccount.save();
//     sellerAccount.save();
//     swap.save();
//     offer.save();
//     offerTransaction.save();
//     token.save();

//     // if (sentByMinterEvent(event)) onMintWin(event, offer.amount);
//     // else if (sentBySellerEvent(event)) onSaleWin(event, offer.amount);
// }
