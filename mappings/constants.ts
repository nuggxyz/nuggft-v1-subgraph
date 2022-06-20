import { log, BigInt, store, Bytes } from '@graphprotocol/graph-ts';
import { bigi } from './utils';

export const LIQUDATION_PERIOD = bigi(200);
export const LOSS = bigi(10).pow(8);
