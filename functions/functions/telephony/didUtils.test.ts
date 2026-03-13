// functions/telephony/didUtils.test.ts
// Unit tests for DID normalization utilities

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  buildNormalizedSipAccounts,
  findSipAccountByDid,
  generateDidVariants,
  normalizeNumber,
} from "./didUtils.ts";

// Test SIP_ACCOUNTS matching production configuration
const TEST_SIP_ACCOUNTS = {
  // AEVOICE.ai Admin/Main assistant
  "914024001355": { assistant_name: "AEVOICE.ai Admin/Main assistant" },
  "04024001355": { assistant_name: "AEVOICE.ai Admin/Main assistant" },
  // Vet N Pet assistant
  "914023186215": { assistant_name: "Vet N Pet assistant" },
  "04023186215": { assistant_name: "Vet N Pet assistant" },
};

Deno.test("normalizeNumber - removes non-digits", () => {
  assertEquals(normalizeNumber("+914024001355"), "914024001355");
  assertEquals(normalizeNumber("+91 402 400 1355"), "914024001355");
  assertEquals(normalizeNumber("(040) 2400-1355"), "04024001355");
  assertEquals(normalizeNumber("4024001355"), "4024001355");
});

Deno.test("normalizeNumber - handles null/undefined", () => {
  assertEquals(normalizeNumber(null), "");
  assertEquals(normalizeNumber(undefined), "");
  assertEquals(normalizeNumber(""), "");
});

Deno.test("generateDidVariants - E.164 format with country code 91", () => {
  const variants = generateDidVariants("914024001355");

  // Should include: full, local with 0, local without 0
  assertEquals(variants.includes("914024001355"), true);
  assertEquals(variants.includes("04024001355"), true);
  assertEquals(variants.includes("4024001355"), true);
});

Deno.test("generateDidVariants - local format with leading zero", () => {
  const variants = generateDidVariants("04024001355");

  // Should include: with 0, without 0, with country code
  assertEquals(variants.includes("04024001355"), true);
  assertEquals(variants.includes("4024001355"), true);
  assertEquals(variants.includes("914024001355"), true);
});

Deno.test("generateDidVariants - local format without leading zero", () => {
  const variants = generateDidVariants("4024001355");

  // Should include: without 0, with 0, with country code
  assertEquals(variants.includes("4024001355"), true);
  assertEquals(variants.includes("04024001355"), true);
  assertEquals(variants.includes("914024001355"), true);
});

Deno.test("buildNormalizedSipAccounts - creates lookup with all variants", () => {
  const normalized = buildNormalizedSipAccounts(TEST_SIP_ACCOUNTS);

  // All variants should map to the same assistant
  assertEquals(
    normalized["914024001355"]?.assistant_name,
    "AEVOICE.ai Admin/Main assistant",
  );
  assertEquals(
    normalized["04024001355"]?.assistant_name,
    "AEVOICE.ai Admin/Main assistant",
  );
  assertEquals(
    normalized["4024001355"]?.assistant_name,
    "AEVOICE.ai Admin/Main assistant",
  );
});

Deno.test("findSipAccountByDid - +914024001355 maps to AEVOICE.ai Admin/Main assistant", () => {
  const result = findSipAccountByDid("+914024001355", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "AEVOICE.ai Admin/Main assistant");
});

Deno.test("findSipAccountByDid - 914024001355 maps to AEVOICE.ai Admin/Main assistant", () => {
  const result = findSipAccountByDid("914024001355", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "AEVOICE.ai Admin/Main assistant");
});

Deno.test("findSipAccountByDid - 04024001355 maps to AEVOICE.ai Admin/Main assistant", () => {
  const result = findSipAccountByDid("04024001355", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "AEVOICE.ai Admin/Main assistant");
});

Deno.test("findSipAccountByDid - 4024001355 maps to AEVOICE.ai Admin/Main assistant (no leading zero)", () => {
  const result = findSipAccountByDid("4024001355", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "AEVOICE.ai Admin/Main assistant");
});

Deno.test("findSipAccountByDid - +914023186215 maps to Vet N Pet assistant", () => {
  const result = findSipAccountByDid("+914023186215", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "Vet N Pet assistant");
});

Deno.test("findSipAccountByDid - 914023186215 maps to Vet N Pet assistant", () => {
  const result = findSipAccountByDid("914023186215", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "Vet N Pet assistant");
});

Deno.test("findSipAccountByDid - 04023186215 maps to Vet N Pet assistant", () => {
  const result = findSipAccountByDid("04023186215", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "Vet N Pet assistant");
});

Deno.test("findSipAccountByDid - 4023186215 maps to Vet N Pet assistant (no leading zero)", () => {
  const result = findSipAccountByDid("4023186215", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "Vet N Pet assistant");
});

Deno.test("findSipAccountByDid - returns undefined for unknown number", () => {
  const result = findSipAccountByDid("9999999999", TEST_SIP_ACCOUNTS);
  assertEquals(result, undefined);
});

Deno.test("findSipAccountByDid - handles null/undefined", () => {
  assertEquals(findSipAccountByDid(null, TEST_SIP_ACCOUNTS), undefined);
  assertEquals(findSipAccountByDid(undefined, TEST_SIP_ACCOUNTS), undefined);
  assertEquals(findSipAccountByDid("", TEST_SIP_ACCOUNTS), undefined);
});

Deno.test("findSipAccountByDid - handles formatted numbers", () => {
  const result = findSipAccountByDid("+91 (40) 2400-1355", TEST_SIP_ACCOUNTS);
  assertEquals(result?.assistant_name, "AEVOICE.ai Admin/Main assistant");
});
