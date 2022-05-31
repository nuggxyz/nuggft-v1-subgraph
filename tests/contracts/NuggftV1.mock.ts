import { Address, ethereum, BigInt, Bytes, log } from '@graphprotocol/graph-ts';
import { createMockedFunction, newMockEvent } from 'matchstick-as';
import { Genesis } from '../../generated/NuggftV1/NuggftV1';
import { addrs, addr_i, b32toBigEndian } from '../../mappings/utils';

// const NUGGFT_ADDRESS = ethereum.Value.fromAddress(
//     addr_i(b32toBigEndian(Bytes.fromHexString('0xab56902504605831cddef3948e09e544256763da'))),
// );

// export const mock__function__imageSVG = (nuggId: string): void => {
//     createMockedFunction(NUGGFT_ADDRESS, 'imageSVG', 'imageSVG(uint256):(string)')
//         .withArgs([ethereum.Value.fromSignedBigInt(BigInt.fromString(nuggId))])
//         .returns([
//             ethereum.Value.fromString(
//                 `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 255 255" ><g class="DN" transform="scale(7.25714) translate(111.000,110.000)" transform-origin="center center"><path stroke="#fcf016" d="M0 0h4M16 0h4M30 0h2M2 1h4M14 1h8M28 1h3M4 2h5M12 2h11M26 2h4M5 3h5M11 3h13M26 3h3M2 4h8M11 4h4M16 4h8M25 4h6M4 5h6M12 5h2M16 5h2M21 5h2M26 5h6M5 6h4M22 6h1M26 6h3M31 6h2M3 7h3M28 7h2M2 8h2M29 8h2M1 9h2M30 9h1M1 10h1"></path><path stroke="#FFF" d="M7 0h2M10 0h1M23 0h1M8 1h3M23 1h1M25 1h2M9 2h2M23 2h3M10 3h1M24 3h2M10 4h1M24 4h1M10 5h1M24 5h2M12 11h1M23 11h1M12 12h2M15 12h1M20 12h1M22 12h2M13 13h3M20 13h3M15 19h5M14 20h2M19 20h2M14 21h3M18 21h3M14 22h6M15 23h4M20 23h1M14 24h1M16 24h3M20 24h1M17 25h4M15 26h1M18 26h1M20 26h1M18 27h3M16 28h1M16 29h1M19 29h1M19 30h1M18 31h2M18 32h1M17 33h1M16 34h1M14 35h1M16 35h1"></path><path stroke="#df7126" d="M15 4h1M11 5h1M23 5h1M14 6h1M20 6h1M23 6h1M11 8h1M25 9h1M9 10h1M25 16h1M10 19h1M24 19h1M11 20h1M22 20h1M24 20h1M11 21h1M22 22h1M12 23h1"></path><path stroke="#f9b042" d="M14 5h1M19 5h1M13 6h1M17 6h1M11 7h2M14 7h1M16 7h1M19 7h3M23 7h1M13 8h8M22 8h1M12 9h10M11 10h1M14 10h7M24 10h1M10 11h2M17 11h2M17 12h3M24 12h1M10 13h3M16 13h4M23 13h2M10 14h1M12 14h12M10 15h15M12 16h12M12 17h11M13 18h3M18 18h1M20 18h4M12 19h2M21 19h3M22 21h1M13 22h1M11 23h1M13 25h1"></path><path stroke="#f19325" d="M15 5h1M20 5h1M18 6h2M13 7h1M24 7h1M21 8h1M11 9h1M10 10h1M9 11h1M25 11h1M10 12h1M25 14h1M11 16h1M10 17h1M23 17h1M12 18h1M13 23h1M22 23h1M13 24h1"></path><path stroke="#f49f35" d="M18 5h1M15 6h2M15 7h1M17 7h2M22 7h1M22 9h1"></path><path stroke="#8f563b" d="M10 6h2M24 6h1M10 7h1M10 8h1M25 8h1M9 9h1M24 9h1M25 10h1M8 11h1M26 11h1M8 12h1M26 12h1M8 13h2M25 13h2M8 14h1M9 16h1M24 16h1M9 17h1M25 17h1M9 18h2M24 18h1M9 19h1M11 19h1M10 20h1M23 20h1M10 21h1M12 22h1M12 24h1M14 25h1"></path><path stroke="#f7cc8b" d="M12 6h1M21 6h1M12 8h1M23 8h2M10 9h1M26 10h1M24 11h1M9 12h1M11 12h1M25 12h1M9 14h1M11 14h1M24 14h1M26 14h1M9 15h1M25 15h2M10 16h1M11 17h1M24 17h1M11 18h1M12 20h1M12 21h1"></path><path stroke="#c16437" d="M9 8h1M8 10h1M8 15h1M23 21h1M11 22h1M23 22h1"></path><path stroke="#000" d="M23 9h1M12 10h2M21 10h3M13 11h4M19 11h4M14 12h1M16 12h1M21 12h1"></path><path stroke="#d8dee9" d="M16 18h2M19 18h1M14 19h1M20 19h1M13 20h1M21 20h1M13 21h1M21 21h1M20 22h2M14 23h1M19 23h1M21 23h1M15 24h1M19 24h1M21 24h2M15 25h2M22 25h1M16 26h1M19 26h1M21 26h2M16 27h2M21 27h1M17 28h1M19 28h1M21 28h1M17 29h1M20 29h2M17 30h1M20 30h1M17 31h1M20 31h1M16 32h2M19 32h2M16 33h1M18 33h2M15 34h1M17 34h2M15 35h1M17 35h1"></path><path stroke="#852626" d="M16 20h3M17 21h1"></path><path stroke="#c8d2dc" d="M21 25h1M17 26h1M18 28h1M20 28h1M18 29h1M18 30h1"></path></g></svg>`,
//             ),
//         ]);
// };

// // { [key in keyof Receive__Params]: Receive__Params[key] }
// export function createEvent(eth: BigInt, receiver: Address): Receive {
//     let event = changetype<Receive>(newMockEvent());

//     return event;
// }
