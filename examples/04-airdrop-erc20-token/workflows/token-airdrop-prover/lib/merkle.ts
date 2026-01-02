import { MerkleTree } from "merkletreejs";
import {
	type Address,
	encodeAbiParameters,
	type Hex,
	keccak256,
	toBytes,
	toHex,
} from "viem";
import type { AllocationEntry } from "./spreadsheet";

export type MerkleProof = {
	address: Address;
	amount: string;
	proof: Hex[];
};

export type MerkleTreeData = {
	root: Hex;
	proofs: MerkleProof[];
};

// OZ StandardMerkleTree leaf: keccak256(keccak256(abi.encode(address, uint256)))
const hashLeaf = (address: Address, amount: bigint): Hex =>
	keccak256(
		keccak256(
			encodeAbiParameters(
				[{ type: "address" }, { type: "uint256" }],
				[address, amount],
			),
		),
	);

export const buildMerkleTree = (entries: AllocationEntry[]): MerkleTreeData => {
	if (entries.length === 0) {
		return { root: `0x${"0".repeat(64)}` as Hex, proofs: [] };
	}

	const leaves = entries.map((e) =>
		hashLeaf(e.address as Address, BigInt(e.amount)),
	);
	const leafBytes = leaves.map((leaf) => toBytes(leaf));
	const tree = new MerkleTree(leafBytes, keccak256, { sortPairs: true });

	return {
		root: toHex(tree.getRoot()),
		proofs: entries.map((entry, i) => ({
			address: entry.address as Address,
			amount: entry.amount,
			proof: tree.getProof(leafBytes[i] as Buffer).map((p) => toHex(p.data)),
		})),
	};
};
