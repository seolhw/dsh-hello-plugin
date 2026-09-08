//#region src/index.ts
const name = "dsh-talk-m02";
const inject = [];
/** Host half: proves the Loader imports the node side of a double-half package. */
function apply(ctx) {
	ctx.logger("m02").info("dsh-talk-m02 host half loaded");
}
//#endregion
export { apply, inject, name };
