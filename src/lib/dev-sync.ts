// Dev-only helper: when backend is unreachable in development, simulate a successful server response
// by creating a synthetic server product object (replacing local- ids) so the UI can treat it as synced.
import { Product } from '../types';

export function simulateServerCreatedProduct(local: Product): Product {
  // Create a synthetic 24-char hex id to mimic Mongo/ObjectID style used elsewhere
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const id = (hex() + hex() + hex()).slice(0, 24);
  const cloned: Product = { ...local, id };
  // remove _sync metadata when promoting to server product
  const maybe = cloned as unknown as Record<string, unknown>;
  if ('_sync' in maybe) delete maybe['_sync'];
  return cloned;
}
