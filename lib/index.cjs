Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let _deepseek_ai_schemastery = require("@deepseek-ai/schemastery");
_deepseek_ai_schemastery = __toESM(_deepseek_ai_schemastery, 1);
//#region src/index.ts
const name = "dsh-hello-plugin";
const Config = _deepseek_ai_schemastery.default.object({
	greeting: _deepseek_ai_schemastery.default.string().default("Hello"),
	maxRetries: _deepseek_ai_schemastery.default.number().default(3),
	verbose: _deepseek_ai_schemastery.default.boolean().default(false)
});
function apply(ctx, config) {
	console.log(config.greeting);
}
//#endregion
exports.Config = Config;
exports.apply = apply;
exports.name = name;
