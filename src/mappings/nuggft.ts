import { Transfer } from '../generated/local/NuggFT/NuggFT';
import { ADDRESS_ZERO, getTokenId, ONE, safeCreateAccount, safeCreateToken } from './nuggswap';

export function handleTransfer(event: Transfer): void {
    let token = safeCreateToken(getTokenId(event.address, event.params.tokenId));
    let seller = safeCreateAccount(event.params.from.toHexString());
    let buyer = safeCreateAccount(event.params.to.toHexString());

    seller.totalTokens = seller.totalTokens.minus(ONE);
    buyer.totalTokens = buyer.totalTokens.plus(ONE);

    token.owner = buyer.id;

    token.save();
    seller.save();
    buyer.save();
}
