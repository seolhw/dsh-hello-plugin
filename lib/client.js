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
			/** PATCH /api/communities/:id —— 改社区（owner/admin） */
			updateCommunity(communityId, body) {
				return this.call("PATCH", `/api/communities/${communityId}`, body, true);
			}
			/** POST /api/communities/:id/rotate-invite —— 轮换邀请码（owner/admin） */
			rotateInvite(communityId) {
				return this.call("POST", `/api/communities/${communityId}/rotate-invite`, {}, true);
			}
			/** GET /api/communities/:id/members —— 成员列表（须是成员） */
			listMembers(communityId, query = {}) {
				const qs = toQuery({
					role: query.role ?? "",
					q: query.q ?? "",
					limit: query.limit ?? 100,
					offset: query.offset ?? 0
				});
				return this.call("GET", `/api/communities/${communityId}/members${qs}`, void 0, true);
			}
			/** PATCH /api/communities/:id/members/:userId/role —— 角色调整 / owner 转让 */
			updateMemberRole(communityId, userId, body) {
				return this.call("PATCH", `/api/communities/${communityId}/members/${userId}/role`, body, true);
			}
			/** DELETE /api/communities/:id/members/:userId —— 踢人（owner/admin，不能踢 owner） */
			removeMember(communityId, userId) {
				return this.call("DELETE", `/api/communities/${communityId}/members/${userId}`, void 0, true);
			}
			/** PATCH /api/channels/:id —— 频道改名/主题/类型（owner/admin） */
			updateChannel(channelId, body) {
				return this.call("PATCH", `/api/channels/${channelId}`, body, true);
			}
			/** DELETE /api/channels/:id —— 删频道（owner/admin） */
			deleteChannel(channelId) {
				return this.call("DELETE", `/api/channels/${channelId}`, void 0, true);
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
			/** POST /api/shares/snapshot —— 把某频道消息打包成会话快照 */
			createShareSnapshot(channelId, body) {
				return this.call("POST", "/api/shares/snapshot", {
					channelId,
					...body
				}, true);
			}
			/**
			* PUT /api/r2/objects —— 直传一个附件文件（body = 文件原始字节，非 JSON）。
			* 文件名为非 ASCII 时浏览器不允许放进请求头，故 X-File-Name 用 URL 编码传输。
			*/
			async uploadObject(file) {
				if (!this.hasToken) throw new ServerApiError(401, "UNAUTHORIZED", "未登录");
				const headers = {
					authorization: `Bearer ${this.token}`,
					"x-file-name": encodeURIComponent(file.name)
				};
				if (file.type.length > 0) headers["content-type"] = file.type;
				const res = await fetch(this.url("/api/r2/objects"), {
					method: "PUT",
					headers,
					body: file
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
				return data;
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
		async function leaveCommunity(communityId) {
			const server = serverOf();
			if (!server) return;
			try {
				await server.leaveCommunity(communityId);
				if (state.view.communityId === communityId) backToCommunities();
				await refreshCommunities();
				notify("已退出社区");
			} catch (error) {
				notify(errorText(error));
			}
		}
		/** 重新拉取当前社区详情（编辑/建频道后刷新频道列表等） */
		async function reloadCommunityDetail() {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return;
			try {
				patchView({
					community: await server.getCommunity(communityId),
					communityLoading: false
				});
			} catch (error) {
				notify(errorText(error));
			}
		}
		/** 编辑社区资料 */
		async function updateCommunity(patch) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				const body = {};
				if (patch.name !== void 0) body.name = patch.name;
				if (patch.description !== void 0) body.description = patch.description;
				if (patch.privacy !== void 0) body.privacy = patch.privacy;
				await server.updateCommunity(communityId, body);
				await reloadCommunityDetail();
				notify("社区资料已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 轮换邀请码，返回新码 */
		async function rotateInvite() {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return null;
			try {
				const res = await server.rotateInvite(communityId);
				await reloadCommunityDetail();
				notify("邀请码已更新");
				return res.inviteCode;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 拉成员列表 */
		async function listMembers() {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return [];
			try {
				return (await server.listMembers(communityId)).items;
			} catch (error) {
				notify(errorText(error));
				return [];
			}
		}
		/** 调整成员角色 / owner 转让 */
		async function setMemberRole(userId, role) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				await server.updateMemberRole(communityId, userId, { role });
				notify(role === "owner" ? "所有权已转让" : "成员角色已更新");
				await reloadCommunityDetail();
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 移除成员 */
		async function kickMember(userId) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				await server.removeMember(communityId, userId);
				notify("已移除该成员");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 新建频道（owner/admin），创建后自动进入 */
		async function createChannel(input) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				const body = { name: input.name };
				if (input.topic !== void 0) body.topic = input.topic;
				if (input.kind !== void 0) body.kind = input.kind;
				if (input.isHelp !== void 0) body.isHelp = input.isHelp;
				if (input.isShowcase !== void 0) body.isShowcase = input.isShowcase;
				const created = await server.createChannel(communityId, body);
				await reloadCommunityDetail();
				await selectChannel(created.id);
				notify("频道已创建");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 编辑频道（改名/主题/类型等） */
		async function updateChannelById(channelId, patch) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.updateChannel(channelId, patch);
				await reloadCommunityDetail();
				notify("频道已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 删除频道（owner/admin）；若正打开该频道则关闭它 */
		async function deleteChannelById(channelId) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.deleteChannel(channelId);
				if (state.view.channelId === channelId) {
					closeRealtime();
					patchView({
						channelId: null,
						messages: [],
						nextCursor: null,
						live: false
					});
				}
				await reloadCommunityDetail();
				notify("频道已删除");
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
		/**
		* 发消息：先逐个 PUT 附件拿 r2Key，再走 REST 创建；WS live 时事件回填，否则本地补一条。
		* @returns 是否成功入队（成功时调用方应清空输入与附件）
		*/
		async function sendMessage(content, files = []) {
			const server = serverOf();
			const channelId = state.view.channelId;
			if (!server || !channelId || state.view.sending) return false;
			const text = content.trim();
			if (text.length === 0 && files.length === 0) return false;
			patchView({ sending: true });
			try {
				const attachments = [];
				for (const file of files) {
					const up = await server.uploadObject(file);
					attachments.push({
						r2Key: up.r2Key,
						name: up.name,
						size: up.size,
						mimeType: up.mimeType ?? (file.type.length > 0 ? file.type : null)
					});
				}
				const created = await server.createMessage(channelId, attachments.length > 0 ? {
					content: text,
					attachments
				} : { content: text });
				if (!state.view.live) upsertMessage(created, true);
				patchView({ sending: false });
				return true;
			} catch (error) {
				patchView({ sending: false });
				notify(errorText(error));
				return false;
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
		/** 把当前频道最近消息打成会话快照，返回包体下载链接 */
		async function snapshotChannel(input) {
			const server = serverOf();
			const channelId = state.view.channelId;
			if (!server || !channelId) return null;
			try {
				const body = {};
				const rawTitle = input.title?.trim() ?? "";
				const rawSummary = input.summary?.trim() ?? "";
				if (rawTitle.length > 0) body.title = rawTitle;
				if (rawSummary.length > 0) body.summary = rawSummary;
				const res = await server.createShareSnapshot(channelId, body);
				notify(`已生成分享「${res.share.title}」`);
				return res.downloadUrl;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
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
					})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/Manage.tsx
		const isModerator = (role) => role === "owner" || role === "admin";
		const roleColor = {
			owner: "#f0a13a",
			admin: "#5b8cff",
			member: palette.muted
		};
		const roleName = {
			owner: "所有者",
			admin: "管理员",
			member: "成员"
		};
		/** 频道列表顶部的社区管理菜单（成员 / 邀请码 / 设置 / 退出） */
		function CommunityTools() {
			const talk = useTalkState();
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [dialog, setDialog] = (0, react.useState)(null);
			const communityId = talk.view.communityId;
			const moder = isModerator(talk.view.community?.myRole);
			if (!communityId) return null;
			const menuItems = [];
			if (moder) menuItems.push({
				id: "members",
				label: "成员管理",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {})
			}, {
				id: "invite",
				label: "邀请码",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {})
			}, {
				id: "settings",
				label: "社区设置",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
			}, {
				type: "separator",
				id: "sep"
			});
			menuItems.push({
				id: "leave",
				label: "退出社区",
				danger: true,
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: menuOpen,
					onClose: () => setMenuOpen(false),
					onSelect: (id) => {
						setMenuOpen(false);
						if (id === "members" || id === "invite" || id === "settings") setDialog(id);
						if (id === "leave") {
							if (window.confirm("退出该社区？所有者需先转让所有权。")) leaveCommunity(communityId);
						}
					},
					anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
						size: "sm",
						variant: "ghost",
						icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {}),
						onClick: () => setMenuOpen((v) => !v),
						"aria-label": "社区管理"
					}),
					items: menuItems
				}),
				dialog === "members" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MembersDialog, {
					open: true,
					onClose: () => setDialog(null)
				}) : null,
				dialog === "invite" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InviteDialog, {
					open: true,
					onClose: () => setDialog(null)
				}) : null,
				dialog === "settings" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SettingsDialog, {
					open: true,
					onClose: () => setDialog(null)
				}) : null
			] });
		}
		/** 邀请码展示 / 复制 / 轮换（owner/admin 可轮换；码对所有成员可见） */
		function InviteDialog({ open, onClose }) {
			const community = useTalkState().view.community;
			const code = community?.inviteCode ?? "";
			const moder = isModerator(community?.myRole);
			const [busy, setBusy] = (0, react.useState)(false);
			async function copy() {
				await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(code);
				notify("邀请码已复制");
			}
			async function rotate() {
				setBusy(true);
				const next = await rotateInvite();
				setBusy(false);
				if (next) await copyToClipboard(next);
			}
			async function copyToClipboard(value) {
				await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(value);
				notify("邀请码已复制");
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "邀请码",
				closeLabel: "关闭",
				description: "把邀请码发给对方：对方在「+ 加入」里输入即可进社区。",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						gap: 8
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							readOnly: true,
							value: code,
							"aria-label": "邀请码",
							style: { flex: 1 }
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "outline",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {}),
							onClick: () => void copy(),
							children: "复制"
						}),
						moder ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {}),
							disabled: busy,
							onClick: () => void rotate(),
							children: "换新码"
						}) : null
					]
				})
			});
		}
		/** 社区设置（owner/admin） */
		function SettingsDialog({ open, onClose }) {
			const community = useTalkState().view.community;
			const [name, setName] = (0, react.useState)(community?.name ?? "");
			const [description, setDescription] = (0, react.useState)(community?.description ?? "");
			const [privacy, setPrivacy] = (0, react.useState)(community?.privacy ?? "public");
			const [busy, setBusy] = (0, react.useState)(false);
			async function save() {
				if (name.trim().length === 0) return;
				setBusy(true);
				const ok = await updateCommunity({
					name: name.trim(),
					description: description.length > 0 ? description : null,
					privacy
				});
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "社区设置",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim().length === 0,
					onClick: () => void save(),
					children: "保存"
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
							placeholder: "社区名称",
							"aria-label": "社区名称"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: description,
							onChange: (e) => setDescription(e.target.value),
							placeholder: "简介",
							"aria-label": "简介"
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
		/** 成员管理（owner/admin） */
		function MembersDialog({ open, onClose }) {
			const talk = useTalkState();
			const me = talk.me;
			const myRole = talk.view.community?.myRole ?? null;
			const [members, setMembers] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const isOwner = myRole === "owner";
			const moder = isModerator(myRole);
			(0, react.useEffect)(() => {
				if (!open) return;
				setLoading(true);
				listMembers().then((items) => {
					setMembers(items);
					setLoading(false);
				});
			}, [open]);
			async function act(userId, role, label) {
				if (!window.confirm(`确认${label}？`)) return;
				if (await setMemberRole(userId, role)) setMembers((prev) => prev.map((m) => m.user.id === userId ? {
					...m,
					role
				} : m));
			}
			async function kick(user) {
				if (!window.confirm(`把 ${user.handle} 移出社区？`)) return;
				if (await kickMember(user.id)) setMembers((prev) => prev.filter((m) => m.user.id !== user.id));
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "成员管理",
				closeLabel: "关闭",
				children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: smallText,
					children: "加载成员…"
				}) : members.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: smallText,
					children: "还没有成员。"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 6
					},
					children: members.map((m) => {
						const self = me !== null && m.user.id === me.id;
						const targetIsOwner = m.role === "owner";
						const rowCanManage = moder && !self && !targetIsOwner;
						const canTransfer = isOwner && !self && targetIsOwner;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8,
								padding: "6px 8px",
								borderRadius: 8,
								background: palette.inputBg
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, { label: m.user.handle }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											fontSize: 13,
											fontWeight: 600,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: [m.user.displayName ?? m.user.handle, self ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												color: palette.muted,
												fontSize: 11
											},
											children: "（我）"
										}) : null]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											...smallText,
											fontSize: 11
										},
										children: ["@", m.user.handle]
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										color: roleColor[m.role],
										width: 44
									},
									children: roleName[m.role]
								}),
								canTransfer ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									onClick: () => void act(m.user.id, "owner", "转让所有权给该成员"),
									children: "转让"
								}) : null,
								rowCanManage ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "flex",
										gap: 2
									},
									children: [m.role !== "admin" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => void act(m.user.id, "admin", "设为管理员"),
										children: "设管理员"
									}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										onClick: () => void act(m.user.id, "member", "降为成员"),
										children: "降为成员"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
										onClick: () => void kick(m.user),
										"aria-label": "移除成员",
										children: "移除"
									})]
								}) : null
							]
						}, m.user.id);
					})
				})
			});
		}
		/** 频道列表底部“新建频道”入口（owner/admin） */
		function CreateChannelButton() {
			const talk = useTalkState();
			const [open, setOpen] = (0, react.useState)(false);
			if (!isModerator(talk.view.community?.myRole)) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: { padding: "6px 8px" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {}),
					onClick: () => setOpen(true),
					style: { width: "100%" },
					children: "新建频道"
				})
			}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelDialog, {
				open: true,
				onClose: () => setOpen(false)
			}) : null] });
		}
		function ChannelDialog({ open, onClose, channel }) {
			const isEdit = channel !== void 0;
			const [name, setName] = (0, react.useState)(channel?.name ?? "");
			const [topic, setTopic] = (0, react.useState)(channel?.topic ?? "");
			const [kind, setKind] = (0, react.useState)(channel?.kind ?? "text");
			const [isHelp, setIsHelp] = (0, react.useState)(channel?.isHelp ?? false);
			const [busy, setBusy] = (0, react.useState)(false);
			async function save() {
				if (name.trim().length === 0) return;
				setBusy(true);
				let ok = false;
				if (isEdit) ok = await updateChannelById(channel.id, {
					name: name.trim(),
					topic: topic.length > 0 ? topic : null,
					kind,
					isHelp
				});
				else {
					const body = {
						name: name.trim(),
						kind,
						isHelp
					};
					if (topic.length > 0) body.topic = topic;
					ok = await createChannel(body);
				}
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: isEdit ? "编辑频道" : "新建频道",
				closeLabel: "关闭",
				description: isEdit ? "可改名、改主题与类型。删除频道请用频道旁的「…」。" : "和 Discord 一样，频道用于承载某一主题的实时消息。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim().length === 0,
					onClick: () => void save(),
					children: isEdit ? "保存" : "创建"
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
							placeholder: "频道名，如 general / help",
							"aria-label": "频道名"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: topic,
							onChange: (e) => setTopic(e.target.value),
							placeholder: "主题（显示在消息区顶部，可选）",
							"aria-label": "主题"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6,
								alignItems: "center"
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: kind === "text",
									onClick: () => setKind("text"),
									children: "文字"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: kind === "announcement",
									onClick: () => setKind("announcement"),
									children: "公告"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Pill, {
									active: isHelp,
									onClick: () => setIsHelp((v) => !v),
									children: "求助(可标记解决)"
								})
							]
						})
					]
				})
			});
		}
		/** 每行的频道管理菜单（改名 / 主题 / 删除；owner/admin 可见） */
		function ChannelRowMenu({ channel }) {
			const talk = useTalkState();
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [editing, setEditing] = (0, react.useState)(false);
			if (!isModerator(talk.view.community?.myRole)) return null;
			async function remove() {
				if (!window.confirm(`删除频道 #${channel.name}？其中的消息将一并删除。`)) return;
				if (await deleteChannelById(channel.id)) setMenuOpen(false);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: menuOpen,
				onClose: () => setMenuOpen(false),
				onSelect: (id) => {
					setMenuOpen(false);
					if (id === "edit") setEditing(true);
					if (id === "delete") remove();
				},
				anchor: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					size: "sm",
					variant: "ghost",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEllipsisOutline16, {}),
					onClick: (e) => {
						e.stopPropagation();
						setMenuOpen((v) => !v);
					},
					"aria-label": `管理 #${channel.name}`
				}),
				items: [{
					id: "edit",
					label: "编辑频道",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
				}, {
					id: "delete",
					label: "删除频道",
					danger: true,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
				}]
			}), editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelDialog, {
				open: true,
				channel,
				onClose: () => setEditing(false)
			}) : null] });
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
		const pendingChip = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			padding: "3px 4px 3px 9px",
			borderRadius: 8,
			border: `1px solid ${palette.border}`,
			background: palette.inputBg,
			fontSize: 12,
			color: palette.text,
			maxWidth: 260
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
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconLinkOutline16, {}),
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
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "12px 12px 6px",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						gap: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 13,
							fontWeight: 650,
							color: palette.muted,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							flex: 1
						},
						children: community.name
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunityTools, {})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...railScroll,
						flex: 1
					},
					children: [community.channels.map((ch) => {
						const active = ch.id === activeChannel;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 2,
								padding: "0 4px 0 8px",
								borderRadius: 8,
								background: active ? palette.active : void 0
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void selectChannel(ch.id),
								style: {
									flex: 1,
									minWidth: 0,
									display: "flex",
									alignItems: "center",
									gap: 6,
									padding: "7px 2px",
									border: "none",
									background: "transparent",
									color: palette.text,
									cursor: "pointer",
									textAlign: "left"
								},
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
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelRowMenu, { channel: ch })]
						}, ch.id);
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateChannelButton, {})]
				})]
			});
		}
		function formatBytes(n) {
			if (n < 1024) return `${n} B`;
			const units = [
				"KB",
				"MB",
				"GB"
			];
			let v = n / 1024;
			let i = 0;
			while (v >= 1024 && i < units.length - 1) {
				v /= 1024;
				i += 1;
			}
			return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
		}
		const fileChip = {
			display: "inline-flex",
			alignItems: "center",
			gap: 6,
			padding: "5px 9px",
			borderRadius: 8,
			border: `1px solid ${palette.border}`,
			background: palette.inputBg,
			color: palette.text,
			fontSize: 12,
			textDecoration: "none",
			maxWidth: 260
		};
		function AttachmentList({ attachments }) {
			const list = attachments ?? [];
			if (list.length === 0) return null;
			const images = list.filter((a) => a.kind === "image");
			const files = list.filter((a) => a.kind !== "image");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexWrap: "wrap",
					gap: 8,
					marginTop: 6
				},
				children: [images.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
					href: a.url,
					target: "_blank",
					rel: "noreferrer",
					title: a.name,
					style: {
						display: "block",
						borderRadius: 10,
						overflow: "hidden"
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src: a.url,
						alt: a.name,
						loading: "lazy",
						style: {
							display: "block",
							maxHeight: 240,
							maxWidth: 320,
							borderRadius: 10,
							border: `1px solid ${palette.border}`,
							background: palette.inputBg
						}
					})
				}, a.url)), files.map((a) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("a", {
					href: `${a.url}?download=1`,
					title: "点击下载",
					style: fileChip,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								color: palette.muted,
								display: "inline-flex"
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconDownloadOutline16, {})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: a.name
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								...smallText,
								fontSize: 11,
								flex: "0 0 auto"
							},
							children: formatBytes(a.size)
						})
					]
				}, a.url))]
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							}),
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
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
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AttachmentList, { attachments: item.attachments ?? [] })
						]
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
			const [pendingFiles, setPendingFiles] = (0, react.useState)([]);
			const fileInputRef = (0, react.useRef)(null);
			const MAX_ATTACH = 4;
			const [shareOpen, setShareOpen] = (0, react.useState)(false);
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
			function pickFiles(event) {
				const picked = event.target.files ? Array.from(event.target.files) : [];
				event.target.value = "";
				if (picked.length === 0) return;
				setPendingFiles((prev) => {
					const room = MAX_ATTACH - prev.length;
					if (room <= 0) {
						notify(`一条消息最多 ${MAX_ATTACH} 个附件`);
						return prev;
					}
					if (picked.length > room) notify(`一条消息最多 ${MAX_ATTACH} 个附件，已保留前 ${room} 个`);
					return [...prev, ...picked].slice(0, MAX_ATTACH);
				});
			}
			function removePending(index) {
				setPendingFiles((prev) => prev.filter((_, i) => i !== index));
			}
			async function submit() {
				const text = draft;
				if (text.trim().length === 0 && pendingFiles.length === 0) return;
				if (await sendMessage(text, pendingFiles)) {
					setDraft("");
					setPendingFiles([]);
				}
			}
			const hasOlder = talk.view.nextCursor !== null;
			const canLoadMore = !talk.view.loadingOlder && hasOlder;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconShareOutline16, {}),
								onClick: () => setShareOpen(true),
								"aria-label": "分享会话快照",
								title: "把本频道消息打成可分享的快照"
							}),
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
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "md",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, {}),
								onClick: () => fileInputRef.current?.click(),
								disabled: talk.view.sending,
								"aria-label": "添加附件",
								title: "添加附件"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									display: "flex",
									flexDirection: "column",
									gap: 6,
									minWidth: 0
								},
								children: [pendingFiles.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										display: "flex",
										flexWrap: "wrap",
										gap: 6
									},
									children: pendingFiles.map((f, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: pendingChip,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: f.name
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													...smallText,
													fontSize: 11,
													flex: "0 0 auto"
												},
												children: formatBytes(f.size)
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												size: "sm",
												variant: "ghost",
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {}),
												onClick: () => removePending(i),
												"aria-label": `移除 ${f.name}`
											})
										]
									}, `${f.name}-${f.size}-${f.lastModified}-${f.type}`))
								}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
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
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "md",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {}),
								disabled: talk.view.sending || draft.trim().length === 0 && pendingFiles.length === 0,
								onClick: () => void submit(),
								"aria-label": "发送"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: fileInputRef,
								type: "file",
								multiple: true,
								onChange: (e) => pickFiles(e),
								style: { display: "none" },
								"aria-hidden": true,
								tabIndex: -1
							})
						]
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareSnapshotModal, {
				open: shareOpen,
				onClose: () => setShareOpen(false),
				channelName: channel?.name ?? ""
			})] });
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
		function ShareSnapshotModal({ open, onClose, channelName }) {
			const [title, setTitle] = (0, react.useState)("");
			const [summary, setSummary] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			async function submit() {
				if (busy) return;
				setBusy(true);
				const url = await snapshotChannel({
					title,
					summary
				});
				setBusy(false);
				if (!url) return;
				if (navigator.clipboard) try {
					await navigator.clipboard.writeText(url);
				} catch {}
				setTitle("");
				setSummary("");
				onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose,
				title: "分享会话快照",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy,
					onClick: () => void submit(),
					children: busy ? "打包中…" : "生成并复制链接"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: `会话快照：${channelName}`
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: summary,
							onChange: (e) => setSummary(e.target.value),
							placeholder: "一句话摘要（可选）"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12
							},
							children: "把本频道最近最多 200 条消息打包成 JSON 会话快照；生成后链接自动复制到剪贴板，可分享给其它人。"
						})
					]
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