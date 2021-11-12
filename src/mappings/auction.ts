import { Bytes, ethereum } from '@graphprotocol/graph-ts';
import { log } from '@graphprotocol/graph-ts';
// import { Account, Auction, Bid, BidTransaction, Market } from '../generated/local/schema';
import { Market, Auction, Bid, BidTransaction, Account, Token } from './../generated/local/schema';
import { BigInt, BigDecimal, TypedMap, Address } from '@graphprotocol/graph-ts';
import { toUsd } from './oracle';
import { Launched, BidPlaced, NormalClaim, WinningClaim } from '../generated/local/NuggMinter/NuggMinter';
import { afterEveryEvent, onEveryEvent, onMintBid, onMintWin, onSaleBid, onSaleWin } from './intervals';
import { SaleStart, SaleStop } from '../generated/local/NuggSeller/NuggSeller';

export const MARKET_ID = '42069';

export const ADDRESS_ZERO = Address.fromString('0x0000000000000000000000000000000000000000');
export const ADDRESS_NULL = Address.fromString('0x0000000000000000000000000000000000000001');

export const Q256 = BigInt.fromI32(2).pow(255);
export const Q128 = BigInt.fromI32(2).pow(128);

export const ZERO = BigInt.fromI32(0);
export const ONE = BigInt.fromI32(1);
export const THREE = BigInt.fromI32(3);
export const ONEe18 = BigInt.fromString('1000000000000000000');

export const THREE_THOUSAND = BigInt.fromI32(3).times(BigInt.fromI32(1000)).times(ONEe18);

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

        market.minter = account1.id;
        market.seller = account1.id;

        market.save();
    }
    log.info('safeCreateMarket end', []);

    return market as Market;
}

