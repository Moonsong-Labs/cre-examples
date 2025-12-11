import { cre, NodeRuntime, Runner, type Runtime} from "@chainlink/cre-sdk";
import { json as toJson } from "@chainlink/cre-sdk"


type Config = {
	schedule: string;
	irisUrl: string;
};

export interface IrisResponse {
  messages: IrisMessage[]
}

export interface IrisMessage {
  attestation: string
  message: string
  eventNonce: string
  cctpVersion: number
  status: string
  delayReason: any
}


const onCronTrigger = (runtime: Runtime<Config>): string => {
	runtime.log("Hello world! Workflow triggered.");
	return "Hello world!";
};

const fetchIrisAttestation = async (
	nodeRuntime: NodeRuntime,
): Promise<{ message: Hash; attestation: Hash }> => {
	const httpClient = new cre.capabilities.HTTPClient();

	// TODO: derive domain
	const domain = "0";
	const burnHash =
		"0xd47fba15747f389e59a73ed87e4c2424b7c80d96d3b9f2bd649a4b265150de1d";
	// TODO: derive burn hash
	const fullUrl = `${nodeRuntime.config.irisUrl}/messages/${domain}?transactionHash=${burnHash}`;
	// https://iris-api-sandbox.circle.com/v2/messages/0?transactionHash=0xd47fba15747f389e59a73ed87e4c2424b7c80d96d3b9f2bd649a4b265150de1d'
	const req = {
		url: fullUrl,
		method: "GET" as const,
		cache: "no-store",
	};	

	const resp = httpClient.sendRequest(nodeRuntime, req).result();

	nodeRuntime.log(`Iris response status: ${resp.statusCode}`);

	const {messages} = toJson(resp) as IrisResponse
	const {attestation, message} = messages[0]
	nodeRuntime.log(`Attestation: ${attestation}`);
	nodeRuntime.log(`Message: ${message}`);
	return { attestation, message };
};

const initWorkflow = (config: Config) => {
	const cron = new cre.capabilities.CronCapability();

	return [
		cre.handler(cron.trigger({ schedule: config.schedule }), onCronTrigger),
	];
};

export async function main() {
	const runner = await Runner.newRunner<Config>();
	await runner.run(initWorkflow);
}

main();
