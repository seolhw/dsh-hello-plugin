window.__ModuleLoader__.load({
	id: "dsh-talk",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
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
		function toQuery(params) {
			const entries = Object.entries(params).filter((entry) => entry[1] !== void 0 && entry[1] !== null && String(entry[1]).length > 0);
			if (entries.length === 0) return "";
			return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`;
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
			/** GET /api/communities/mine —— 我加入的社区（含未读概览） */
			myCommunities() {
				return this.call("GET", "/api/communities/mine", void 0, true);
			}
			/** GET /api/communities/:id —— 社区详情（频道 + 我的角色） */
			getCommunity(communityId) {
				return this.call("GET", `/api/communities/${communityId}`, void 0, true);
			}
			/** POST /api/communities —— 创建社区 */
			createCommunity(body) {
				return this.call("POST", "/api/communities", body, true);
			}
			/** POST /api/communities/join-by-code —— 邀请码加入（私有/公开通用） */
			joinByCode(body) {
				return this.call("POST", "/api/communities/join-by-code", body, true);
			}
			/** POST /api/communities/:id/join —— 直接加入公开社区 */
			joinCommunity(communityId) {
				return this.call("POST", `/api/communities/${communityId}/join`, {}, true);
			}
			/** POST /api/communities/:id/leave —— 退出社区（owner 不能退） */
			leaveCommunity(communityId) {
				return this.call("POST", `/api/communities/${communityId}/leave`, {}, true);
			}
			/** POST /api/communities/:id/channels —— 新建频道（owner/admin） */
			createChannel(communityId, body) {
				return this.call("POST", `/api/communities/${communityId}/channels`, body, true);
			}
			/** GET /api/channels/:id/messages —— 历史（desc 新→旧；cursor=某条 createdAt 翻更早） */
			listMessages(channelId, opts = {}) {
				const query = toQuery({
					cursor: opts.cursor ?? "",
					limit: opts.limit ?? 50,
					direction: opts.direction ?? "desc"
				});
				return this.call("GET", `/api/channels/${channelId}/messages${query}`, void 0, true);
			}
			/** POST /api/channels/:id/messages —— 发消息 */
			createMessage(channelId, body) {
				return this.call("POST", `/api/channels/${channelId}/messages`, body, true);
			}
			/** PATCH /api/messages/:id —— 编辑消息（作者或 owner/admin） */
			updateMessage(messageId, body) {
				return this.call("PATCH", `/api/messages/${messageId}`, body, true);
			}
			/** DELETE /api/messages/:id —— 删除消息（作者或 owner/admin） */
			deleteMessage(messageId) {
				return this.call("DELETE", `/api/messages/${messageId}`, void 0, true);
			}
			/** GET /api/channels/:id/read-state —— 未读快照 */
			getReadState(channelId) {
				return this.call("GET", `/api/channels/${channelId}/read-state`, void 0, true);
			}
			/** POST /api/channels/:id/read-state —— 上报已读 */
			markRead(channelId, body) {
				return this.call("POST", `/api/channels/${channelId}/read-state`, body, true);
			}
		};
		//#endregion
		//#region packages/client/src/ws.ts
		var TalkSocket = class {
			url;
			events;
			ws = null;
			heartbeat = null;
			constructor(url, events = {}) {
				this.url = url;
				this.events = events;
			}
			get connected() {
				return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
			}
			connect() {
				if (this.ws !== null) return;
				const ws = new WebSocket(this.url);
				this.ws = ws;
				ws.onopen = () => {
					this.events.onOpen?.();
				};
				ws.onmessage = (ev) => {
					try {
						const frame = JSON.parse(String(ev.data));
						this.events.onFrame?.(frame);
					} catch (error) {
						this.events.onError?.(error);
					}
				};
				ws.onclose = (ev) => {
					this.ws = null;
					this.stopHeartbeat();
					this.events.onClose?.(ev.code, ev.reason);
				};
				ws.onerror = (ev) => {
					this.events.onError?.(ev);
				};
			}
			/** 发送一帧（未连接时静默丢弃）。 */
			send(frame) {
				if (!this.connected) return false;
				this.ws?.send(JSON.stringify(frame));
				return true;
			}
			/**
			* 心跳：按服务端 EvtHello.heartbeatIntervalSec 开启；
			* 取 interval*0.8 秒发一次 ping。
			*/
			startHeartbeat(intervalSec) {
				this.stopHeartbeat();
				const periodMs = Math.max(5e3, intervalSec * 800);
				this.heartbeat = window.setInterval(() => {
					this.send({
						type: "ping",
						payload: { clientTime: Date.now() }
					});
				}, periodMs);
			}
			stopHeartbeat() {
				if (this.heartbeat !== null) {
					clearInterval(this.heartbeat);
					this.heartbeat = null;
				}
			}
			close() {
				this.stopHeartbeat();
				this.ws?.close();
				this.ws = null;
			}
		};
		//#endregion
		//#region packages/client/src/store.ts
		const INITIAL_VIEW = {
			communityId: null,
			community: null,
			communityLoading: false,
			channelId: null,
			messages: [],
			nextCursor: null,
			messagesLoading: false,
			loadingOlder: false,
			sending: false,
			live: false,
			drafts: {}
		};
		let state = {
			open: false,
			busy: false,
			phase: "booting",
			settings: null,
			me: null,
			communities: [],
			error: "",
			toast: "",
			view: INITIAL_VIEW,
			view: { ...INITIAL_VIEW }
		};
		const listeners = /* @__PURE__ */ new Set();
		let toastTimer = null;
		function setState(patch) {
			state = {
				...state,
				...patch
			};
			for (const listener of listeners) listener();
		}
		function patchView(patch) {
			setState({ view: {
				...state.view,
				...patch
			} });
		}
		function makeServer(settings) {
			return new ServerClient(settings.serverUrl, settings.token);
		}
		function serverOf() {
			const settings = state.settings;
			if (!settings || settings.token.length === 0) return null;
			return makeServer(settings);
		}
		const errorText = (error) => error instanceof Error ? error.message : String(error);
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
		/** 通知条（自动消失） */
		function notify(message) {
			setState({ toast: message });
			if (toastTimer !== null) window.clearTimeout(toastTimer);
			toastTimer = window.setTimeout(() => setState({ toast: "" }), 3200);
		}
		/** 提前关闭通知条（Toast 动画结束后调用） */
		function dismissToast() {
			if (toastTimer !== null) {
				window.clearTimeout(toastTimer);
				toastTimer = null;
			}
			setState({ toast: "" });
		}
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
			closeRealtime();
			setState({ open: false });
		}
		/** 邮箱/用户名登录（Better Auth），成功后写 host token/handle */
		async function login(mode, account, password) {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			const server = makeServer(settings);
			const { user, token } = mode === "email" ? await server.signInEmail({
				email: account,
				password
			}) : await server.signInUsername({
				username: account,
				password
			});
			if (!token || !user) throw new Error("服务端未返回会话 token");
			await applySession({
				user,
				token
			});
		}
		/** 邮箱注册（用户名可选；name 必填由服务端契约保证，空则退回用户名/邮箱前缀） */
		async function register(input) {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			const body = {
				name: input.name?.trim() || input.username?.trim() || input.email.split("@")[0] || "dsh-user",
				email: input.email,
				password: input.password
			};
			if (input.username !== void 0 && input.username.trim().length > 0) body.username = input.username.trim();
			const { user, token } = await makeServer(settings).signUpEmail(body);
			if (!token || !user) throw new Error("服务端未返回会话 token");
			await applySession({
				user,
				token
			});
		}
		/** GitHub OAuth：打开服务端授权页（top-level 导航无 Origin 限制），
		*  回调回服务端 landing 页后 postMessage 回传 token（见 worker.ts social-landing）。 */
		function githubLogin() {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			return new Promise((resolve, reject) => {
				const origin = new URL(settings.serverUrl).origin;
				const callback = `${settings.serverUrl}/api/auth/social-landing`;
				const authUrl = `${settings.serverUrl}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(callback)}`;
				if (!window.open(authUrl, "dsh-talk-github", "popup,width=520,height=640")) {
					reject(/* @__PURE__ */ new Error("弹窗被拦截，请允许本站打开弹窗后重试"));
					return;
				}
				const onMessage = (event) => {
					if (event.origin !== origin) return;
					const data = event.data;
					if (data?.type !== "dsh-talk:auth") return;
					window.removeEventListener("message", onMessage);
					if (!data.user || !data.token) {
						reject(/* @__PURE__ */ new Error("GitHub 授权未完成或已取消"));
						return;
					}
					applySession({
						user: data.user,
						token: data.token
					}).then(resolve, reject);
				};
				window.addEventListener("message", onMessage);
			});
		}
		async function applySession(result) {
			setState({
				busy: true,
				error: ""
			});
			try {
				const me = toUser(result.user);
				const next = await hostConfigSet({
					token: result.token,
					handle: me.handle
				});
				setState({
					busy: false,
					phase: "ready",
					settings: next,
					me,
					communities: await makeServer(next).myCommunities(),
					view: { ...INITIAL_VIEW }
				});
			} catch (error) {
				setState({
					busy: false,
					phase: "anon",
					error: errorText(error)
				});
				throw error;
			}
		}
		async function logout() {
			closeRealtime();
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
				view: { ...INITIAL_VIEW },
				settings: settings === null ? null : {
					...settings,
					token: ""
				}
			});
		}
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
		/** 后台重取社区列表（加入/退出/未读变化后调用，不打断当前浏览） */
		async function refreshCommunities() {
			const server = serverOf();
			if (!server) return;
			try {
				setState({ communities: await server.myCommunities() });
			} catch {}
		}
		function backToCommunities() {
			closeRealtime();
			setState({ view: { ...INITIAL_VIEW } });
		}
		async function openCommunity(communityId) {
			const server = serverOf();
			if (!server) return;
			closeRealtime();
			patchView({
				communityId,
				community: null,
				communityLoading: true,
				channelId: null,
				messages: [],
				nextCursor: null,
				live: false
			});
			try {
				const detail = await server.getCommunity(communityId);
				patchView({
					community: detail,
					communityLoading: false
				});
				if (detail.myRole) {
					const first = detail.channels[0];
					if (first) selectChannel(first.id);
				}
			} catch (error) {
				patchView({ communityLoading: false });
				notify(errorText(error));
			}
		}
		async function createCommunity(input) {
			const server = serverOf();
			if (!server) return false;
			try {
				const body = { name: input.name };
				if (input.description !== void 0 && input.description.length > 0) body.description = input.description;
				if (input.privacy !== void 0) body.privacy = input.privacy;
				const created = await server.createCommunity(body);
				await refreshCommunities();
				await openCommunity(created.id);
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		async function joinCommunityByCode(inviteCode) {
			const server = serverOf();
			if (!server) return false;
			try {
				const joined = await server.joinByCode({ inviteCode: inviteCode.trim() });
				await refreshCommunities();
				await openCommunity(joined.id);
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		let socket = null;
		let reconnectTimer = null;
		function closeRealtime() {
			if (reconnectTimer !== null) {
				window.clearTimeout(reconnectTimer);
				reconnectTimer = null;
			}
			if (socket !== null) {
				socket.close();
				socket = null;
			}
			if (state.view.live) patchView({ live: false });
		}
		function wsUrl(channelId) {
			const settings = state.settings;
			const base = (settings?.serverUrl ?? "http://127.0.0.1:8787").replace(/^http/, "ws");
			const token = settings?.token ?? "";
			return `${base}/ws?token=${encodeURIComponent(token)}&channelId=${encodeURIComponent(channelId)}`;
		}
		function connectChannel(channelId) {
			closeRealtime();
			const settings = state.settings;
			socket = new TalkSocket(wsUrl(channelId), {
				onFrame: (frame) => handleServerFrame(frame),
				onClose: () => {
					socket = null;
					if (!state.open || state.view.channelId !== channelId) return;
					patchView({ live: false });
					if (settings?.autoReconnect && reconnectTimer === null) reconnectTimer = window.setTimeout(() => {
						reconnectTimer = null;
						if (state.open && state.view.channelId === channelId) connectChannel(channelId);
					}, 3e3);
				},
				onError: () => {}
			});
			socket.connect();
		}
		/** 服务端帧分发：hello（心跳开启）/ 消息事件（仅当属于当前频道） */
		function handleServerFrame(frame) {
			switch (frame.type) {
				case "evt.hello":
					patchView({ live: true });
					socket?.startHeartbeat(frame.payload.heartbeatIntervalSec);
					return;
				case "evt.message.new":
					if (frame.payload.channelId !== state.view.channelId) return;
					upsertMessage(frame.payload.message, true);
					return;
				case "evt.message.updated":
					if (frame.payload.channelId !== state.view.channelId) return;
					upsertMessage(frame.payload.message, true);
					return;
				case "evt.message.deleted":
					if (frame.payload.channelId !== state.view.channelId) return;
					removeMessage(frame.payload.messageId);
					return;
				default: return;
			}
		}
		function upsertMessage(item, appended) {
			const list = state.view.messages;
			const index = list.findIndex((m) => m.id === item.id);
			let next;
			if (index >= 0) {
				next = [...list];
				next[index] = item;
			} else if (appended) next = [...list, item];
			else next = [item, ...list];
			next.sort((a, b) => a.createdAt - b.createdAt);
			patchView({ messages: next });
		}
		function removeMessage(messageId) {
			patchView({ messages: state.view.messages.filter((m) => m.id !== messageId) });
		}
		/** 切换到某个频道：拉历史 → 上报已读 → 连实时 */
		async function selectChannel(channelId) {
			const server = serverOf();
			if (!server) return;
			closeRealtime();
			patchView({
				channelId,
				messages: [],
				nextCursor: null,
				messagesLoading: true,
				loadingOlder: false,
				live: false
			});
			try {
				const page = await server.listMessages(channelId, {
					limit: 50,
					direction: "desc"
				});
				const items = [...page.items].reverse();
				patchView({
					messages: items,
					nextCursor: page.nextCursor,
					messagesLoading: false
				});
				const newest = items[items.length - 1];
				if (newest) try {
					await server.markRead(channelId, { lastReadMessageId: newest.id });
					refreshCommunities();
				} catch {}
				connectChannel(channelId);
			} catch (error) {
				patchView({
					messagesLoading: false,
					live: false
				});
				notify(errorText(error));
			}
		}
		/** 向上翻更早消息 */
		async function loadOlderMessages() {
			const server = serverOf();
			const { channelId, nextCursor, loadingOlder, messages } = state.view;
			if (!server || !channelId || !nextCursor || loadingOlder) return;
			patchView({ loadingOlder: true });
			try {
				const page = await server.listMessages(channelId, {
					cursor: nextCursor,
					limit: 50,
					direction: "desc"
				});
				patchView({
					messages: [...[...page.items].reverse(), ...messages],
					nextCursor: page.nextCursor,
					loadingOlder: false
				});
			} catch (error) {
				patchView({ loadingOlder: false });
				notify(errorText(error));
			}
		}
		/** 发消息：走 REST；WS live 时事件会回填，否则本地补一条 */
		async function sendMessage(content) {
			const server = serverOf();
			const channelId = state.view.channelId;
			if (!server || !channelId) return;
			const text = content.trim();
			if (text.length === 0 || state.view.sending) return;
			patchView({ sending: true });
			try {
				const created = await server.createMessage(channelId, { content: text });
				if (!state.view.live) upsertMessage(created, true);
				patchView({ sending: false });
			} catch (error) {
				patchView({ sending: false });
				notify(errorText(error));
			}
		}
		async function updateMessage(messageId, content) {
			const server = serverOf();
			if (!server) return;
			try {
				const updated = await server.updateMessage(messageId, { content: content.trim() });
				if (!state.view.live) upsertMessage(updated, true);
			} catch (error) {
				notify(errorText(error));
				throw error;
			}
		}
		async function deleteMessage(messageId) {
			const server = serverOf();
			if (!server) return;
			try {
				await server.deleteMessage(messageId);
				if (!state.view.live) removeMessage(messageId);
			} catch (error) {
				notify(errorText(error));
				throw error;
			}
		}
		/** 设置当前频道输入草稿（内存） */
		function setDraft(text) {
			const channelId = state.view.channelId;
			if (!channelId) return;
			patchView({ drafts: {
				...state.view.drafts,
				[channelId]: text
			} });
		}
		/** 当前用户能否改/删一条消息（作者本人 或 社区 owner/admin） */
		function canModify(item) {
			if (state.me === null) return false;
			if (item.authorId === state.me.id) return true;
			const role = state.view.community?.myRole;
			return role === "owner" || role === "admin";
		}
		//#endregion
		//#region packages/client/src/components/styles.tsx
		const palette = {
			page: "#0d0f14",
			panel: "#151923",
			rail: "#10141d",
			border: "rgba(255,255,255,0.09)",
			text: "#e7eaf1",
			muted: "#8b93a5",
			accent: "#5b8cff",
			danger: "#f2695e",
			success: "#3fb950",
			badge: "#e5534b",
			inputBg: "rgba(255,255,255,0.05)",
			hover: "rgba(255,255,255,0.07)",
			active: "rgba(91,140,255,0.16)"
		};
		const overlayStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 1200,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: "rgba(6,8,12,0.62)",
			backdropFilter: "blur(6px)",
			pointerEvents: "auto"
		};
		const panelStyle = {
			width: 1080,
			maxWidth: "calc(100vw - 40px)",
			height: "min(680px, calc(100vh - 40px))",
			display: "flex",
			flexDirection: "column",
			background: palette.panel,
			color: palette.text,
			border: `1px solid ${palette.border}`,
			borderRadius: 14,
			overflow: "hidden",
			boxShadow: "0 16px 48px rgba(0,0,0,.5)"
		};
		const panelHeader = {
			display: "flex",
			alignItems: "center",
			gap: 10,
			padding: "12px 16px",
			borderBottom: `1px solid ${palette.border}`
		};
		const smallText = {
			fontSize: 12,
			color: palette.muted
		};
		/** 头像圆块（无图时用 handle 首字母） */
		function Avatar({ label, color, size = 26 }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					width: size,
					height: size,
					flex: "0 0 auto",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: "50%",
					background: color ?? "linear-gradient(135deg,#5b8cff,#8a63ff)",
					color: "#fff",
					fontSize: Math.round(size * .42),
					fontWeight: 600,
					userSelect: "none"
				},
				children: label.slice(0, 1).toUpperCase()
			});
		}
		function timeLabel(ts) {
			const d = new Date(ts);
			const pad = (n) => String(n).padStart(2, "0");
			return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
		//#endregion
		//#region packages/client/src/components/AuthScreen.tsx
		const card = {
			width: 400,
			maxWidth: "calc(100vw - 48px)",
			background: palette.panel,
			border: `1px solid ${palette.border}`,
			borderRadius: 14,
			padding: "22px 24px",
			color: palette.text,
			display: "flex",
			flexDirection: "column",
			gap: 10
		};
		const title = {
			margin: 0,
			fontSize: 17,
			fontWeight: 650
		};
		const label = {
			fontSize: 12,
			color: palette.muted
		};
		function AuthScreen() {
			const talk = useTalkState();
			const [mode, setMode] = (0, react.useState)("login");
			const [loginId, setLoginId] = (0, react.useState)("email");
			const [name, setName] = (0, react.useState)("");
			const [account, setAccount] = (0, react.useState)("");
			const [username, setUsername] = (0, react.useState)("");
			const [password, setPassword] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			async function submit(event) {
				event.preventDefault();
				setBusy(true);
				setError("");
				try {
					if (mode === "login") await login(loginId, account.trim(), password);
					else {
						const extra = {};
						if (name.trim().length > 0) extra.name = name.trim();
						if (username.trim().length > 0) extra.username = username.trim();
						await register({
							...extra,
							email: account.trim(),
							password
						});
					}
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setBusy(false);
				}
			}
			async function onGithub() {
				setBusy(true);
				setError("");
				try {
					await githubLogin();
				} catch (err) {
					setError(err instanceof Error ? err.message : String(err));
				} finally {
					setBusy(false);
				}
			}
			const allowSubmit = account.trim().length > 0 && password.length >= 8;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
						style: title,
						children: "dsh-talk 社区"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
							active: mode === "login",
							onClick: () => setMode("login"),
							children: "登录"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
							active: mode === "register",
							onClick: () => setMode("register"),
							children: "注册"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						onSubmit: (e) => void submit(e),
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 10
						},
						children: [
							mode === "register" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								htmlFor: "talk-name",
								style: label,
								children: ["昵称（可选）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-name",
									value: name,
									onChange: (e) => setName(e.target.value),
									placeholder: "显示名，留空用邮箱前缀"
								})]
							}) : null,
							mode === "register" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								htmlFor: "talk-username",
								style: label,
								children: ["用户名（可选，用于 @mention 与用户名登录）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-username",
									value: username,
									onChange: (e) => setUsername(e.target.value),
									placeholder: "如 alice",
									autoComplete: "username"
								})]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									gap: 6,
									alignItems: "center"
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: loginId === "email",
									onClick: () => setLoginId("email"),
									children: "邮箱"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: loginId === "username",
									onClick: () => setLoginId("username"),
									children: "用户名"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								htmlFor: "talk-account",
								style: label,
								children: [mode === "register" ? "邮箱" : loginId === "email" ? "邮箱" : "用户名", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-account",
									value: account,
									onChange: (e) => setAccount(e.target.value),
									placeholder: mode === "register" || loginId === "email" ? "you@example.com" : "alice",
									type: mode === "register" || loginId === "email" ? "email" : "text",
									autoComplete: mode === "register" ? "email" : "username",
									required: true
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								htmlFor: "talk-password",
								style: label,
								children: ["密码（至少 8 位）", /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									type: "password",
									autoComplete: mode === "login" ? "current-password" : "new-password",
									required: true
								})]
							}),
							error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									color: palette.danger,
									fontSize: 13
								},
								children: error
							}) : null,
							talk.busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: label,
								children: "连接 Server…"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "submit",
								variant: "primary",
								size: "md",
								disabled: busy || !allowSubmit,
								children: mode === "login" ? "登录" : "创建账号"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							margin: "4px 0"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								flex: 1,
								height: 1,
								background: palette.border
							} }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: label,
								children: "或"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
								flex: 1,
								height: 1,
								background: palette.border
							} })
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						variant: "outline",
						size: "md",
						onClick: () => void onGithub(),
						disabled: busy,
						children: "GitHub 登录"
					})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/HomeScreen.tsx
		const body = {
			display: "flex",
			flex: 1,
			minHeight: 0
		};
		const rail = {
			width: 240,
			flex: "0 0 auto",
			background: palette.rail,
			borderRight: `1px solid ${palette.border}`,
			display: "flex",
			flexDirection: "column",
			minHeight: 0
		};
		const railHeader = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			padding: "12px 12px 8px"
		};
		const railScroll = {
			overflow: "auto",
			flex: 1,
			padding: "0 8px 8px"
		};
		const itemRow = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 8px",
			borderRadius: 8,
			cursor: "pointer",
			border: "none",
			background: "transparent",
			color: palette.text,
			width: "100%",
			textAlign: "left"
		};
		const badge = {
			minWidth: 18,
			height: 18,
			padding: "0 5px",
			borderRadius: 999,
			background: palette.badge,
			color: "#fff",
			fontSize: 11,
			lineHeight: "18px",
			textAlign: "center"
		};
		const midCol = {
			width: 216,
			flex: "0 0 auto",
			background: palette.page,
			borderRight: `1px solid ${palette.border}`,
			display: "flex",
			flexDirection: "column",
			minHeight: 0
		};
		const chatCol = {
			flex: 1,
			display: "flex",
			flexDirection: "column",
			minWidth: 0,
			minHeight: 0
		};
		const messagesWrap = {
			flex: 1,
			overflowY: "auto",
			padding: "12px 16px",
			display: "flex",
			flexDirection: "column"
		};
		const msgRow = {
			display: "flex",
			gap: 8,
			padding: "8px 10px",
			borderRadius: 10,
			border: `1px solid transparent`
		};
		const composerWrap = {
			borderTop: `1px solid ${palette.border}`,
			padding: "10px 14px",
			display: "flex",
			gap: 8,
			alignItems: "flex-end"
		};
		const textArea = {
			flex: 1,
			minHeight: 40,
			maxHeight: 160,
			resize: "none",
			borderRadius: 10,
			border: `1px solid ${palette.border}`,
			background: palette.inputBg,
			color: palette.text,
			padding: "8px 10px",
			font: "inherit",
			fontSize: 13,
			outline: "none"
		};
		const textAreaEdit = {
			width: "100%",
			minHeight: 54,
			resize: "vertical",
			borderRadius: 8,
			border: `1px solid ${palette.border}`,
			background: palette.inputBg,
			color: palette.text,
			padding: "6px 8px",
			font: "inherit",
			fontSize: 13
		};
		function CommunitiesRail({ onJoin, onCreate }) {
			const talk = useTalkState();
			const current = talk.view.communityId;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rail,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: railHeader,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 13,
							fontWeight: 650,
							color: palette.muted
						},
						children: "社区"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							display: "flex",
							gap: 2
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {}),
							onClick: onJoin,
							"aria-label": "加入社区",
							title: "用邀请码加入"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {}),
							onClick: onCreate,
							"aria-label": "创建社区",
							title: "创建社区"
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: railScroll,
					children: talk.communities.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...smallText,
							padding: "8px 10px"
						},
						children: "还没有社区。点右上「+」创建或用邀请码加入。"
					}) : talk.communities.map((c) => {
						const active = c.id === current;
						const unread = c.unreadChannels;
						const mention = c.unreadMentions;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							style: {
								...itemRow,
								background: active ? palette.active : void 0
							},
							onClick: () => {
								if (!active) openCommunity(c.id);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
									label: c.name,
									size: 26
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										flex: 1,
										minWidth: 0,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: c.name
								}),
								mention > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...badge,
										background: palette.accent
									},
									children: mention
								}) : unread > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: badge,
									children: unread
								}) : null
							]
						}, c.id);
					})
				})]
			});
		}
		function ChannelList() {
			const talk = useTalkState();
			const community = talk.view.community;
			const activeChannel = talk.view.channelId;
			if (!community) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: midCol,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						padding: "12px 12px 6px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 13,
							fontWeight: 650,
							color: palette.muted,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: community.name
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: railScroll,
					children: community.channels.map((ch) => {
						const active = ch.id === activeChannel;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							style: {
								...itemRow,
								background: active ? palette.active : void 0
							},
							onClick: () => void selectChannel(ch.id),
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: palette.muted },
								children: "#"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									flex: 1,
									minWidth: 0,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: ch.name
							})]
						}, ch.id);
					})
				})]
			});
		}
		function MessageRow({ item }) {
			const talk = useTalkState();
			const [editing, setEditing] = (0, react.useState)(false);
			const [draftText, setDraftText] = (0, react.useState)(item.content);
			const mine = talk.me !== null && item.authorId === talk.me.id;
			const mentionedMe = (item.mentions ?? []).includes(talk.me?.id ?? "");
			const allowEdit = canModify(item);
			async function saveEdit() {
				try {
					await updateMessage(item.id, draftText);
					setEditing(false);
				} catch {}
			}
			async function remove() {
				if (!window.confirm("删除这条消息？")) return;
				try {
					await deleteMessage(item.id);
				} catch {}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					...msgRow,
					borderColor: mentionedMe ? "rgba(91,140,255,0.35)" : void 0,
					background: mine ? "rgba(255,255,255,0.02)" : void 0
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, { label: item.author.handle }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: 1,
							minWidth: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "baseline",
								gap: 8
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 13,
										fontWeight: 600
									},
									children: item.author.displayName ?? item.author.handle
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { fontSize: 11 },
									children: mine ? "" : `@${item.author.handle}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 11
									},
									children: timeLabel(item.createdAt)
								}),
								mentionedMe ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 11,
										color: palette.accent
									},
									children: "@了你"
								}) : null,
								item.updatedAt ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 10
									},
									children: "(已编辑)"
								}) : null
							]
						}), editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: draftText,
							onChange: (e) => setDraftText(e.target.value),
							style: textAreaEdit
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								fontSize: 13.5,
								lineHeight: 1.55
							},
							children: item.content
						})]
					}),
					allowEdit ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 2
						},
						children: editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {}),
							onClick: () => setEditing(false),
							"aria-label": "取消编辑"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLoadingOutline16, {}),
							onClick: () => void saveEdit(),
							"aria-label": "保存"
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
							onClick: () => setEditing(true),
							"aria-label": "编辑"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
							onClick: () => void remove(),
							"aria-label": "删除"
						})] })
					}) : null
				]
			});
		}
		function ChatPane() {
			const talk = useTalkState();
			const channelId = talk.view.channelId;
			const community = talk.view.community;
			const channel = channelId ? community?.channels.find((c) => c.id === channelId) ?? null : null;
			const messageCount = talk.view.messages.length;
			const scrollRef = (0, react.useRef)(null);
			const channelRef = (0, react.useRef)(null);
			const pinnedRef = (0, react.useRef)(true);
			const lastCountRef = (0, react.useRef)(0);
			const draft = channelId ? talk.view.drafts[channelId] ?? "" : "";
			function onScroll(event) {
				const el = event.currentTarget;
				pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
			}
			(0, react.useEffect)(() => {
				const el = scrollRef.current;
				if (!el) return;
				const switched = channelRef.current !== channelId;
				channelRef.current = channelId;
				if (switched) {
					lastCountRef.current = messageCount;
					el.scrollTop = el.scrollHeight;
					pinnedRef.current = true;
					return;
				}
				const grew = messageCount > lastCountRef.current;
				lastCountRef.current = messageCount;
				if (grew && pinnedRef.current) el.scrollTop = el.scrollHeight;
			}, [channelId, messageCount]);
			if (!channelId) return null;
			async function submit() {
				const text = draft;
				if (text.trim().length === 0) return;
				await sendMessage(text);
				setDraft("");
			}
			const hasOlder = talk.view.nextCursor !== null;
			const canLoadMore = !talk.view.loadingOlder && hasOlder;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: chatCol,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "10px 16px",
							borderBottom: `1px solid ${palette.border}`
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { color: palette.muted },
								children: "#"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontWeight: 650 },
								children: channel?.name ?? ""
							}),
							channel?.topic ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									...smallText,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: channel.topic
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									marginLeft: "auto",
									display: "flex",
									alignItems: "center",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: talk.view.live ? palette.success : palette.muted,
									boxShadow: talk.view.live ? `0 0 6px ${palette.success}` : void 0
								} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 11
									},
									children: talk.view.live ? "实时" : "重连中…"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: scrollRef,
						onScroll,
						style: messagesWrap,
						children: talk.view.messagesLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: 16
							},
							children: "加载消息…"
						}) : talk.view.messages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: 16
							},
							children: "还没有消息，来说第一句吧。"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [canLoadMore ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								textAlign: "center",
								padding: 4
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => void loadOlderMessages(),
								disabled: talk.view.loadingOlder,
								children: talk.view.loadingOlder ? "加载中…" : "加载更早消息"
							})
						}) : null, talk.view.messages.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageRow, { item }, item.id))] })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: composerWrap,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							value: draft,
							onChange: (e) => setDraft(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									submit();
								}
							},
							placeholder: `在 #${channel?.name ?? ""} 发消息…`,
							style: textArea
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "md",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {}),
							disabled: talk.view.sending || draft.trim().length === 0,
							onClick: () => void submit(),
							"aria-label": "发送"
						})]
					})
				]
			});
		}
		function CreateCommunityModal({ open, onClose }) {
			const [name, setName] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [privacy, setPrivacy] = (0, react.useState)("public");
			const [busy, setBusy] = (0, react.useState)(false);
			async function submit() {
				if (name.trim().length === 0) return;
				setBusy(true);
				const body = {
					name: name.trim(),
					privacy
				};
				if (description.trim().length > 0) body.description = description.trim();
				const ok = await createCommunity(body);
				setBusy(false);
				if (ok) {
					setName("");
					setDescription("");
					onClose();
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "创建社区",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim().length === 0,
					onClick: () => void submit(),
					children: "创建"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: name,
							onChange: (e) => setName(e.target.value),
							placeholder: "社区名称"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: description,
							onChange: (e) => setDescription(e.target.value),
							placeholder: "简介（可选）"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: privacy === "public",
								onClick: () => setPrivacy("public"),
								children: "公开"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
								active: privacy === "private",
								onClick: () => setPrivacy("private"),
								children: "私有"
							})]
						})
					]
				})
			});
		}
		function JoinModal({ open, onClose }) {
			const [code, setCode] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			async function submit() {
				if (code.trim().length === 0) return;
				setBusy(true);
				const ok = await joinCommunityByCode(code);
				setBusy(false);
				if (ok) {
					setCode("");
					onClose();
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "用邀请码加入",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || code.trim().length === 0,
					onClick: () => void submit(),
					children: "加入"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
					value: code,
					onChange: (e) => setCode(e.target.value),
					placeholder: "邀请码，如 ABCD1234"
				})
			});
		}
		function HomeScreen() {
			const talk = useTalkState();
			const [showCreate, setShowCreate] = (0, react.useState)(false);
			const [showJoin, setShowJoin] = (0, react.useState)(false);
			const inCommunity = talk.view.communityId !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					flex: 1,
					minHeight: 0
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: "10px 16px",
							borderBottom: `1px solid ${palette.border}`
						},
						children: [
							inCommunity ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}),
								onClick: () => backToCommunities(),
								"aria-label": "返回社区列表",
								children: "返回"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: { fontWeight: 650 },
								children: inCommunity ? talk.view.community?.name ?? "…" : "社区"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									...smallText,
									fontSize: 11
								},
								children: ["@", talk.me?.handle]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									marginLeft: "auto",
									display: "flex",
									gap: 6
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => void logout(),
									children: "退出登录"
								})
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: body,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunitiesRail, {
								onJoin: () => setShowJoin(true),
								onCreate: () => setShowCreate(true)
							}),
							inCommunity ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelList, {}) : null,
							inCommunity ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatPane, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...chatCol,
									alignItems: "center",
									justifyContent: "center",
									color: palette.muted
								},
								children: "选择一个社区开始聊天"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateCommunityModal, {
						open: showCreate,
						onClose: () => setShowCreate(false)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JoinModal, {
						open: showJoin,
						onClose: () => setShowJoin(false)
					})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components.tsx
		const footerActionStyle = {
			width: "100%",
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 10px",
			borderRadius: 8,
			border: "none",
			background: "transparent",
			color: palette.text,
			cursor: "pointer",
			fontSize: 13
		};
		function TalkToggle({ wide }) {
			const { open } = useTalkState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				style: {
					...footerActionStyle,
					background: open ? palette.active : void 0
				},
				onClick: () => openTalk(),
				title: "dsh-talk 社区",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, { size: 16 }), wide ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "社区" }) : null]
			});
		}
		function LoadingView() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: palette.muted,
					padding: 20
				},
				children: "连接 Server…"
			});
		}
		function ErrorView() {
			const { error } = useTalkState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: { color: palette.muted },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						color: palette.danger,
						marginBottom: 12
					},
					children: ["连接失败：", error]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					onClick: () => void refresh(),
					children: "重试"
				})]
			});
		}
		function TalkOverlay(_props) {
			const talk = useTalkState();
			if (!talk.open) return null;
			let body;
			if (talk.phase === "error") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorView, {});
			else if (talk.phase === "anon") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AuthScreen, {});
			else if (talk.busy || talk.phase === "booting") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoadingView, {});
			else body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeScreen, {});
			const centered = talk.phase === "anon" || talk.phase === "error";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: overlayStyle,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: panelStyle,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: panelHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontWeight: 650,
								fontSize: 15,
								display: "flex",
								alignItems: "center",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, { size: 16 }), "dsh-talk 社区"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								marginLeft: "auto",
								display: "flex",
								gap: 6
							},
							children: [talk.phase === "ready" && talk.me ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									color: palette.muted,
									fontSize: 12,
									alignSelf: "center"
								},
								children: ["@", talk.me.handle]
							}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {}),
								onClick: () => closeTalk(),
								"aria-label": "关闭面板"
							})]
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							flex: 1,
							minHeight: 0,
							display: "flex",
							alignItems: centered ? "center" : void 0,
							justifyContent: centered ? "center" : void 0,
							overflow: "hidden"
						},
						children: body
					})]
				}), talk.toast.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: talk.toast,
					onDone: () => dismissToast()
				}) : null]
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