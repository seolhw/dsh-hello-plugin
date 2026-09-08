window.__ModuleLoader__.load({
	id: "dsh-talk-m02",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/index.ts
		const name = "dsh-talk-m02";
		const inject = ["slots", "locale"];
		const NS = "talk-m02";
		function FooterAction(_props) {
			return (0, react.createElement)("button", { "data-talk-m02": "entry" }, "Talk (M02)");
		}
		function apply(ctx) {
			document.documentElement.dataset.talkM02 = "loaded";
			ctx.effect(() => ctx.locale.register(NS, {
				zh: { entry: "社区 (M02)" },
				en: { entry: "Talk (M02)" }
			}), "m02: dictionaries");
			ctx.effect(() => ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "talk-m02-entry",
				order: 10,
				locale: NS
			}, FooterAction)), "m02: sidebar entry");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
