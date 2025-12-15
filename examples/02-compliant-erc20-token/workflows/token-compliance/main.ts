import {
  cre,
  Runner,
  type Runtime,
  consensusIdenticalAggregation,
  getNetwork,
  encodeCallMsg,
  bytesToHex,
  LATEST_BLOCK_NUMBER,
  hexToBase64,
  TxStatus,
} from "@chainlink/cre-sdk";
import { z } from "zod";
import { type Address, decodeFunctionResult, zeroAddress, encodeFunctionData, encodeAbiParameters } from "viem";
import { fetchBlacklist, type Blacklist } from "./lib/spreadsheet";
import { CompliantToken } from "./abi/CompliantToken";

const ConfigSchema = z.object({
  schedule: z.string().min(1, "Schedule is required"),
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  evms: z.array(
    z.object({
      tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
      chainSelectorName: z.string().min(1, "Chain selector name is required"),
      gasLimit: z.string(),
    })
  ),
});

type Config = z.infer<typeof ConfigSchema>;

type BlacklistDelta = {
  toAdd: Address[];
  toRemove: Address[];
};

const computeBlacklistDelta = (
  spreadsheet: Set<Address>,
  contract: Set<Address>
): BlacklistDelta => ({
  toAdd: [...spreadsheet].filter(addr => !contract.has(addr)),
  toRemove: [...contract].filter(addr => !spreadsheet.has(addr)),
});

const getSpreadsheetBlacklist = (runtime: Runtime<Config>): Set<Address> => {
  const httpClient = new cre.capabilities.HTTPClient();
  const spreadsheetId = runtime.config.spreadsheetId;

  const result = httpClient
    .sendRequest(runtime, fetchBlacklist, consensusIdenticalAggregation<Blacklist>())(spreadsheetId)
    .result();

  return new Set(result.addresses.map(a => a.toLowerCase() as Address));
};

const getContractBlacklist = (runtime: Runtime<Config>): Set<Address> => {
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  const result = evmClient
    .callContract(runtime, {
      call: encodeCallMsg({
        from: zeroAddress,
        to: evmConfig.tokenAddress as Address,
        data: encodeFunctionData({
          abi: CompliantToken,
          functionName: "blacklist",
        }),
      }),
      blockNumber: LATEST_BLOCK_NUMBER,
    })
    .result();

  const addresses = decodeFunctionResult({
    abi: CompliantToken,
    functionName: "blacklist",
    data: bytesToHex(result.data),
  });

  return new Set(addresses.map(a => a.toLowerCase() as Address));
};

const updateContractBlacklist = (runtime: Runtime<Config>, delta: BlacklistDelta): string => {
  const evmConfig = runtime.config.evms[0];
  const network = getNetwork({
    chainFamily: "evm",
    chainSelectorName: evmConfig.chainSelectorName,
    isTestnet: true,
  });

  if (!network) {
    throw new Error(`Network not found: ${evmConfig.chainSelectorName}`);
  }

  const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector);

  // Encode (toRemove[], toAdd[]) for _processReport
  const encodedPayload = encodeAbiParameters(
    [{ type: "address[]" }, { type: "address[]" }],
    [delta.toRemove, delta.toAdd]
  );

  // Generate signed report
  const reportResponse = runtime
    .report({
      encodedPayload: hexToBase64(encodedPayload),
      encoderName: "evm",
      signingAlgo: "ecdsa",
      hashingAlgo: "keccak256",
    })
    .result();

  runtime.log(`Publishing report to ${evmConfig.tokenAddress}`);


  const updateResult = evmClient
    .writeReport(runtime, {
      receiver: evmConfig.tokenAddress,
      report: reportResponse,
      gasConfig: {
        gasLimit: evmConfig.gasLimit,
      },
    })
    .result();

  if (updateResult.txStatus !== TxStatus.SUCCESS) {
    throw new Error(`Failed to write report: ${updateResult.errorMessage || updateResult.txStatus}`);
  }

  const txHash = bytesToHex(updateResult.txHash || new Uint8Array(32));
  runtime.log(`Transaction succeeded: ${txHash}`);

  return txHash;
};

const onCronTrigger = (runtime: Runtime<Config>): string => {
  runtime.log("Workflow triggered. Fetching blacklist...");

  // Step 1: Read current blacklist from spreadsheet
  const spreadsheetBlacklist = getSpreadsheetBlacklist(runtime);
  runtime.log(`Fetched ${spreadsheetBlacklist.size} blacklisted addresses from spreadsheet`);

  // Step 2: Read current blacklist from contract
  const contractBlacklist = getContractBlacklist(runtime);
  runtime.log(`Fetched ${contractBlacklist.size} blacklisted addresses from contract`);

  // Step 3: Compute delta between spreadsheet and contract
  const delta = computeBlacklistDelta(spreadsheetBlacklist, contractBlacklist);
  runtime.log(`Delta: ${delta.toAdd.length} to add, ${delta.toRemove.length} to remove`);

  // Step 4: Skip if no changes needed
  if (delta.toAdd.length === 0 && delta.toRemove.length === 0) {
    runtime.log("No changes needed, skipping report");
    return "no-op";
  }

  // Step 5: Update contract blacklist
  return updateContractBlacklist(runtime, delta);
};

const initWorkflow = (config: Config) => {
  const cron = new cre.capabilities.CronCapability();

  return [
    cre.handler(
      cron.trigger(
        { schedule: config.schedule }
      ), 
      onCronTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>({ configSchema: ConfigSchema });
  await runner.run(initWorkflow);
}

main();