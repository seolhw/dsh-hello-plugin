window.__ModuleLoader__.load({
	id: "dsh-talk",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region packages/client/src/config.ts
		var HostConfigError = class extends Error {
			status;
			constructor(message, status) {
				super(message);
				this.status = status;
			}
		};
		async function hostFetch(input, init) {
			const res = await fetch(input, init);
			const text = await res.text();
			if (!res.ok) {
				let message = text;
				try {
					const data = JSON.parse(text);
					if (typeof data.message === "string" && data.message.length > 0) message = data.message;
				} catch {}
				throw new HostConfigError(message, res.status);
			}
			return text.length > 0 ? JSON.parse(text) : {};
		}
		function hostConfigGet() {
			return hostFetch("/api/talk/config");
		}
		function hostConfigSet(patch) {
			return hostFetch("/api/talk/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(patch)
			});
		}
		//#endregion
		//#region packages/client/src/server.ts
		var ServerApiError = class extends Error {
			status;
			code;
			requestId;
			details;
			constructor(status, code, message, requestId, details) {
				super(message);
				this.status = status;
				this.code = code;
				this.requestId = requestId;
				this.details = details;
			}
		};
		const errorMessage = (data, text) => data?.message ?? (text.length > 0 ? text : "request failed");
		var ServerClient = class {
			baseUrl;
			token;
			constructor(baseUrl, token = null) {
				this.baseUrl = baseUrl.replace(/\/+$/, "");
				this.token = token;
			}
			get hasToken() {
				return this.token !== null && this.token.length > 0;
			}
			setToken(token) {
				this.token = token;
			}
			url(path) {
				return `${this.baseUrl}${path}`;
			}
			async call(method, path, body, auth = false) {
				const headers = {};
				if (body !== void 0) headers["content-type"] = "application/json";
				if (auth && this.hasToken) headers.authorization = `Bearer ${this.token}`;
				const init = {
					method,
					headers
				};
				if (body !== void 0) init.body = JSON.stringify(body);
				const res = await fetch(this.url(path), init);
				const text = await res.text();
				let data = null;
				if (text.length > 0) try {
					data = JSON.parse(text);
				} catch {
					data = null;
				}
				if (!res.ok) {
					const err = data;
					throw new ServerApiError(res.status, err?.code ?? "INTERNAL", errorMessage(err, text), err?.requestId, err?.details);
				}
				return data;
			}
			/** POST /api/auth/exchange-invite —— 平台注册码换令牌（无需鉴权） */
			exchangeInvite(body) {
				return this.call("POST", "/api/auth/exchange-invite", body);
			}
			/** GET /api/auth/me —— 当前用户 */
			me() {
				return this.call("GET", "/api/auth/me", void 0, true);
			}
			/** GET /api/communities/mine —— 我加入的社区 */
			myCommunities() {
				return this.call("GET", "/api/communities/mine", void 0, true);
			}
		};
		//#endregion
		//#region packages/client/src/store.ts
		let state = {
			open: false,
			busy: false,
			phase: "booting",
			settings: null,
			me: null,
			communities: [],
			error: ""
		};
		const listeners = /* @__PURE__ */ new Set();
		function setState(patch) {
			state = {
				...state,
				...patch
			};
			for (const listener of listeners) listener();
		}
		function makeServer(settings) {
			return new ServerClient(settings.serverUrl, settings.token);
		}
		const errorText = (error) => error instanceof Error ? error.message : String(error);
		/** React hook：订阅 UI store。 */
		function useTalkState() {
			const [, force] = (0, react.useReducer)((x) => x + 1, 0);
			(0, react.useEffect)(() => {
				listeners.add(force);
				return () => {
					listeners.delete(force);
				};
			}, []);
			return state;
		}
		function openTalk() {
			if (!state.open) {
				setState({ open: true });
				refresh();
			} else setState({ open: false });
		}
		function closeTalk() {
			setState({ open: false });
		}
		/** 重取：host 配置 → 有 token 就拉 Server 身份 + 我的社区。 */
		async function refresh() {
			setState({
				phase: "booting",
				busy: true,
				error: ""
			});
			try {
				const settings = await hostConfigGet();
				if (settings.token.length === 0 || settings.handle.length === 0) {
					setState({
						phase: "anon",
						busy: false,
						settings
					});
					return;
				}
				const server = makeServer(settings);
				setState({
					phase: "ready",
					busy: false,
					settings,
					me: await server.me(),
					communities: await server.myCommunities()
				});
			} catch (error) {
				setState({
					phase: "error",
					busy: false,
					error: errorText(error)
				});
			}
		}
		/** 平台注册码 → Server 换令牌 → 回写 host 配置 → 拉我的社区。 */
		async function registerIdentity(input) {
			setState({
				busy: true,
				error: ""
			});
			try {
				const server = makeServer(await hostConfigGet());
				const res = await server.exchangeInvite({
					inviteCode: input.inviteCode,
					handle: input.handle,
					displayName: input.displayName || null
				});
				const next = await hostConfigSet({
					token: res.token,
					handle: res.user.handle
				});
				server.setToken(res.token);
				const communities = await server.myCommunities();
				setState({
					busy: false,
					phase: "ready",
					settings: next,
					me: res.user,
					communities
				});
			} catch (error) {
				setState({
					busy: false,
					phase: "anon",
					error: errorText(error)
				});
			}
		}
		/** 退出身份：清掉本地 token（保留 serverUrl/handle 等偏好）。 */
		async function logout() {
			try {
				await hostConfigSet({ token: "" });
			} catch {}
			const settings = state.settings;
			setState({
				open: true,
				phase: "anon",
				me: null,
				communities: [],
				error: "",
				settings: settings === null ? null : {
					...settings,
					token: ""
				}
			});
		}
		//#endregion
		//#region packages/client/src/components.tsx
		const COLORS = {
			bg: "rgba(16,18,24,0.72)",
			panel: "#1b1e27",
			border: "rgba(255,255,255,0.09)",
			text: "#e6e9ef",
			muted: "#9aa1ad",
			accent: "#4f7cff",
			danger: "#e5534b"
		};
		const overlayStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 1200,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: COLORS.bg,
			backdropFilter: "blur(4px)",
			pointerEvents: "auto"
		};
		const panelStyle = {
			width: 460,
			maxWidth: "calc(100vw - 40px)",
			maxHeight: "min(620px, calc(100vh - 40px))",
			overflow: "auto",
			background: COLORS.panel,
			color: COLORS.text,
			border: `1px solid ${COLORS.border}`,
			borderRadius: 12,
			padding: "20px 20px 16px",
			boxShadow: "0 12px 40px rgba(0,0,0,.45)"
		};
		const fieldStyle = {
			width: "100%",
			boxSizing: "border-box",
			padding: "8px 10px",
			marginTop: 6,
			marginBottom: 12,
			borderRadius: 8,
			border: `1px solid ${COLORS.border}`,
			background: "rgba(255,255,255,0.04)",
			color: COLORS.text
		};
		const btnStyle = {
			border: `1px solid ${COLORS.border}`,
			background: "rgba(255,255,255,0.06)",
			color: COLORS.text,
			padding: "7px 14px",
			borderRadius: 8,
			cursor: "pointer"
		};
		const primaryBtn = {
			...btnStyle,
			background: COLORS.accent,
			borderColor: COLORS.accent
		};
		const rowStyle = {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			padding: "10px 12px",
			borderRadius: 8,
			border: `1px solid ${COLORS.border}`,
			marginBottom: 8
		};
		const footerActionStyle = {
			width: "100%",
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 10px",
			borderRadius: 8,
			border: "none",
			background: "transparent",
			color: COLORS.text,
			cursor: "pointer",
			fontSize: 13
		};
		function TalkIcon({ size = 18 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: size,
				height: size,
				viewBox: "0 0 24 24",
				fill: "currentColor",
				"aria-hidden": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "8",
						r: "3.2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "17",
						cy: "8",
						r: "2",
						opacity: "0.6"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "9",
						cy: "16",
						r: "3.2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "17",
						cy: "16",
						r: "2",
						opacity: "0.6"
					})
				]
			});
		}
		function TalkToggle({ wide }) {
			const { open } = useTalkState();
			const style = {
				...footerActionStyle,
				...open ? { background: "rgba(255,255,255,0.08)" } : {}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style,
				onClick: () => openTalk(),
				title: "dsh-talk 社区",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkIcon, {}), wide ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "社区" }) : null]
			});
		}
		function CommunityList({ communities }) {
			if (communities.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { color: COLORS.muted },
				children: "还没有加入任何社区。创建/加入功能随 Server API 完善后开启。"
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: communities.map((community) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rowStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: community.name }), community.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: COLORS.muted,
						fontSize: 12
					},
					children: community.description
				}) : null] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						fontSize: 11,
						color: COLORS.accent,
						border: `1px solid ${COLORS.accent}`,
						borderRadius: 999,
						padding: "2px 8px"
					},
					children: community.role
				})]
			}, community.id)) });
		}
		function RegisterForm({ serverUrl }) {
			const { busy } = useTalkState();
			const [code, setCode] = (0, react.useState)("");
			const [handle, setHandle] = (0, react.useState)("");
			const [displayName, setDisplayName] = (0, react.useState)("");
			const submit = (event) => {
				event.preventDefault();
				if (code.trim().length === 0 || handle.trim().length === 0) return;
				registerIdentity({
					inviteCode: code.trim(),
					handle: handle.trim(),
					displayName: displayName.trim().length > 0 ? displayName.trim() : null
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						style: {
							color: COLORS.muted,
							fontSize: 12,
							marginTop: 0
						},
						children: [
							"Server：",
							serverUrl,
							" —— 用一次性平台注册码开通身份，令牌会安全保存在本地 DSH 设置里。"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						style: fieldStyle,
						value: code,
						onChange: (e) => setCode(e.target.value),
						placeholder: "平台注册码（一次性）",
						autoComplete: "off"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						style: fieldStyle,
						value: handle,
						onChange: (e) => setHandle(e.target.value),
						placeholder: "昵称 @handle（全局唯一）",
						autoComplete: "off"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						style: fieldStyle,
						value: displayName,
						onChange: (e) => setDisplayName(e.target.value),
						placeholder: "显示名（可选）",
						autoComplete: "off"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						style: {
							...primaryBtn,
							width: "100%",
							opacity: busy ? .6 : 1
						},
						disabled: busy,
						children: busy ? "注册中…" : "开通身份"
					})
				]
			});
		}
		function ErrorView() {
			const { error } = useTalkState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					color: COLORS.danger,
					marginBottom: 12
				},
				children: ["连接失败：", error]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				style: btnStyle,
				onClick: () => void refresh(),
				children: "重试"
			})] });
		}
		function TalkOverlay(_props) {
			const talk = useTalkState();
			if (!talk.open) return null;
			const body = talk.busy && talk.phase === "booting" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { color: COLORS.muted },
				children: "连接 Server…"
			}) : talk.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorView, {}) : talk.phase === "anon" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RegisterForm, { serverUrl: talk.settings?.serverUrl ?? "http://127.0.0.1:8787" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 12
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: { fontWeight: 600 },
						children: talk.me?.displayName ?? talk.me?.handle ?? "已登录"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							color: COLORS.muted,
							fontSize: 12
						},
						children: ["@", talk.me?.handle]
					})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						style: btnStyle,
						onClick: () => void logout(),
						children: "退出"
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						color: COLORS.muted,
						fontSize: 12,
						marginBottom: 8
					},
					children: "我的社区"
				}),
				talk.me !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunityList, { communities: talk.communities }) : null
			] });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: overlayStyle,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: panelStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							marginBottom: 12
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontWeight: 600,
								fontSize: 15,
								display: "flex",
								alignItems: "center",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkIcon, {}), "dsh-talk 社区"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: btnStyle,
							onClick: () => closeTalk(),
							"aria-label": "关闭",
							children: "关闭"
						})]
					}), body]
				})
			});
		}
		//#endregion
		//#region packages/client/src/index.ts
		/**
		* Required services：需要 DSH 的 `slots` 服务接线后，ctx.slots 才能用。
		* 浏览器插件在 fiber 上等待 services 会把整个 GUI boot 卡在
		* “Loading plugins…” 闸门后 —— 官方写法是只 inject 必要服务（slots 由
		* client runtime 恒常提供），其余全部按需惰性查找 + 容错。
		*/
		const inject = ["slots"];
		function apply(ctx) {
			try {
				ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
					name: "sidebar.footer.action",
					id: "dsh-talk",
					order: 1e3,
					label: "社区",
					registrant: "dsh-talk"
				}, TalkToggle));
				ctx.slots.inject("shell.overlay", () => ctx.slots.register({
					name: "shell.overlay",
					id: "dsh-talk",
					order: 1e3,
					label: "dsh-talk 面板",
					registrant: "dsh-talk"
				}, TalkOverlay));
			} catch (error) {
				console.error("[dsh-talk] slot register failed:", error);
			}
			refresh();
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map