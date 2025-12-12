import { getAddress, isHex, type Address, type Hex } from "viem";
import { z } from "zod";

export const hexSchema = z
	.string()
	.refine((v) => isHex(v, { strict: true }), { message: "Expected 0x-hex" }) as z.ZodType<Hex>;

export const addressSchema = z
	.string()
	.transform((v, ctx) => {
		try {
			return getAddress(v);
		} catch {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Invalid EVM address",
			});
			return z.NEVER;
		}
	}) as z.ZodType<Address>;

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
		cctpVersion: z.union([decimalString, z.number().int().nonnegative()]).optional(),
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
	relayerAddress: addressSchema,
	gasLimit: decimalString.optional(),
});

export const creConfigSchema = z.object({
	schedule: z.string(),
	irisUrl: z.string().url(),
	evms: z.array(evmTargetSchema),
});

export type IrisAttestation = {
	attestation: Hex;
	message: Hex;
	destinationDomain?: number;
};

export type EvmTarget = z.infer<typeof evmTargetSchema>;
export type CREConfig = z.infer<typeof creConfigSchema>;
export type IrisResponse = z.infer<typeof irisResponseSchema>;
export type IrisMessage = z.infer<typeof irisMessageSchema>;
