import {
	consensusIdenticalAggregation,
	cre,
	type EVMLog,
	getNetwork,
	hexToBase64,
	type NodeRuntime,
	Runner,
	type Runtime,
} from "@chainlink/cre-sdk";
import invariant from "tiny-invariant";
import {
	bytesToHex,
	decodeEventLog,
	type Hex,
	keccak256,
	pad,
	toHex,
} from "viem";
import {
	type DetectorConfig,
	type Domain,
	ENVIRONMENT_INFO,
	MAILBOX_API_KEY_SECRET,
	type MailboxPayload,
	TOKEN_MESSENGER_V2_TESTNET,
	tokenMessengerV2Abi,
} from "../common";

const onLogTrigger = (
	runtime: Runtime<DetectorConfig>,
	log: EVMLog,
	sourceDomain: Domain,
): MailboxPayload => {
	runtime.log("Detector workflow triggered.");
	const rawTopics = log.topics.map((t) => bytesToHex(t));
	const burnTxHash = bytesToHex(log.txHash);

	const event = decodeEventLog({
		abi: tokenMessengerV2Abi,
		data: bytesToHex(log.data),
		eventName: "DepositForBurn",
		topics: rawTopics as [Hex, ...Hex[]],
	});

	runtime.log(
		`Detected DepositForBurn: depositor=${event.args.depositor}, amount=${event.args.amount}, dest=${event.args.destinationDomain}`,
	);

	const payload: MailboxPayload = {
		burnTxHash,
		sourceDomain,
		depositor: event.args.depositor,
		destinationDomain: event.args.destinationDomain,
		amount: event.args.amount.toString(),
	};

	postToMailbox(runtime, payload);

	return payload;
};

const postToMailbox = (
	runtime: Runtime<DetectorConfig>,
	payload: MailboxPayload,
): number => {
	const apiKey = runtime
		.getSecret({ id: MAILBOX_API_KEY_SECRET })
		.result().value;
	return runtime
		.runInNodeMode(postToMailboxInner, consensusIdenticalAggregation())(
			payload,
			apiKey,
		)
		.result();
};

const postToMailboxInner = (
	nodeRuntime: NodeRuntime<DetectorConfig>,
	payload: MailboxPayload,
	apiKey: string,
): number => {
	const httpClient = new cre.capabilities.HTTPClient();
	const query = `sourceDomain=${payload.sourceDomain}&depositor=${payload.depositor}`;
	const url = `${nodeRuntime.config.mailboxUrl}/${payload.burnTxHash}?${query}`;

	nodeRuntime.log(`Posting to mailbox: ${url}`);

	const req = {
		url,
		method: "POST" as const,
		headers: {
			"X-API-Key": apiKey,
		},
	};

	const resp = httpClient.sendRequest(nodeRuntime, req).result();

	if (resp.statusCode >= 200 && resp.statusCode < 300) {
		nodeRuntime.log(`Mailbox accepted request: ${resp.statusCode}`);
	} else {
		nodeRuntime.log(`Mailbox returned error: ${resp.statusCode}`);
	}

	return resp.statusCode;
};

const initWorkflow = (config: DetectorConfig) =>
	config.evms.map(({ chainSelectorName, domain }) => {
		const network = getNetwork({
			chainFamily: "evm",
			chainSelectorName,
			isTestnet: true,
		});
		invariant(network, `Network not found for ${chainSelectorName}`);

		const evmClient = new cre.capabilities.EVMClient(
			network.chainSelector.selector,
		);
		const sourceDomain = domain as Domain;
		const env = ENVIRONMENT_INFO[sourceDomain];
		invariant(env, `Unsupported domain ${domain} for ${chainSelectorName}`);

		const depositForBurnEventHash = keccak256(
			toHex(
				"DepositForBurn(address,uint256,address,bytes32,uint32,bytes32,bytes32,uint256,uint32,bytes)",
			),
		);
		const topic1 = pad(env.usdcAddress);

		return cre.handler(
			evmClient.logTrigger({
				addresses: [hexToBase64(TOKEN_MESSENGER_V2_TESTNET)],
				confidence: "CONFIDENCE_LEVEL_LATEST",
				topics: [
					{
						values: [hexToBase64(depositForBurnEventHash)],
					},
					{
						values: [hexToBase64(topic1)],
					},
				],
			}),
			(runtime: Runtime<DetectorConfig>, log: EVMLog) =>
				onLogTrigger(runtime, log, sourceDomain),
		);
	});

export async function main() {
	const runner = await Runner.newRunner<DetectorConfig>();
	await runner.run(initWorkflow);
}

main();