function safeLoadBid(auction: Auction, account: Account): Bid {
    log.info('safeLoadBid start', []);

    let bid = Bid.load(getBidId(auction, account));
    if (bid === null) {
        log.error('Tried query bid that does not exist ', []);
    }
    log.info('safeLoadBid end', []);

    return bid as Bid;
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

function safeLoadAuction(id: string): Auction {
    log.info('safeLoadAuction start', []);

    let auction = Auction.load(id);
    if (auction === null) {
        log.error('Tried query auction that does not exist ', []);
    }
    log.info('safeLoadAuction end', []);

    return auction as Auction;
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

export function safeCreateToken(id: string): Token {
    log.info('safeCreateToken start', []);

    let token = Token.load(id);
    if (token === null) {
        token = new Token(id);
        token.id = id;
        token.market = MARKET_ID;
        token.owner = ADDRESS_ZERO.toHexString();
        token.auctionsCount = ZERO;
        // token.mintAuction = 'MINT-'.concat(id);
        // token.lastAuction = 'MINT-'.concat(id);
        token.save();
    }
    log.info('safeCreateToken end', []);

    return token as Token;
}

export function safeCreateAuction(event: ethereum.Event, epoch: BigInt, tokenId: string): Auction {
    log.info('safeCreateAuction start', []);

    let id = getAuctionId(epoch, event);
    let token = safeCreateToken(tokenId);

    let zero = safeCreateAccount(ADDRESS_ZERO.toHexString());

    let auction = Auction.load(id);
    if (auction === null) {
        auction = new Auction(id);
        auction.id = id;
        auction.amount = ZERO;
        auction.amountUsd = ZERO;

        auction.epoch = epoch;
        auction.market = MARKET_ID;
        auction.token = token.id;
        auction.seller = ADDRESS_ZERO.toHexString();
        // auction.buyer = ADDRESS_NULL.toHexString();

        auction.sold = false;
        auction.finalized = false;
        auction.startblock = ZERO;
        auction.endblock = ZERO;
        auction.floor = ZERO;
        auction.mint = true;
        auction.bidCount = ZERO;
        auction.save();

        token.auctionsCount = token.auctionsCount.plus(ONE);
        token.mintAuction = auction.id;
        token.lastAuction = auction.id;
        token.save();

        zero.totalTokens = zero.totalTokens.plus(ONE);
        zero.save();
    }
    log.info('safeCreateAuction end', []);

    return auction as Auction;
}

export function getBidId(auction: Auction, account: Account): string {
    return auction.id.concat('-').concat(account.id);
}

export function sentByMinterEvent(event: ethereum.Event): boolean {
    let market = safeCreateMarket(event);
    return sentByMinter(event.address, market.minter);
}

export function sentBySellerEvent(event: ethereum.Event): boolean {
    let market = safeCreateMarket(event);
    return sentBySeller(event.address, market.seller);
}

export function sentByMinter(check: Address, minter: string | null): boolean {
    if (minter !== null) {
        return check.equals(Address.fromString(minter));
    } else return false;
}

export function sentBySeller(check: Address, seller: string | null): boolean {
    if (seller !== null) {
        return check.equals(Address.fromString(seller));
    } else return false;
}

export function getAuctionId(num: BigInt, event: ethereum.Event): string {
    let market = safeCreateMarket(event);
    if (sentByMinterEvent(event)) return 'MINT-'.concat(num.toString());
    else if (sentBySellerEvent(event)) return 'SALE-'.concat(num.toString());
    else return 'OOPS-'.concat(num.toString());
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
        account.totalBids = ZERO;
        account.totalTokens = ZERO;
        account.totalSwaps = ZERO;
        // account.address = Address.fromString(id).to;
        account.save();

        let market = safeLoadMarket(MARKET_ID);
        market.totalUsers = market.totalUsers.plus(ONE);
        market.save();
    }
    log.info('safeCreateAccount end', []);

    return account as Account;
}

function safeCreateBid(auction: Auction, account: Account): Bid {
    log.info('safeCreateBid start', []);

    let id = getBidId(auction, account);
    let bid = Bid.load(id);
    if (bid === null) {
        bid = new Bid(id);
        bid.id = id;
        bid.auction = auction.id;
        bid.account = account.id;
        bid.amount = ZERO;
        bid.amountUsd = ZERO;
        bid.claimed = false;
        bid.txCount = ZERO;
        bid.save();
        account.totalBids = account.totalBids.plus(ONE);
        account.save();
    }
    log.info('safeCreateBid end', []);

    return bid;
}

export function handleLaunchedMinter(event: Launched): void {
    log.info('handleLaunchedMinter start', []);
    let market = safeCreateMarket(event);

    let account = safeCreateAccount(event.address.toHexString());
    account.save();

    market.minter = account.id;

    market.save();
    log.info('handleLaunchedSeller end', []);
}

export function handleLaunchedSeller(event: Launched): void {
    log.info('handleLaunchedSeller start', []);
    let market = safeCreateMarket(event);

    let account = safeCreateAccount(event.address.toHexString());
    account.save();

    market.seller = account.id;

    log.info('handleLaunchedSeller end', []);
    market.save();
}

export function handleSaleStart(event: SaleStart): void {
    let id = getAuctionId(event.params.saleId, event);
    // let auction = Auction.load(id);
    let market = safeLoadMarket(MARKET_ID);
    let seller = safeCreateAccount(event.transaction.from.toHexString());

    let token = Token.load(event.params.tokenId.toString()) as Token;

    let auction = new Auction(id);
    auction.amount = ZERO;
    auction.amountUsd = ZERO;
    auction.epoch = event.params.saleId;
    auction.market = market.id;
    auction.token = event.params.tokenId.toString();
    auction.seller = seller.id;

    auction.sold = false;
    auction.finalized = false;
    auction.startblock = event.block.number;
    auction.endblock = event.block.number.plus(event.params.floor);
    auction.floor = event.params.length;
    auction.mint = false;
    auction.activeMarket = market.id;
    auction.bidCount = ZERO;

    auction.save();

    token.auctionsCount = token.auctionsCount.plus(ONE);
    token.lastAuction = auction.id;
    // let seller = market.seller;
    // if (seller !== null) token.owner = seller;

    token.save();
}

export function handleSaleStop(event: SaleStop): void {
    let id = getAuctionId(event.params.saleId, event);
    let auction = safeLoadAuction(id);
    // let token = safeCreateToken(auction.token);

    // auction.activeMarket = null;
    auction.finalized = true;
    // token.owner = auction.seller;
    auction.save();
}

export function handleBidPlaced(event: BidPlaced): void {
    let auction = sentByMinterEvent(event)
        ? safeCreateAuction(event, event.params.epoch, event.params.epoch.toString())
        : safeLoadAuction(getAuctionId(event.params.epoch, event));

    let account = safeCreateAccount(event.params.user.toHexString());
    // let token = safeCreateToken(auction.token);
    let bid = safeCreateBid(auction, account);

    let id = event.transaction.hash.toHexString();
    let bidTransaction = new BidTransaction(id);
    bidTransaction.bid = bid.id;
    bidTransaction.amount = event.params.amount.minus(bid.amount);
    bidTransaction.amountUsd = toUsd(bidTransaction.amount);
    bidTransaction.currency = BigInt.fromI32(event.params.currency);
    bidTransaction.blockNumber = event.block.number;
    bidTransaction.index = bid.txCount;
    bidTransaction.timestamp = event.block.timestamp;

    bidTransaction.claim = false;
    bidTransaction.winning = sentByMinterEvent(event);
    // buyer.totalTokens = buyer.totalTokens.plus(ONE);

    bid.amount = bid.amount.plus(bidTransaction.amount);
    bid.amountUsd = bid.amountUsd.plus(toUsd(bidTransaction.amount));
    bid.lastTransaction = bidTransaction.id;
    bid.txCount = bid.txCount.plus(ONE);

    if (bid.txCount.equals(ONE)) auction.bidCount = auction.bidCount.plus(ONE);
    auction.amount = bid.amount;
    auction.amountUsd = bid.amountUsd;
    auction.top = bid.id;

    // snapshot
    bidTransaction.activeBidAmount = bid.amount;
    bidTransaction.activeBidAmountUsd = bid.amountUsd;

    auction.save();
    bid.save();
    bidTransaction.save();

    if (sentByMinterEvent(event)) onMintBid(event, bid.amount);
    else if (sentBySellerEvent(event)) onSaleBid(event, bid.amount);
}

export function handleNormalClaim(event: NormalClaim): void {
    let market = safeCreateMarket(event);
    let auction = safeLoadAuction(getAuctionId(event.params.epoch, event));
    let account = safeLoadAccount(event.params.user.toHexString());
    let bid = safeLoadBid(auction, account);

    bid.claimed = true;
    // auction.activeMarket = null;

    let id = event.transaction.hash.toHexString();
    let bidTransaction = new BidTransaction(id);
    bidTransaction.id = id;
    bidTransaction.bid = bid.id;

    bidTransaction.amount = event.params.amount;
    bidTransaction.amountUsd = toUsd(bidTransaction.amount);

    bidTransaction.currency = BigInt.fromI32(event.params.currency);
    bidTransaction.blockNumber = event.block.number;
    bidTransaction.timestamp = event.block.timestamp;

    bidTransaction.index = auction.bidCount;
    bidTransaction.claim = true;
    bidTransaction.winning = false;

    bidTransaction.activeBidAmount = bid.amount;
    bidTransaction.activeBidAmountUsd = bid.amountUsd;
    bid.txCount = bid.txCount.plus(ONE);
    bid.lastTransaction = bidTransaction.id;

    account.save();
    auction.save();
    bid.save();
    bidTransaction.save();
}

export function handleWinningClaim(event: WinningClaim): void {
    let auction = safeLoadAuction(getAuctionId(event.params.epoch, event));
    log.info('safeCreateAccount start', [auction.id.toString()]);

    let token = safeCreateToken(auction.token);
    let buyerAccount = safeLoadAccount(event.params.user.toHexString());
    let sellerAccount = safeLoadAccount(event.params.user.toHexString());

    let bid = safeLoadBid(auction, buyerAccount);

    bid.claimed = true;
    auction.finalized = true;
    // token.owner = bid.account;
    auction.buyer = buyerAccount.id;
    auction.activeMarket = null;
    // buyerAccount.totalTokens = buyerAccount.totalTokens.plus(ONE);
    // sellerAccount.totalTokens = sellerAccount.totalTokens.minus(ONE);

    let id = event.transaction.hash.toString();
    let bidTransaction = new BidTransaction(id);
    bidTransaction.bid = bid.id;
    bidTransaction.amount = event.params.amount;
    bidTransaction.currency = THREE;
    bidTransaction.blockNumber = event.block.number;
    bidTransaction.timestamp = event.block.timestamp;

    bidTransaction.amountUsd = toUsd(bidTransaction.amount);
    bidTransaction.index = bid.txCount;
    bidTransaction.claim = true;
    bidTransaction.winning = true;

    bidTransaction.activeBidAmount = bid.amount;
    bidTransaction.activeBidAmountUsd = bid.amountUsd;

    bid.lastTransaction = bidTransaction.id;
    bid.txCount = bid.txCount.plus(ONE);

    buyerAccount.save();
    sellerAccount.save();
    auction.save();
    bid.save();
    bidTransaction.save();
    token.save();

    if (sentByMinterEvent(event)) onMintWin(event, bid.amount);
    else if (sentBySellerEvent(event)) onSaleWin(event, bid.amount);
}
