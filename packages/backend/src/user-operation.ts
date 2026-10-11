import { parseAbiItem, parseEventLogs, type Hex, type TransactionReceipt } from 'viem';
import { entryPoint06Address, entryPoint07Address, entryPoint08Address } from 'viem/account-abstraction';
import type { chainClient } from '../../chain/src/client.js';
import { ApiError } from './security.js';

const entryPoints = [entryPoint06Address, entryPoint07Address, entryPoint08Address];
export const operationEvent = parseAbiItem('event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)');
export const beforeExecutionEvent = parseAbiItem('event BeforeExecution()');

// Verify the provider-bound operation inside a bundled receipt. Events from a
// different operation, or from account validation before execution, cannot prove it.
export function operationExecution(receipt: TransactionReceipt, operationHash: Hex, sender: string) {
  const logs = receipt.logs.filter(log => entryPoints.some(address => address.toLowerCase() === log.address.toLowerCase()));
  const operations = parseEventLogs({ abi: [operationEvent], logs, strict: true });
  const matches = operations.filter(log => log.args.userOpHash.toLowerCase() === operationHash.toLowerCase());
  const operation = matches[0];
  if (matches.length !== 1 || !operation || operation.args.sender.toLowerCase() !== sender.toLowerCase()) throw new ApiError(409, 'USER_OPERATION_MISMATCH_RECONCILE');
  const execution = parseEventLogs({ abi: [beforeExecutionEvent], logs, strict: true });
  const preceding = [...operations, ...execution].filter(log => log.address.toLowerCase() === operation.address.toLowerCase() && log.logIndex < operation.logIndex);
  if (!preceding.length) throw new ApiError(409, 'USER_OPERATION_BOUNDARY_UNPROVED');
  const boundary = Math.max(...preceding.map(log => log.logIndex));
  return { succeeded: operation.args.success, logIndex: operation.logIndex, entryPoint: operation.address, logs: receipt.logs.filter(log => log.logIndex > boundary && log.logIndex < operation.logIndex) };
}

// Recovery is deliberately bounded: newest first, at most 2,000 recent blocks,
// 100 per RPC query (the measured provider limit), and a 20-second budget between
// queries. An in-flight call remains bounded by the existing RPC transport timeout.
// A miss/outage preserves the original request; it never authorizes resubmission.
export async function findOperationReceipt(client: ReturnType<typeof chainClient>['client'], operationHash: Hex, sender: string) {
  const head = await client.getBlock();
  const floor = head.number > 1999n ? head.number - 1999n : 0n;
  const deadline = Date.now() + 20_000;
  for (let end = head.number; end >= floor && Date.now() < deadline;) {
    const start = end - floor >= 99n ? end - 99n : floor;
    const logs = await client.getLogs({ address: entryPoints, event: operationEvent, args: { userOpHash: operationHash }, fromBlock: start, toBlock: end, strict: true });
    if (logs.length) {
      if (logs.length !== 1) throw new ApiError(409, 'USER_OPERATION_MISMATCH_RECONCILE');
      const log = logs[0]!;
      const receipt = await client.getTransactionReceipt({ hash: log.transactionHash });
      if (receipt.transactionHash.toLowerCase() !== log.transactionHash.toLowerCase() || receipt.blockHash !== log.blockHash || receipt.blockNumber !== log.blockNumber) throw new ApiError(409, 'NONCANONICAL_RECEIPT_RECONCILE');
      const execution = operationExecution(receipt, operationHash, sender);
      if (execution.logIndex !== log.logIndex || execution.entryPoint.toLowerCase() !== log.address.toLowerCase()) throw new ApiError(409, 'USER_OPERATION_MISMATCH_RECONCILE');
      return receipt;
    }
    if (start === floor) break;
    end = start - 1n;
  }
  return null;
}
