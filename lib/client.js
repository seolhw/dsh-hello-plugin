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
		const errorMessage = (data, text) => {
			if (data && typeof data === "object") {
				const maybe = data;
				if (typeof maybe.message === "string" && maybe.message.length > 0) return maybe.message;
				if (typeof maybe.error === "string" && maybe.error.length > 0) return maybe.error;
				if (maybe.error && typeof maybe.error === "object") {
					const first = Object.values(maybe.error)[0];
					if (Array.isArray(first) && typeof first[0] === "string") return first[0];
				}
			}
			return text.length > 0 ? text : "request failed";
		};
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
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
					throw new ServerApiError(res.status, err?.code ?? "AUTH_ERROR", errorMessage(data, text), err?.requestId, err?.details);
				}
				return data;
			}
			/** 登录/注册专用：同时从响应头/body 收集会话 token（Bearer 用） */
			async authCall(method, path, body) {
				const headers = { "content-type": "application/json" };
				if (this.hasToken) headers.authorization = `Bearer ${this.token}`;
				const res = await fetch(this.url(path), {
					method,
					headers,
					body: JSON.stringify(body)
				});
				const text = await res.text();
				let data = null;
				if (text.length > 0) try {
					data = JSON.parse(text);
				} catch {
					data = null;
				}
				if (!res.ok) {
					const err = data;
					throw new ServerApiError(res.status, err?.code ?? "AUTH_ERROR", errorMessage(data, text), err?.requestId, err?.details);
				}
				const tokenFromHeader = res.headers.get("set-auth-token");
				const tokenFromBody = isRecord(data) && typeof data.token === "string" ? data.token : null;
				return {
					user: isRecord(data) && isRecord(data.user) ? data.user : null,
					token: tokenFromHeader ?? tokenFromBody
				};
			}
			/** POST /api/auth/sign-up/email —— 邮箱注册（用户名可选） */
			signUpEmail(body) {
				return this.authCall("POST", "/api/auth/sign-up/email", body);
			}
			/** POST /api/auth/sign-in/email —— 邮箱登录 */
			signInEmail(body) {
				return this.authCall("POST", "/api/auth/sign-in/email", body);
			}
			/** POST /api/auth/sign-in/username —— 用户名登录 */
			signInUsername(body) {
				return this.authCall("POST", "/api/auth/sign-in/username", body);
			}
			/** POST /api/auth/sign-out —— 登出（吊销当前会话）。Better Auth 要求 JSON body */
			signOut() {
				return this.call("POST", "/api/auth/sign-out", {}, true);
			}
			/**
			* GET /api/auth/get-session —— 当前登录态。
			* 注意：token 失效/被吊销时返回 200 + null（不是 401），调用方需判空。
			*/
			getSession() {
				return this.call("GET", "/api/auth/get-session", void 0, true);
			}
			/** POST /api/auth/change-password —— 修改密码 */
			changePassword(body) {
				return this.call("POST", "/api/auth/change-password", body, true);
			}
			/** POST /api/auth/update-user —— 改资料/改用户名 */
			updateUser(body) {
				return this.call("POST", "/api/auth/update-user", body, true);
			}
			/** POST /api/auth/send-verification-email —— 重发验证邮件 */
			sendVerificationEmail(body) {
				return this.call("POST", "/api/auth/send-verification-email", body);
			}
			/** POST /api/auth/request-password-reset —— 忘记密码：发重置邮件 */
			requestPasswordReset(body) {
				return this.call("POST", "/api/auth/request-password-reset", body);
			}
			/** POST /api/auth/reset-password —— 用邮件里的 token 重设密码 */
			resetPassword(body) {
				return this.call("POST", "/api/auth/reset-password", body);
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
		/** Better Auth user -> 业务 User 实体（与 server/src/lib/auth.ts 的映射一致） */
		function toUser(auth) {
			const emailPrefix = auth.email.split("@")[0] || auth.id;
			const createdAt = Number.isNaN(Date.parse(auth.createdAt)) ? Date.now() : Date.parse(auth.createdAt);
			return {
				id: auth.id,
				handle: auth.username || emailPrefix,
				displayName: auth.name || null,
				avatarUrl: auth.image,
				createdAt
			};
		}
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
		/** 重取：host 配置 → 有 token 就拉会话（get-session）+ 我的社区。 */
		async function refresh() {
			setState({
				phase: "booting",
				busy: true,
				error: ""
			});
			try {
				const settings = await hostConfigGet();
				if (settings.token.length === 0) {
					setState({
						phase: "anon",
						busy: false,
						settings
					});
					return;
				}
				const server = makeServer(settings);
				const session = await server.getSession();
				if (!session?.session || !session.user) {
					setState({
						phase: "anon",
						busy: false,
						settings
					});
					return;
				}
				const me = toUser(session.user);
				if (settings.handle !== me.handle) try {
					await hostConfigSet({ handle: me.handle });
				} catch {}
				const communities = await server.myCommunities();
				setState({
					busy: false,
					phase: "ready",
					settings: settings.handle === me.handle ? settings : {
						...settings,
						handle: me.handle
					},
					me,
					communities
				});
			} catch (error) {
				if (error instanceof ServerApiError && error.status === 401) {
					setState({
						phase: "anon",
						busy: false,
						me: null,
						communities: [],
						settings: state.settings
					});
					return;
				}
				setState({
					phase: "error",
					busy: false,
					error: errorText(error)
				});
			}
		}
		/** 退出登录：先吊销 Server 会话，再清掉本地 token（保留 serverUrl/handle 偏好）。 */
		async function logout() {
			const settings = state.settings;
			if (settings && settings.token.length > 0) try {
				await makeServer(settings).signOut();
			} catch {}
			try {
				await hostConfigSet({ token: "" });
			} catch {}
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
		const btnStyle = {
			border: `1px solid ${COLORS.border}`,
			background: "rgba(255,255,255,0.06)",
			color: COLORS.text,
			padding: "7px 14px",
			borderRadius: 8,
			cursor: "pointer"
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
			}) : talk.phase === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorView, {}) : talk.phase === "anon" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: COLORS.muted,
					fontSize: 13
				},
				children: `尚未登录。登录 / 注册（邮箱 / GitHub）与账号管理 UI 将于下一步接入。当前 Server：${talk.settings?.serverUrl ?? "http://127.0.0.1:8787"}。已有会话 token 时打开面板会自动验证并展示账号。`
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
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