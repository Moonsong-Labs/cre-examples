import { type Hex, isHex } from "viem";
import { z } from "zod";

export const hexSchema = z.string().refine((v) => isHex(v, { strict: true }), {
	message: "Expected 0x-hex",
}) as z.ZodType<Hex>;

const decimalString = z
	.string()
	.regex(/^\d+$/, { message: "Expected unsigned decimal string" });

export const irisDecodedMessageSchema = z
	.object({
		destinationDomain: decimalString,
	})
	.passthrough();

export const irisMessageSchema = z
	.object({
		message: hexSchema,
		eventNonce: z.union([decimalString, hexSchema]).optional(),
		attestation: z.union([hexSchema, z.literal("PENDING")]),
		decodedMessage: irisDecodedMessageSchema.nullable().optional(),
		cctpVersion: z
			.union([decimalString, z.number().int().nonnegative()])
			.optional(),
		status: z.string().optional(),
	})
	.passthrough();

export const irisResponseSchema = z.object({
	messages: z.array(irisMessageSchema),
});

export const irisErrorSchema = z.object({
	code: z.number().int(),
	message: z.string(),
});

export const evmTargetSchema = z.object({
	chainSelectorName: z.string(),
	domain: z.number().int().nonnegative(),
	gasLimit: decimalString.optional(),
});

export const detectorConfigSchema = z.object({
	schedule: z.string(),
	mailboxUrl: z.url(),
	evms: z.array(evmTargetSchema),
});

export const relayerConfigSchema = z.object({
	schedule: z.string().optional(),
	authorizedAddress: hexSchema.optional(),
	evms: z.array(evmTargetSchema),
});

export const relayInputSchema = z.object({
	destinationDomain: z.number().int().nonnegative(),
	message: hexSchema,
	attestation: hexSchema,
});

export type IrisAttestation = {
	attestation: Hex;
	message: Hex;
	destinationDomain?: number;
};

export type EvmTarget = z.infer<typeof evmTargetSchema>;
export type DetectorConfig = z.infer<typeof detectorConfigSchema>;
export type RelayerConfig = z.infer<typeof relayerConfigSchema>;
export type RelayInput = z.infer<typeof relayInputSchema>;
export type IrisResponse = z.infer<typeof irisResponseSchema>;
export type IrisMessage = z.infer<typeof irisMessageSchema>;

export type MailboxPayload = {
	burnTxHash: Hex;
	sourceDomain: number;
	depositor: Hex;
	destinationDomain: number;
	amount: string;
};
