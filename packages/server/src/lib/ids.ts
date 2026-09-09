// ================================================================
// 随机码生成（Nano ID）
// 字母表只用数字 + 大小写字母，不含任何特殊符号（`-`、`_` 等一律不出现）。
// - newId：实体主键（社区/频道/消息…），默认 21 位（约 126 bit 熵）
// - newInviteCode：邀请码，大写字母 + 数字，默认 8 位，便于口播/输入
// - newSlug：社区短标识，数字 + 大小写字母，8 位，无符号（URL 友好）
// ================================================================

import { customAlphabet } from "nanoid";

const ALPHABET_ALNUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ALPHABET_UPPER_DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 实体主键：数字 + 大小写字母，21 位 */
export const newId = customAlphabet(ALPHABET_ALNUM, 21);

/** 社区邀请码：数字 + 大写字母，8 位 */
export const newInviteCode = customAlphabet(ALPHABET_UPPER_DIGITS, 8);

/** 社区短标识：数字 + 大小写字母，8 位（无任何符号） */
export const newSlug = customAlphabet(ALPHABET_ALNUM, 8);
