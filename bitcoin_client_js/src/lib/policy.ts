import { crypto } from 'bitcoinjs-lib';

import { BufferWriter } from './buffertools';
import { hashLeaf, Merkle } from './merkle';

/**
 * The Bitcon hardware app uses a descriptors-like thing to describe
 * how to construct output scripts from keys. A "Wallet Policy" consists
 * of a "Descriptor Template" and a list of "keys". A key is basically
 * a serialized BIP32 extended public key with some added derivation path
 * information. This is documented at
 * https://github.com/LedgerHQ/app-bitcoin-new/blob/master/doc/wallet.md
 */
export class WalletPolicy {
  readonly name: string;
  readonly descriptorTemplate: string;
  readonly keys: readonly string[];
  /**
   * Creates and instance of a wallet policy.
   * @param name an ascii string, up to 16 bytes long; it must be an empty string for default wallet policies
   * @param descriptorTemplate the wallet policy template
   * @param keys and array of the keys, with the key derivation information
   */
  constructor(
    name: string,
    descriptorTemplate: string,
    keys: readonly string[]
  ) {
    this.name = name;
    this.descriptorTemplate = descriptorTemplate;
    this.keys = keys;
  }

  /**
   * Returns the unique 32-bytes id of this wallet policy.
   */
  getId(): Buffer {
    return crypto.sha256(this.serialize());
  }

  /**
   * Serializes the wallet policy for transmission via the hardware wallet protocol.
   * @returns the serialized wallet policy
   */
  serialize(): Buffer {
    const keyBuffers = this.keys.map((k) => {
      return Buffer.from(k, 'ascii');
    });
    const m = new Merkle(keyBuffers.map((k) => hashLeaf(k)));

    const buf = new BufferWriter();
    buf.writeUInt8(0x01); // wallet type (policy map) // TODO: support version 2 
    buf.writeVarSlice(Buffer.from(this.name, 'ascii'));
    buf.writeVarSlice(Buffer.from(this.descriptorTemplate, 'ascii'));
    buf.writeVarInt(this.keys.length);
    buf.writeSlice(m.getRoot());
    return buf.buffer();
  }
}

export type DefaultDescriptorTemplate =
  | 'pkh(@0)'
  | 'sh(wpkh(@0))'
  | 'wpkh(@0)'
  | 'tr(@0)';

/**
 * Simplified class to handle default wallet policies that can be used without policy registration.
 */
export class DefaultWalletPolicy extends WalletPolicy {
  constructor(descriptorTemplate: DefaultDescriptorTemplate, key: string) {
    super('', descriptorTemplate, [key]);
  }
}
