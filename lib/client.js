window.__ModuleLoader__.load({
	id: "dsh-talk",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region packages/types/src/entities.ts
		/**
		* 消息可「撤回」（作者删除）的有效窗口。
		* 超过该时间后作者不能删除自己的消息，只能编辑（moderator 删除不受此限）。
		*/
		const MESSAGE_RETRACT_MS = 12e4;
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/_internal/compareValues.mjs
		function nullishRank(value) {
			if (value === null) return 1;
			if (value === void 0) return 2;
			return 0;
		}
		function compareAscending(a, b) {
			const aRank = nullishRank(a);
			const bRank = nullishRank(b);
			if (aRank < bRank) return -1;
			if (aRank > bRank) return 1;
			if (aRank !== 0) return 0;
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
		function compareValues(a, b, order) {
			return order === "asc" ? compareAscending(a, b) : compareAscending(b, a);
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/array/orderBy.mjs
		/**
		* Sorts an array of objects based on the given `criteria` and their corresponding order directions.
		*
		* - If you provide keys, it sorts the objects by the values of those keys.
		* - If you provide functions, it sorts based on the values returned by those functions.
		*
		* The function returns the array of objects sorted in corresponding order directions.
		* If two objects have the same value for the current criterion, it uses the next criterion to determine their order.
		* If the number of orders is less than the number of criteria, it uses the last order for the rest of the criteria.
		*
		* @template T - The type of elements in the array.
		* @param arr - The array of objects to be sorted.
		* @param criteria  - The criteria for sorting. This can be an array of object keys or functions that return values used for sorting.
		* @param orders - An array of order directions ('asc' for ascending or 'desc' for descending).
		* @returns The sorted array.
		*
		* @example
		* // Sort an array of objects by 'user' in ascending order and 'age' in descending order.
		* const users = [
		*   { user: 'fred', age: 48 },
		*   { user: 'barney', age: 34 },
		*   { user: 'fred', age: 40 },
		*   { user: 'barney', age: 36 },
		* ];
		*
		* const result = orderBy(users, [obj => obj.user, 'age'], ['asc', 'desc']);
		* // result will be:
		* // [
		* //   { user: 'barney', age: 36 },
		* //   { user: 'barney', age: 34 },
		* //   { user: 'fred', age: 48 },
		* //   { user: 'fred', age: 40 },
		* // ]
		*/
		function orderBy(arr, criteria, orders) {
			return arr.slice().sort((a, b) => {
				const ordersLength = orders.length;
				for (let i = 0; i < criteria.length; i++) {
					const order = ordersLength > i ? orders[i] : orders[ordersLength - 1];
					const criterion = criteria[i];
					const criterionIsFunction = typeof criterion === "function";
					const result = compareValues(criterionIsFunction ? criterion(a) : a[criterion], criterionIsFunction ? criterion(b) : b[criterion], order);
					if (result !== 0) return result;
				}
				return 0;
			});
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/array/partition.mjs
		function partition(arr, isInTruthy) {
			const truthy = [];
			const falsy = [];
			for (let i = 0; i < arr.length; i++) {
				const item = arr[i];
				if (isInTruthy(item, i, arr)) truthy.push(item);
				else falsy.push(item);
			}
			return [truthy, falsy];
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/array/sortBy.mjs
		/**
		* Sorts an array of objects based on the given `criteria`.
		*
		* - If you provide keys, it sorts the objects by the values of those keys.
		* - If you provide functions, it sorts based on the values returned by those functions.
		*
		* The function returns the array of objects sorted in ascending order.
		* If two objects have the same value for the current criterion, it uses the next criterion to determine their order.
		*
		* @template T - The type of the objects in the array.
		* @param arr - The array of objects to be sorted.
		* @param criteria - The criteria for sorting. This can be an array of object keys or functions that return values used for sorting.
		* @returns The sorted array.
		*
		* @example
		* const users = [
		*  { user: 'foo', age: 24 },
		*  { user: 'bar', age: 7 },
		*  { user: 'foo', age: 8 },
		*  { user: 'bar', age: 29 },
		* ];
		*
		* sortBy(users, ['user', 'age']);
		* sortBy(users, [obj => obj.user, 'age']);
		* // results will be:
		* // [
		* //   { user : 'bar', age: 7 },
		* //   { user : 'bar', age: 29 },
		* //   { user : 'foo', age: 8 },
		* //   { user : 'foo', age: 24 },
		* // ]
		*/
		function sortBy(arr, criteria) {
			return orderBy(arr, criteria, ["asc"]);
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/array/uniq.mjs
		/**
		* Creates a duplicate-free version of an array.
		*
		* This function takes an array and returns a new array containing only the unique values
		* from the original array, preserving the order of first occurrence.
		*
		* @template T - The type of elements in the array.
		* @param arr - The array to process.
		* @returns A new array with only unique values from the original array.
		*
		* @example
		* const array = [1, 2, 2, 3, 4, 4, 5];
		* const result = uniq(array);
		* // result will be [1, 2, 3, 4, 5]
		*/
		function uniq(arr) {
			return [...new Set(arr)];
		}
		//#endregion
		//#region packages/client/src/config.ts
		var HostConfigError = class extends Error {
			status;
			constructor(message, status) {
				super(message);
				this.status = status;
			}
		};
		/** 从错误响应体里取出可读文案：优先 JSON 的 message，其次原文，最后 fallback */
		function errorMessageFrom(text, fallback) {
			if (text.length === 0) return fallback;
			try {
				const data = JSON.parse(text);
				if (typeof data.message === "string" && data.message.length > 0) return data.message;
			} catch {}
			return text;
		}
		async function hostFetch(input, init) {
			const res = await fetch(input, init);
			const text = await res.text();
			if (!res.ok) throw new HostConfigError(errorMessageFrom(text, ""), res.status);
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
		/** GET /api/talk/sessions —— 本机可分享的 DSH 会话 */
		function hostSessions() {
			return hostFetch("/api/talk/sessions");
		}
		/** GET /api/talk/session-package —— 打包一个会话，返回包体原始文本 */
		async function hostSessionPackage(sessionId) {
			const res = await fetch(`/api/talk/session-package?sessionId=${encodeURIComponent(sessionId)}`);
			const text = await res.text();
			if (!res.ok) throw new HostConfigError(errorMessageFrom(text, `打包失败 HTTP ${res.status}`), res.status);
			return text;
		}
		/** POST /api/talk/clone —— 让 host 下载分享包；会话包会直接还原成本地会话 */
		function hostClone(downloadUrl, cwd) {
			return hostFetch("/api/talk/clone", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(cwd ? {
					downloadUrl,
					cwd
				} : { downloadUrl })
			});
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/predicate/isPlainObject.mjs
		/**
		* Checks if a given value is a plain object.
		*
		* @param value - The value to check.
		* @returns True if the value is a plain object, otherwise false.
		*
		* @example
		* ```typescript
		* // ✅👇 True
		*
		* isPlainObject({ });                       // ✅
		* isPlainObject({ key: 'value' });          // ✅
		* isPlainObject({ key: new Date() });       // ✅
		* isPlainObject(new Object());              // ✅
		* isPlainObject(Object.create(null));       // ✅
		* isPlainObject({ nested: { key: true} });  // ✅
		* isPlainObject(new Proxy({}, {}));         // ✅
		* isPlainObject({ [Symbol('tag')]: 'A' });  // ✅
		*
		* // ✅👇 (cross-realms, node context, workers, ...)
		* const runInNewContext = await import('node:vm').then(
		*     (mod) => mod.runInNewContext
		* );
		* isPlainObject(runInNewContext('({})'));   // ✅
		*
		* // ❌👇 False
		*
		* class Test { };
		* isPlainObject(new Test())           // ❌
		* isPlainObject(10);                  // ❌
		* isPlainObject(null);                // ❌
		* isPlainObject('hello');             // ❌
		* isPlainObject([]);                  // ❌
		* isPlainObject(new Date());          // ❌
		* isPlainObject(new Uint8Array([1])); // ❌
		* isPlainObject(Buffer.from('ABC'));  // ❌
		* isPlainObject(Promise.resolve({})); // ❌
		* isPlainObject(Object.create({}));   // ❌
		* isPlainObject(new (class Cls {}));  // ❌
		* isPlainObject(globalThis);          // ❌,
		* ```
		*/
		function isPlainObject(value) {
			if (!value || typeof value !== "object") return false;
			const proto = Object.getPrototypeOf(value);
			if (!(proto === null || proto === Object.prototype || Object.getPrototypeOf(proto) === null)) return false;
			return Object.prototype.toString.call(value) === "[object Object]";
		}
		//#endregion
		//#region node_modules/.pnpm/es-toolkit@1.52.0/node_modules/es-toolkit/dist/object/pickBy.mjs
		/**
		* Creates a new object composed of the properties that satisfy the predicate function.
		*
		* This function takes an object and a predicate function, and returns a new object that
		* includes only the properties for which the predicate function returns true.
		*
		* @template T - The type of object.
		* @param obj - The object to pick properties from.
		* @param shouldPick - A predicate function that determines
		* whether a property should be picked. It takes the property's key and value as arguments and returns `true`
		* if the property should be picked, and `false` otherwise. Numeric keys are passed as strings.
		* @returns A new object with the properties that satisfy the predicate function.
		*
		* @example
		* const obj = { a: 1, b: 'pick', c: 3 };
		* const shouldPick = (value) => typeof value === 'string';
		* const result = pickBy(obj, shouldPick);
		* // result will be { b: 'pick' }
		*/
		function pickBy(obj, shouldPick) {
			const result = {};
			const keys = Object.keys(obj);
			for (let i = 0; i < keys.length; i++) {
				const key = keys[i];
				const objectKey = key;
				const value = obj[objectKey];
				if (shouldPick(value, key)) result[objectKey] = value;
			}
			return result;
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
		const errorMessage$1 = (data, text) => {
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
		/** 读取响应体并尽力解析 JSON；空体或非 JSON 时 data 为 null */
		async function readJson(res) {
			const text = await res.text();
			if (text.length === 0) return {
				data: null,
				text
			};
			try {
				return {
					data: JSON.parse(text),
					text
				};
			} catch {
				return {
					data: null,
					text
				};
			}
		}
		/** 非 2xx 统一抛 ServerApiError；2xx 返回解析后的 JSON（空体为 null） */
		async function parseResponse(res) {
			const { data, text } = await readJson(res);
			if (!res.ok) {
				const err = data;
				throw new ServerApiError(res.status, err?.code ?? "AUTH_ERROR", errorMessage$1(data, text), err?.requestId, err?.details);
			}
			return data;
		}
		function toQuery(params) {
			const entries = Object.entries(pickBy(params, (v) => v !== void 0 && v !== null && String(v).length > 0));
			if (entries.length === 0) return "";
			return `?${entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&")}`;
		}
		const NETWORK_RETRY_MAX = 4;
		const NETWORK_RETRY_BASE_MS = 1e3;
		const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
		async function fetchWithRetry(input, init) {
			let lastError;
			for (let attempt = 0; attempt <= NETWORK_RETRY_MAX; attempt += 1) try {
				return await fetch(input, init);
			} catch (error) {
				lastError = error;
				if (attempt === NETWORK_RETRY_MAX) break;
				await sleep(NETWORK_RETRY_BASE_MS * (attempt + 1));
			}
			throw lastError;
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
				return parseResponse(await fetchWithRetry(this.url(path), init));
			}
			/** 登录/注册专用：同时从响应头/body 收集会话 token（Bearer 用） */
			async authCall(method, path, body) {
				const headers = { "content-type": "application/json" };
				if (this.hasToken) headers.authorization = `Bearer ${this.token}`;
				const res = await fetchWithRetry(this.url(path), {
					method,
					headers,
					body: JSON.stringify(body)
				});
				const data = await parseResponse(res);
				const tokenFromHeader = res.headers.get("set-auth-token");
				const tokenFromBody = isPlainObject(data) && typeof data.token === "string" ? data.token : null;
				return {
					user: isPlainObject(data) && isPlainObject(data.user) ? data.user : null,
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
			/** POST /api/auth/update-user —— 改资料/改用户名。
			* 注意：Better Auth 该端点仅返回 { status: true }，不含 user；
			* 需要更新后的 user 请再调 getSession()。 */
			updateUser(body) {
				return this.call("POST", "/api/auth/update-user", body, true);
			}
			/** POST /api/auth/send-verification-email —— 重发验证邮件 */
			sendVerificationEmail(body) {
				return this.call("POST", "/api/auth/send-verification-email", body);
			}
			/** POST /api/auth/email-otp/send-verification-otp —— 发送 6 位邮箱验证码 */
			sendVerificationOtp(body) {
				return this.call("POST", "/api/auth/email-otp/send-verification-otp", body);
			}
			/** POST /api/auth/email-otp/verify-email —— 校验 6 位验证码；token 非空时已自动登录 */
			verifyEmail(body) {
				return this.authCall("POST", "/api/auth/email-otp/verify-email", body);
			}
			/** POST /api/auth/request-password-reset —— 忘记密码：发重置邮件 */
			requestPasswordReset(body) {
				return this.call("POST", "/api/auth/request-password-reset", body);
			}
			/** POST /api/auth/reset-password —— 用邮件里的 token 重设密码 */
			resetPassword(body) {
				return this.call("POST", "/api/auth/reset-password", body);
			}
			/** POST /api/auth/email-otp/request-password-reset —— 忘记密码：向邮箱发 6 位重置验证码 */
			requestPasswordResetOtp(email) {
				return this.call("POST", "/api/auth/email-otp/request-password-reset", { email });
			}
			/** POST /api/auth/email-otp/reset-password —— 用验证码重设密码（应用内完成） */
			resetPasswordWithOtp(body) {
				return this.call("POST", "/api/auth/email-otp/reset-password", body);
			}
			/** GET /api/communities/discover —— 公开社区目录（模糊搜索 + 排序） */
			discoverCommunities(opts = {}) {
				const qs = toQuery({
					q: opts.q ?? "",
					sort: opts.sort ?? "",
					limit: opts.limit ?? 20,
					offset: opts.offset ?? 0
				});
				return this.call("GET", `/api/communities/discover${qs}`, void 0, true);
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
			/** DELETE /api/communities/:id —— 删除社区（仅 owner；内容级联清除） */
			deleteCommunity(communityId) {
				return this.call("DELETE", `/api/communities/${communityId}`, void 0, true);
			}
			/** POST /api/communities/:id/channels —— 新建频道（owner/admin） */
			createChannel(communityId, body) {
				return this.call("POST", `/api/communities/${communityId}/channels`, body, true);
			}
			/** PATCH /api/communities/:id —— 改社区（owner/admin） */
			updateCommunity(communityId, body) {
				return this.call("PATCH", `/api/communities/${communityId}`, body, true);
			}
			/** POST /api/communities/:id/invites —— 邀请已注册用户入社区（owner/admin） */
			createInvite(communityId, body) {
				return this.call("POST", `/api/communities/${communityId}/invites`, body, true);
			}
			/** POST /api/invites/:id/accept —— 接受社区邀请并加入 */
			acceptInvite(inviteId) {
				return this.call("POST", `/api/invites/${inviteId}/accept`, {}, true);
			}
			/** POST /api/invites/:id/decline —— 拒绝社区邀请 */
			declineInvite(inviteId) {
				return this.call("POST", `/api/invites/${inviteId}/decline`, {}, true);
			}
			/** GET /api/notifications —— 我的站内信（新→旧，带未读数） */
			listNotifications(opts = {}) {
				const qs = toQuery({
					limit: opts.limit ?? 20,
					onlyUnread: opts.onlyUnread ? "1" : ""
				});
				return this.call("GET", `/api/notifications${qs}`, void 0, true);
			}
			/** POST /api/notifications/:id/read —— 标记一条站内信已读 */
			markNotificationRead(notificationId) {
				return this.call("POST", `/api/notifications/${notificationId}/read`, {}, true);
			}
			/** POST /api/notifications/read-all —— 全部已读 */
			markAllNotificationsRead() {
				return this.call("POST", "/api/notifications/read-all", {}, true);
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
			/** GET /api/communities/:id/bans —— 封禁列表（owner/admin） */
			listBans(communityId) {
				return this.call("GET", `/api/communities/${communityId}/bans`, void 0, true);
			}
			/** POST /api/communities/:id/bans —— 封禁（按 userId 或 handleOrEmail） */
			banUser(communityId, body) {
				return this.call("POST", `/api/communities/${communityId}/bans`, body, true);
			}
			/** DELETE /api/communities/:id/bans/:userId —— 解封 */
			unbanUser(communityId, userId) {
				return this.call("DELETE", `/api/communities/${communityId}/bans/${userId}`, void 0, true);
			}
			/** PATCH /api/channels/:id —— 频道改名/主题/类型（owner/admin） */
			updateChannel(channelId, body) {
				return this.call("PATCH", `/api/channels/${channelId}`, body, true);
			}
			/** DELETE /api/channels/:id —— 删频道（owner/admin） */
			deleteChannel(channelId) {
				return this.call("DELETE", `/api/channels/${channelId}`, void 0, true);
			}
			/** GET /api/channels/:id/messages —— 历史（desc 新→旧；cursor=某条 createdAt 翻更早）
			*  threadId 传讨论组 id 时返回该讨论组消息；缺省为主频道直接消息 */
			listMessages(channelId, opts = {}) {
				const query = toQuery({
					cursor: opts.cursor ?? "",
					limit: opts.limit ?? 50,
					direction: opts.direction ?? "desc",
					threadId: opts.threadId ?? ""
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
			/** GET /api/channels/:id/online —— 该频道当前在线成员（读 DO presence 快照） */
			channelOnline(channelId) {
				return this.call("GET", `/api/channels/${channelId}/online`, void 0, true);
			}
			/** GET /api/channels/:channelId/threads —— 频道讨论组（默认活跃；archived=all 含归档） */
			listThreads(channelId, archived = void 0) {
				const query = toQuery({ archived: archived ?? "" });
				return this.call("GET", `/api/channels/${channelId}/threads${query}`, void 0, true);
			}
			/** POST /api/channels/:channelId/threads —— 创建讨论组（可带起点消息） */
			createThread(channelId, body) {
				return this.call("POST", `/api/channels/${channelId}/threads`, body, true);
			}
			/** GET /api/threads/:id —— 讨论组详情（含我未读） */
			getThread(threadId) {
				return this.call("GET", `/api/threads/${threadId}`, void 0, true);
			}
			/** PATCH /api/threads/:id —— 改名 / 改可见性 / 改密码（发起人或 owner/admin） */
			updateThread(threadId, patch) {
				return this.call("PATCH", `/api/threads/${threadId}`, patch, true);
			}
			/** POST /api/threads/:id/join —— 凭密码进入私密讨论组（公开组幂等；无密码的私密组 403） */
			joinThread(threadId, passcode) {
				const body = {};
				if (passcode !== void 0 && passcode.length > 0) body.passcode = passcode;
				return this.call("POST", `/api/threads/${threadId}/join`, body, true);
			}
			/** GET /api/threads/:id/members —— 讨论组成员名单（需可进入该讨论组） */
			listThreadMembers(threadId) {
				return this.call("GET", `/api/threads/${threadId}/members`, void 0, true);
			}
			/** POST /api/threads/:id/members —— 直接把社区成员拉入讨论组 */
			addThreadMember(threadId, userId) {
				return this.call("POST", `/api/threads/${threadId}/members`, { userId }, true);
			}
			/** DELETE /api/threads/:id/members/:userId —— 移除成员（移除自己即退出） */
			removeThreadMember(threadId, userId) {
				return this.call("DELETE", `/api/threads/${threadId}/members/${userId}`, void 0, true);
			}
			/** GET /api/threads/:id/candidates?q= —— 可拉入的社区成员（尚未在组内） */
			listThreadCandidates(threadId, q) {
				const query = toQuery({ q: q ?? "" });
				return this.call("GET", `/api/threads/${threadId}/candidates${query}`, void 0, true);
			}
			/** POST /api/threads/:id/archive —— 手动归档 */
			archiveThread(threadId) {
				return this.call("POST", `/api/threads/${threadId}/archive`, {}, true);
			}
			/** POST /api/threads/:id/reopen —— 恢复活跃 */
			reopenThread(threadId) {
				return this.call("POST", `/api/threads/${threadId}/reopen`, {}, true);
			}
			/** DELETE /api/threads/:id —— 删除讨论组 */
			deleteThread(threadId) {
				return this.call("DELETE", `/api/threads/${threadId}`, void 0, true);
			}
			/** GET /api/threads/:id/read-state —— 我在讨论组的已读 */
			getThreadReadState(threadId) {
				return this.call("GET", `/api/threads/${threadId}/read-state`, void 0, true);
			}
			/** POST /api/threads/:id/read-state —— 上报读到讨论组的哪条 */
			markThreadRead(threadId, body) {
				return this.call("POST", `/api/threads/${threadId}/read-state`, body, true);
			}
			/** GET /api/messages/search —— 社区内消息搜索（按正文模糊匹配，倒序） */
			searchMessages(communityId, q, opts = {}) {
				const query = toQuery({
					communityId,
					q,
					cursor: opts.cursor ?? "",
					limit: opts.limit ?? 20
				});
				return this.call("GET", `/api/messages/search${query}`, void 0, true);
			}
			/** POST /api/shares/agent-session —— 登记一条 DSH 会话分享（包体已直传 R2） */
			createAgentSessionShare(body) {
				return this.call("POST", "/api/shares/agent-session", body, true);
			}
			/** GET /api/shares/:id —— 分享详情（含 downloadUrl） */
			getShare(shareId) {
				return this.call("GET", `/api/shares/${shareId}`, void 0, true);
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
				return parseResponse(await fetch(this.url("/api/r2/objects"), {
					method: "PUT",
					headers,
					body: file
				}));
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
			threadId: null,
			messages: [],
			nextCursor: null,
			messagesLoading: false,
			loadingOlder: false,
			sending: false,
			live: false,
			onlineCount: 0,
			replyingTo: null,
			focusMessageId: null,
			members: [],
			membersLoading: false
		};
		let state = {
			open: false,
			busy: false,
			phase: "booting",
			settings: null,
			me: null,
			meEmail: null,
			communities: [],
			error: "",
			toast: "",
			view: INITIAL_VIEW,
			pendingEmail: null,
			inboxOpen: false,
			notifications: [],
			inboxLoading: false,
			inboxUnread: 0,
			inboxBusyId: null,
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
		/** update-user 只回 { status: true }，要拿更新后的 user 得再拉一次会话 */
		async function refreshedUser(server) {
			const session = await server.getSession();
			return session?.user ? toUser(session.user) : null;
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
		/** 清空站内信状态（登出 / 切换账号时调用） */
		function resetInbox() {
			setState({
				inboxOpen: false,
				notifications: [],
				inboxLoading: false,
				inboxUnread: 0,
				inboxBusyId: null
			});
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
		function activateTalk() {
			if (!state.open) {
				setState({ open: true });
				refresh();
			}
			bindPresenceListeners();
		}
		function deactivateTalk() {
			if (!state.open) return;
			closeRealtime();
			unbindPresenceListeners();
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
		/** 邮箱注册：用户名由服务端从邮箱 @ 前缀自动派生，客户端不再提交。昵称可选。 */
		async function register(input) {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			const body = {
				name: input.name?.trim() || input.email.split("@")[0] || "dsh-user",
				email: input.email,
				password: input.password
			};
			await makeServer(settings).signUpEmail(body);
			setState({
				pendingEmail: input.email.trim(),
				error: ""
			});
		}
		/** 校验邮箱验证码；验证成功且 autoSignInAfterVerification 开启时自动登录 */
		async function verifyOtp(otp) {
			const settings = state.settings;
			const email = state.pendingEmail;
			if (!settings || !email) throw new Error("请先注册并获取验证码");
			const result = await makeServer(settings).verifyEmail({
				email,
				otp: otp.trim()
			});
			if (!result.user) throw new Error("验证失败，请重试");
			if (result.token) {
				await applySession({
					user: result.user,
					token: result.token
				});
				return;
			}
			setState({ pendingEmail: null });
			notify("邮箱验证成功，请登录");
		}
		/** 重新发送邮箱验证码 */
		async function resendVerificationOtp() {
			const settings = state.settings;
			const email = state.pendingEmail;
			if (!settings || !email) throw new Error("尚未就绪");
			await makeServer(settings).sendVerificationOtp({
				email,
				type: "email-verification"
			});
			notify("验证码已重新发送");
		}
		/** 从验证码界面返回登录页 */
		function cancelVerification() {
			setState({ pendingEmail: null });
		}
		/**
		* 忘记密码 step1：请求把 6 位重置验证码发到邮箱。
		* 服务端对「邮箱不存在」也返回成功（防探测），文案由调用方统一提示。
		*/
		async function requestPasswordResetOtp(email) {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			await makeServer(settings).requestPasswordResetOtp(email.trim());
		}
		/** 忘记密码 step2：用邮箱收到的验证码重设密码（成功后回登录页手动登录） */
		async function resetPasswordWithOtp(input) {
			const settings = state.settings;
			if (!settings) throw new Error("尚未就绪");
			await makeServer(settings).resetPasswordWithOtp({
				email: input.email.trim(),
				otp: input.otp.trim(),
				password: input.password
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
				const communities = await makeServer(next).myCommunities();
				resetInbox();
				setState({
					busy: false,
					phase: "ready",
					settings: next,
					me,
					meEmail: result.user.email,
					communities,
					view: { ...INITIAL_VIEW }
				});
				refreshInboxUnread();
			} catch (error) {
				setState({
					busy: false,
					phase: "anon",
					error: errorText(error)
				});
				throw error;
			}
		}
		/** 修改昵称（displayName）：调用 Better Auth update-user，成功后同步本地 me。 */
		async function updateUserNickname(nickname) {
			const server = serverOf();
			if (!server) return false;
			const trimmed = nickname.trim();
			if (trimmed.length === 0) return false;
			if (trimmed === (state.me?.displayName ?? "")) {
				notify("昵称没有变化");
				return false;
			}
			try {
				const body = { name: trimmed };
				await server.updateUser(body);
				const me = await refreshedUser(server) ?? state.me;
				if (!me) {
					notify("无法获取最新用户信息");
					return false;
				}
				setState({ me });
				notify("昵称已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/**
		* 修改用户名（@handle）：客户端先做字符集/长度预检，最终以服务端校验为准
		* （唯一性、每周一次都由服务端强制），成功后同步本地 me 与 host 侧 handle。
		*/
		async function updateUserUsername(username) {
			const server = serverOf();
			if (!server) return false;
			const trimmed = username.trim();
			if (trimmed.length === 0) return false;
			if (!/^[A-Za-z0-9]+$/.test(trimmed)) {
				notify("用户名只能包含大小写字母和数字");
				return false;
			}
			if (trimmed.length < 4) {
				notify("用户名至少需要 4 个字符");
				return false;
			}
			if (trimmed.toLowerCase() === (state.me?.handle ?? "").toLowerCase()) {
				notify("用户名没有变化");
				return false;
			}
			try {
				const body = { username: trimmed };
				await server.updateUser(body);
				const me = await refreshedUser(server) ?? state.me;
				if (!me) {
					notify("无法获取最新用户信息");
					return false;
				}
				setState({ me });
				if (state.settings && state.settings.handle !== me.handle) try {
					setState({ settings: await hostConfigSet({ handle: me.handle }) });
				} catch {}
				notify("用户名已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 修改密码：调用 Better Auth change-password（服务端校验当前密码） */
		async function changePassword(input) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.changePassword(input);
				notify("密码已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 上传一张图片到 R2，返回公开 URL；失败返回 null（内部已 toast） */
		async function uploadImage(file) {
			const server = serverOf();
			if (!server) return null;
			if (!file.type.startsWith("image/")) {
				notify("请选择图片文件");
				return null;
			}
			try {
				return (await server.uploadObject(file)).url;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 修改用户头像：先上传拿 URL，再更新 Better Auth user.image，并同步本地 me */
		async function updateUserAvatar(file) {
			const server = serverOf();
			if (!server) return false;
			const url = await uploadImage(file);
			if (!url) return false;
			try {
				await server.updateUser({ image: url });
				const me = await refreshedUser(server) ?? state.me;
				if (!me) {
					notify("无法获取最新用户信息");
					return false;
				}
				setState({ me });
				notify("头像已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 移除用户头像，回退到字母头像 */
		async function removeUserAvatar() {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.updateUser({ image: null });
				const me = await refreshedUser(server) ?? state.me;
				if (!me) {
					notify("无法获取最新用户信息");
					return false;
				}
				setState({ me });
				notify("已移除头像");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
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
				meEmail: null,
				communities: [],
				error: "",
				view: { ...INITIAL_VIEW },
				settings: settings === null ? null : {
					...settings,
					token: ""
				},
				pendingEmail: null
			});
			resetInbox();
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
					resetInbox();
					setState({
						phase: "anon",
						busy: false,
						settings,
						pendingEmail: null
					});
					return;
				}
				const server = makeServer(settings);
				const session = await server.getSession();
				if (!session?.session || !session.user) {
					resetInbox();
					setState({
						phase: "anon",
						busy: false,
						settings,
						pendingEmail: null
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
					meEmail: session.user.email,
					communities
				});
				refreshInboxUnread();
			} catch (error) {
				if (error instanceof ServerApiError && error.status === 401) {
					resetInbox();
					setState({
						phase: "anon",
						busy: false,
						me: null,
						meEmail: null,
						communities: [],
						settings: state.settings,
						pendingEmail: null
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
		/** 打开收件箱并拉取我的站内信 */
		async function openInbox() {
			const server = serverOf();
			if (!state.open || !server) return;
			setState({
				inboxOpen: true,
				inboxLoading: true
			});
			try {
				const res = await server.listNotifications({ limit: 50 });
				setState({
					notifications: res.items,
					inboxUnread: res.unread,
					inboxLoading: false
				});
			} catch (error) {
				setState({ inboxLoading: false });
				notify(errorText(error));
			}
		}
		function closeInbox() {
			setState({ inboxOpen: false });
		}
		/** 轻量刷新未读数（角标 / 定时轮询用） */
		async function refreshInboxUnread() {
			const server = serverOf();
			if (!server || !state.open) return;
			try {
				const res = await server.listNotifications({ limit: 1 });
				if (res.unread !== state.inboxUnread) setState({ inboxUnread: res.unread });
			} catch {}
		}
		function mapNotification(item, patch) {
			return {
				...item,
				...patch
			};
		}
		/** 接受某条邀请类站内信（成功即入会并打开社区） */
		async function acceptInvite(inviteId) {
			const server = serverOf();
			if (!server || state.inboxBusyId !== null) return false;
			setState({ inboxBusyId: inviteId });
			try {
				const joined = await server.acceptInvite(inviteId);
				setState({
					inboxBusyId: null,
					inboxOpen: false
				});
				notify(`已加入社区「${joined.name}」`);
				await refreshCommunities();
				await openCommunity(joined.id);
				refreshInboxUnread();
				return true;
			} catch (error) {
				setState({ inboxBusyId: null });
				notify(errorText(error));
				return false;
			}
		}
		/** 拒绝某条邀请类站内信 */
		async function declineInvite(inviteId) {
			const server = serverOf();
			if (!server || state.inboxBusyId !== null) return false;
			setState({ inboxBusyId: inviteId });
			try {
				await server.declineInvite(inviteId);
				setState({
					inboxBusyId: null,
					notifications: state.notifications.map((n) => n.kind === "invite" && n.data?.inviteId === inviteId ? mapNotification(n, {
						isRead: true,
						invite: n.invite ? {
							...n.invite,
							status: "declined"
						} : n.invite
					}) : n)
				});
				notify("已拒绝该邀请");
				refreshInboxUnread();
				return true;
			} catch (error) {
				setState({ inboxBusyId: null });
				notify(errorText(error));
				return false;
			}
		}
		/** 全部已读 */
		async function markAllNotificationsRead() {
			const server = serverOf();
			if (!server) return;
			try {
				await server.markAllNotificationsRead();
				setState({
					notifications: state.notifications.map((n) => mapNotification(n, { isRead: true })),
					inboxUnread: 0
				});
			} catch (error) {
				notify(errorText(error));
			}
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
				threadId: null,
				messages: [],
				nextCursor: null,
				live: false,
				onlineCount: 0,
				replyingTo: null,
				focusMessageId: null
			});
			try {
				const detail = await server.getCommunity(communityId);
				patchView({
					community: detail,
					communityLoading: false
				});
				if (detail.myRole) {
					refreshCommunityMembers(communityId);
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
				if (input.iconUrl !== void 0) body.iconUrl = input.iconUrl;
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
		/** 发现公开社区（社区目录；支持关键词搜索与排序） */
		async function discoverCommunities(opts = {}) {
			const server = serverOf();
			if (!server) return [];
			try {
				return (await server.discoverCommunities({
					q: opts.q?.trim() ?? "",
					sort: opts.sort ?? "hot",
					limit: 20,
					offset: opts.offset ?? 0
				})).items;
			} catch (error) {
				notify(errorText(error));
				return [];
			}
		}
		/** 直接加入公开社区（发现页用；私有社区需邀请码走 joinCommunityByCode） */
		async function joinPublicCommunity(communityId) {
			const server = serverOf();
			if (!server) return false;
			try {
				const joined = await server.joinCommunity(communityId);
				await refreshCommunities();
				await openCommunity(joined.id);
				notify(`已加入社区「${joined.name}」`);
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
		/** 删除社区（仅 owner 可见入口）；服务端级联清除频道/消息/成员 */
		async function deleteCommunity(communityId) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.deleteCommunity(communityId);
				if (state.view.communityId === communityId) backToCommunities();
				await refreshCommunities();
				notify("社区已删除");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
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
				if (patch.iconUrl !== void 0) body.iconUrl = patch.iconUrl;
				await server.updateCommunity(communityId, body);
				await reloadCommunityDetail();
				await refreshCommunities();
				notify("社区资料已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 邀请已注册用户入社区（owner/admin）；目标会收到站内信 + 邮件 */
		async function inviteMember(handleOrEmail) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			const who = handleOrEmail.trim();
			if (!who) return false;
			try {
				notify(`已向 ${(await server.createInvite(communityId, { handleOrEmail: who })).invitee.handle} 发送邀请（站内信 + 邮件）`);
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
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
		/** 按成员行封禁（userId）；服务端会同时把 TA 移出成员 */
		async function banUser(userId, reason) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				const body = { userId };
				if (reason?.trim()) body.reason = reason.trim();
				notify(`已封禁 @${(await server.banUser(communityId, body)).user.handle}`);
				await reloadCommunityDetail();
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 拉取该社区封禁列表（含用户快照） */
		async function listBannedUsers() {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return [];
			try {
				return (await server.listBans(communityId)).items;
			} catch {
				return [];
			}
		}
		/** 解封 */
		async function unbanUser(userId) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return false;
			try {
				await server.unbanUser(communityId, userId);
				notify("已解封该用户");
				await reloadCommunityDetail();
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
		/**
		* 频道排序（owner/admin）：与相邻频道交换位置。
		* 频道列表按 position 升序渲染，但历史数据 position 可能重复，
		* 因此按当前顺序整体重排为 0..n-1，只 PATCH 真正变化的频道。
		*/
		async function moveChannel(channelId, direction) {
			const server = serverOf();
			const community = state.view.community;
			if (!server || !community) return false;
			const ordered = [...community.channels];
			const index = ordered.findIndex((c) => c.id === channelId);
			const swapIndex = direction === "up" ? index - 1 : index + 1;
			if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return false;
			const current = ordered[index];
			const target = ordered[swapIndex];
			if (!current || !target) return false;
			const reordered = ordered.map((c) => {
				if (c.id === current.id) return target;
				if (c.id === target.id) return current;
				return c;
			});
			try {
				for (const [position, channel] of reordered.entries()) if (channel.position !== position) await server.updateChannel(channel.id, { position });
				await reloadCommunityDetail();
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
						threadId: null,
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
		/** 在主频道创建讨论组（可带起点消息与可见性）；成功后打开它 */
		async function createThreadInChannel(channelId, input) {
			const server = serverOf();
			if (!server) return null;
			try {
				const body = { name: input.name.trim() };
				if (input.starterMessageId) body.starterMessageId = input.starterMessageId;
				if (input.visibility !== void 0) body.visibility = input.visibility;
				if (input.passcode !== void 0) body.passcode = input.passcode;
				const created = await server.createThread(channelId, body);
				notify(`已创建讨论组「${created.name}」`);
				await reloadCommunityDetail();
				await openThread({
					id: created.id,
					channelId
				});
				return created;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 凭密码进入私密讨论组；成功后刷新频道讨论组列表并打开它 */
		async function joinThreadWithPasscode(threadId, passcode) {
			const server = serverOf();
			if (!server) return false;
			try {
				const joined = await server.joinThread(threadId, passcode.trim());
				notify(`已加入讨论组「${joined.name}」`);
				await reloadCommunityDetail();
				await openThread({
					id: joined.id,
					channelId: joined.channelId
				});
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 编辑讨论组（改名 / 改可见性 / 改密码），成功后刷新社区详情 */
		async function updateThread(threadId, patch) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.updateThread(threadId, patch);
				await reloadCommunityDetail();
				notify("讨论组已更新");
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 拉讨论组成员列表（失败返回 []） */
		async function listThreadMembers(threadId) {
			const server = serverOf();
			if (!server) return [];
			try {
				return (await server.listThreadMembers(threadId)).items;
			} catch (error) {
				notify(errorText(error));
				return [];
			}
		}
		/** 拉可拉入的社区成员候选（支持关键词搜索；失败返回 []） */
		async function listThreadCandidates(threadId, q = "") {
			const server = serverOf();
			if (!server) return [];
			try {
				return (await server.listThreadCandidates(threadId, q.trim())).items;
			} catch (error) {
				notify(errorText(error));
				return [];
			}
		}
		/** 直接把社区成员拉入讨论组 */
		async function addThreadMember(threadId, userId) {
			const server = serverOf();
			if (!server) return false;
			try {
				notify(`已把 @${(await server.addThreadMember(threadId, userId)).user.handle} 拉入讨论组`);
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 移除讨论组成员（userId 传自己即退出） */
		async function removeThreadMember(threadId, userId) {
			const server = serverOf();
			if (!server) return false;
			try {
				await server.removeThreadMember(threadId, userId);
				notify(userId === state.me?.id ? "已退出讨论组" : "已移出该成员");
				await reloadCommunityDetail();
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 手动归档 / 恢复讨论组活跃 */
		async function setThreadArchived(threadId, archived) {
			const server = serverOf();
			if (!server) return false;
			try {
				if (archived) await server.archiveThread(threadId);
				else await server.reopenThread(threadId);
				await reloadCommunityDetail();
				notify(archived ? "讨论组已归档（24h 无人发言也会自动归档）" : "讨论组已恢复活跃");
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
		/** 窗口不可见 / 失焦视为「离开」，否则「在线」；离线由断连自动处理 */
		function desiredPresence() {
			if (typeof document === "undefined") return "online";
			if (document.visibilityState === "hidden" || !document.hasFocus()) return "away";
			return "online";
		}
		/** 上报当前在线状态到当前房间（未连接时静默丢弃） */
		function pushPresence() {
			socket?.send({
				type: "presence.set",
				payload: { kind: desiredPresence() }
			});
		}
		let presenceBound = false;
		function onPresenceSignal() {
			pushPresence();
		}
		function bindPresenceListeners() {
			if (presenceBound) return;
			presenceBound = true;
			document.addEventListener("visibilitychange", onPresenceSignal);
			window.addEventListener("focus", onPresenceSignal);
			window.addEventListener("blur", onPresenceSignal);
		}
		function unbindPresenceListeners() {
			if (!presenceBound) return;
			presenceBound = false;
			document.removeEventListener("visibilitychange", onPresenceSignal);
			window.removeEventListener("focus", onPresenceSignal);
			window.removeEventListener("blur", onPresenceSignal);
		}
		function wsUrl(roomId) {
			const settings = state.settings;
			const base = (settings?.serverUrl ?? "http://127.0.0.1:8787").replace(/^http/, "ws");
			const token = settings?.token ?? "";
			return `${base}/ws?token=${encodeURIComponent(token)}&channelId=${encodeURIComponent(roomId)}`;
		}
		/** 当前正在看的「房间」：讨论组优先，否则主频道 */
		function roomIdOf() {
			const { threadId, channelId } = state.view;
			return threadId ?? channelId;
		}
		/** 连接某个房间（主频道或讨论组；各自一个 DO 实例 = 一条 WS） */
		function connectChannel(roomId) {
			closeRealtime();
			const settings = state.settings;
			socket = new TalkSocket(wsUrl(roomId), {
				onFrame: (frame) => handleServerFrame(frame),
				onClose: () => {
					socket = null;
					if (!state.open || roomIdOf() !== roomId) return;
					patchView({ live: false });
					if (settings?.autoReconnect && reconnectTimer === null) reconnectTimer = window.setTimeout(() => {
						reconnectTimer = null;
						if (state.open && roomIdOf() === roomId) connectChannel(roomId);
					}, 3e3);
				},
				onError: () => {}
			});
			socket.connect();
		}
		/** 服务端帧分发：hello（心跳开启）/ 消息事件（仅当属于当前房间） */
		function handleServerFrame(frame) {
			const roomId = roomIdOf();
			if (frame.type === "evt.hello") {
				patchView({
					live: true,
					onlineCount: frame.payload.onlineCount
				});
				socket?.startHeartbeat(frame.payload.heartbeatIntervalSec);
				pushPresence();
				return;
			}
			if (roomId === null) return;
			switch (frame.type) {
				case "evt.message.new":
					if (frame.payload.channelId !== roomId) return;
					upsertMessage(frame.payload.message, true);
					return;
				case "evt.message.updated":
					if (frame.payload.channelId !== roomId) return;
					upsertMessage(frame.payload.message, true);
					return;
				case "evt.message.deleted":
					if (frame.payload.channelId !== roomId) return;
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
			patchView({ messages: sortBy(next, ["createdAt"]) });
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
				threadId: null,
				messages: [],
				nextCursor: null,
				messagesLoading: true,
				loadingOlder: false,
				live: false,
				onlineCount: 0,
				replyingTo: null,
				focusMessageId: null
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
		/** 更新本地 community.threads 中的某条讨论组摘要（未读归零/计数推进等即时反馈） */
		function patchThreadSummary(threadId, patch) {
			const community = state.view.community;
			if (!community?.threads.some((t) => t.id === threadId)) return;
			patchView({ community: {
				...community,
				threads: community.threads.map((t) => t.id === threadId ? {
					...t,
					...patch
				} : t)
			} });
		}
		/** 打开讨论组：切到依附频道 → 拉该讨论组的消息 → 上报已读 → 连讨论组实时房间 */
		async function openThread(thread) {
			const server = serverOf();
			if (!server) return;
			if (state.view.channelId !== thread.channelId) await selectChannel(thread.channelId);
			const threadId = thread.id;
			closeRealtime();
			patchView({
				threadId,
				messages: [],
				nextCursor: null,
				messagesLoading: true,
				loadingOlder: false,
				live: false,
				onlineCount: 0,
				replyingTo: null,
				focusMessageId: null
			});
			try {
				const page = await server.listMessages(thread.channelId, {
					limit: 50,
					direction: "desc",
					threadId
				});
				const items = [...page.items].reverse();
				patchView({
					messages: items,
					nextCursor: page.nextCursor,
					messagesLoading: false
				});
				const newest = items[items.length - 1];
				if (newest) try {
					await server.markThreadRead(threadId, { lastReadMessageId: newest.id });
					patchThreadSummary(threadId, {
						unreadCount: 0,
						unreadMentions: 0
					});
				} catch {}
				connectChannel(threadId);
			} catch (error) {
				patchView({
					messagesLoading: false,
					live: false
				});
				notify(errorText(error));
			}
		}
		/** 从讨论组退回它依附的主频道 */
		async function closeThread() {
			const channelId = state.view.channelId;
			if (channelId) await selectChannel(channelId);
		}
		/** 拉取当前房间在线成员（讨论组房间暂不做 REST 拉取，仅主频道可用） */
		async function fetchChannelOnline() {
			const server = serverOf();
			const channelId = state.view.channelId;
			if (!server || !channelId || state.view.threadId) return [];
			try {
				return (await server.channelOnline(channelId)).members;
			} catch {
				return [];
			}
		}
		/** 向上翻更早消息（主频道或当前讨论组各自翻页） */
		async function loadOlderMessages() {
			const server = serverOf();
			const { channelId, threadId, nextCursor, loadingOlder, messages } = state.view;
			if (!server || !channelId || !nextCursor || loadingOlder) return;
			patchView({ loadingOlder: true });
			try {
				const common = {
					cursor: nextCursor,
					limit: 50,
					direction: "desc"
				};
				const page = threadId !== null ? await server.listMessages(channelId, {
					...common,
					threadId
				}) : await server.listMessages(channelId, common);
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
		/** 从正文里抽取形如 `@handle` 的 token（前一个字符不是词字符，避免匹配邮箱 a@b） */
		function mentionHandlesOf(text) {
			return (text.match(/(?<![\p{L}\p{N}_])@([\p{L}\p{N}_]+)/gu) ?? []).map((token) => token.replace(/^@/, ""));
		}
		/** 组 createMessage 请求体：附件与 @mention 只在有值时带上（exactOptionalPropertyTypes） */
		function buildMessageBody(content, attachments) {
			const body = { content };
			if (attachments.length > 0) body.attachments = attachments;
			const handles = uniq(mentionHandlesOf(content));
			if (handles.length > 0) body.mentionHandles = handles;
			return body;
		}
		/**
		* 发消息：先逐个 PUT 附件拿 r2Key，再走 REST 创建；WS live 时事件回填，否则本地补一条。
		* shareId 非空时会附带一张分享卡片（服务端展开成消息内嵌的 shareCard 快照）。
		* @returns 是否成功入队（成功时调用方应清空输入与附件）
		*/
		async function sendMessage(content, files = [], shareId = null) {
			const server = serverOf();
			const channelId = state.view.channelId;
			if (!server || !channelId || state.view.sending) return false;
			const text = content.trim();
			if (text.length === 0 && files.length === 0 && shareId === null) return false;
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
				const request = { ...buildMessageBody(text, attachments) };
				if (shareId !== null) request.shareId = shareId;
				if (state.view.replyingTo) request.replyToId = state.view.replyingTo.id;
				const sentThreadId = state.view.threadId;
				if (sentThreadId !== null) request.threadId = sentThreadId;
				const created = await server.createMessage(channelId, request);
				if (!state.view.live) upsertMessage(created, true);
				if (sentThreadId !== null) {
					const current = state.view.community?.threads.find((t) => t.id === sentThreadId);
					if (current) patchThreadSummary(sentThreadId, {
						messageCount: current.messageCount + 1,
						lastMessageId: created.id,
						lastActivityAt: created.createdAt,
						status: "active",
						archivedAt: null,
						updatedAt: created.createdAt
					});
				}
				patchView({
					sending: false,
					replyingTo: null
				});
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
				const threadId = state.view.threadId;
				if (threadId !== null) {
					const current = state.view.community?.threads.find((t) => t.id === threadId);
					if (current && current.messageCount > 0) patchThreadSummary(threadId, { messageCount: current.messageCount - 1 });
				}
			} catch (error) {
				notify(errorText(error));
				throw error;
			}
		}
		/** 取分享详情（含作者/大小/时间与下载地址）；失败返回 null */
		async function getShareInfo(shareId) {
			const server = serverOf();
			if (!server) return null;
			try {
				return await server.getShare(shareId);
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 取分享的下载地址（服务端会顺带自增下载计数） */
		async function shareDownloadUrl(shareId) {
			const server = serverOf();
			if (!server) return null;
			try {
				return (await server.getShare(shareId)).downloadUrl;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 当前 DSH 会话 id：由「社区」页签（会话级 slot）挂载时写入 */
		let currentDshSessionId = null;
		function setCurrentDshSession(id) {
			currentDshSessionId = id;
		}
		function getCurrentDshSession() {
			return currentDshSessionId;
		}
		let openSessionFn = null;
		/** 由 client 入口 apply 注入「打开会话」实现（refresh + open） */
		function bindSessionOpener(fn) {
			openSessionFn = fn;
		}
		let sessionTreeFn = null;
		/** 由 client 入口 apply 注入「读取宿主会话树」实现（与左侧会话栏同源） */
		function bindSessionTree(fn) {
			sessionTreeFn = fn;
		}
		/**
		* 本机可分享的 DSH 会话：优先用宿主会话树（带标题、按工作区分组展示），
		* 宿主不可用时回退到 host 持久化列表（只有 id / cwd）。
		*/
		async function listShareableSessions() {
			const tree = sessionTreeFn?.() ?? [];
			if (tree.length > 0) return tree;
			try {
				return (await hostSessions()).sessions.map((s) => ({
					id: s.id,
					title: s.id,
					...s.cwd ? { cwd: s.cwd } : {}
				}));
			} catch (error) {
				notify(errorText(error));
				return [];
			}
		}
		/**
		* 把本机某个 DSH 会话分享到社区：
		* host 打包 → 上传 R2 → 在 Server 登记一条 agent-session 分享。
		* 成功返回分享 id（可随消息发卡片），失败返回 null。
		*/
		async function shareLocalSession(input) {
			const server = serverOf();
			if (!server) return null;
			try {
				const raw = await hostSessionPackage(input.sessionId);
				const pack = JSON.parse(raw);
				const title = input.title?.trim() || `会话分享：${pack.manifest.sessionId.slice(0, 8)}`;
				const file = new File([raw], `agent-session-${pack.manifest.sessionId}.json`, { type: "application/json" });
				const uploaded = await server.uploadObject(file);
				const res = await server.createAgentSessionShare({
					r2Key: uploaded.r2Key,
					title,
					...input.summary?.trim() ? { summary: input.summary.trim() } : {},
					sizeBytes: uploaded.size,
					manifest: pack.manifest,
					...input.communityId ? { communityId: input.communityId } : {}
				});
				notify(`已分享会话「${res.share.title}」`);
				return res.share.id;
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		/** 让 host 把一条分享还原成本地 DSH 会话，并切到该会话 */
		async function cloneShareToSession(shareId) {
			const url = await shareDownloadUrl(shareId);
			if (!url) return false;
			try {
				const res = await hostClone(url);
				if (!res.sessionId) {
					notify("该分享不是 DSH 会话包");
					return false;
				}
				notify((openSessionFn ? await openSessionFn(res.sessionId) : false) ? "已还原会话并切换过去" : `已还原会话 ${res.sessionId}，请在会话列表里打开`);
				return true;
			} catch (error) {
				notify(errorText(error));
				return false;
			}
		}
		/** 我在当前社区的角色 */
		function myRole() {
			return state.view.community?.myRole ?? null;
		}
		/** 是否当前社区 owner/admin */
		function isModerator$1() {
			const role = myRole();
			return role === "owner" || role === "admin";
		}
		/** 能否编辑：作者本人（随时）或社区 owner/admin */
		function canEditMessage(item) {
			if (state.me === null) return false;
			if (item.authorId === state.me.id) return true;
			return isModerator$1();
		}
		/** 能否撤回/删除：作者仅在发送 2 分钟内；owner/admin 随时可删 */
		function canRetractMessage(item) {
			if (state.me === null) return false;
			if (item.authorId === state.me.id) return Date.now() - item.createdAt <= MESSAGE_RETRACT_MS;
			return isModerator$1();
		}
		/** 选中某条消息作为回复目标（composer 上方会出现提示条） */
		function replyToMessage(item) {
			patchView({ replyingTo: item });
		}
		/** 取消回复 */
		function cancelReply() {
			patchView({ replyingTo: null });
		}
		/** 清除跳转高亮标记（高亮动画结束后调用） */
		function clearMessageFocus() {
			if (state.view.focusMessageId !== null) patchView({ focusMessageId: null });
		}
		/**
		* 打开某条消息所在房间（主频道或讨论组）并定位：目标不在首屏则向上翻页
		* （最多 10 页）寻找，找到后短暂高亮。
		* @returns 是否成功定位
		*/
		async function revealMessage(channelId, messageId, threadId = null) {
			try {
				const targetThread = threadId ?? null;
				if (state.view.channelId !== channelId || state.view.threadId !== targetThread) {
					if (targetThread) await openThread({
						id: targetThread,
						channelId
					});
					else await selectChannel(channelId);
				}
				let guard = 0;
				while (guard < 10 && state.view.nextCursor !== null && !state.view.messages.some((m) => m.id === messageId)) {
					await loadOlderMessages();
					guard += 1;
				}
				if (!state.view.messages.some((m) => m.id === messageId)) return false;
				patchView({ focusMessageId: messageId });
				return true;
			} catch {
				return false;
			}
		}
		function toMemberLite(item) {
			return {
				userId: item.userId,
				handle: item.user.handle,
				displayName: item.user.displayName,
				avatarUrl: item.user.avatarUrl,
				role: item.role
			};
		}
		/** 拉取当前社区成员到 view.members（缓存，供 @ 自动补全） */
		async function refreshCommunityMembers(communityId) {
			const server = serverOf();
			if (!server) return;
			if (state.view.communityId !== communityId) return;
			patchView({ membersLoading: true });
			try {
				const res = await server.listMembers(communityId, { limit: 200 });
				if (state.view.communityId !== communityId) return;
				patchView({
					members: res.items.map(toMemberLite),
					membersLoading: false
				});
			} catch {
				if (state.view.communityId === communityId) patchView({ membersLoading: false });
			}
		}
		/** 在当前社区搜索消息（返回 null 表示失败，错误已 toast） */
		async function searchCommunityMessages(q, cursor) {
			const server = serverOf();
			const communityId = state.view.communityId;
			if (!server || !communityId) return null;
			try {
				const res = cursor === void 0 ? await server.searchMessages(communityId, q, { limit: 30 }) : await server.searchMessages(communityId, q, {
					cursor,
					limit: 30
				});
				return {
					items: res.items,
					nextCursor: res.nextCursor
				};
			} catch (error) {
				notify(errorText(error));
				return null;
			}
		}
		//#endregion
		//#region packages/client/src/components/styles.tsx
		/** 语义色 token（明暗随宿主翻转）。按键名保留旧 palette 兼容存量引用 */
		const palette = {
			page: "var(--dsw-alias-bg-base)",
			panel: "var(--dsw-alias-bg-layer-1)",
			layer2: "var(--dsw-alias-bg-layer-2)",
			layer3: "var(--dsw-alias-bg-layer-3)",
			rail: "var(--dsw-specific-sidebar-fill)",
			elevated: "var(--dsw-alias-bg-overlay)",
			mask: "var(--dsw-alias-bg-mask-1)",
			skeleton: "var(--dsw-alias-bg-skeleton)",
			border: "var(--dsw-alias-border-l1)",
			border2: "var(--dsw-alias-border-l2)",
			border3: "var(--dsw-alias-border-l3)",
			border4: "var(--dsw-alias-border-l4)",
			text: "var(--dsw-alias-label-primary)",
			secondary: "var(--dsw-alias-label-secondary)",
			muted: "var(--dsw-alias-label-tertiary)",
			caption: "var(--dsw-alias-label-caption)",
			accent: "var(--dsw-alias-state-business-primary)",
			danger: "var(--dsw-alias-state-error-primary)",
			dangerSoft: "var(--dsw-alias-state-error-secondary)",
			success: "var(--dsw-alias-state-success-primary)",
			warn: "var(--dsw-alias-state-warn-primary)",
			warnLabel: "var(--dsw-alias-state-warn-label)",
			inputBg: "var(--dsw-alias-interactive-bg-hover-solid)",
			hover: "var(--dsw-alias-interactive-bg-hover)",
			active: "var(--dsw-alias-interactive-bg-active)",
			badge: "var(--dsw-alias-state-error-primary)",
			hoverAccent: "var(--dsw-alias-interactive-bg-hover-accent)"
		};
		/** 页签内容页根容器：占满宿主中栏（高度由外层 flex 约束） */
		const pageRoot = {
			width: "100%",
			height: "100%",
			minHeight: 0,
			display: "flex",
			flexDirection: "column",
			background: palette.page,
			color: palette.text
		};
		const smallText = {
			fontSize: 12,
			color: palette.muted
		};
		/** 分段选择组容器（对齐 AuthScreen 的 Segmented 控件）：圆角外壳 + 内部激活键 */
		const pillGroup = {
			display: "flex",
			gap: 2,
			padding: 3,
			borderRadius: 10,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`
		};
		/** 分段选择组内的单个键（非激活态） */
		const pillKey = {
			flex: 1,
			border: "none",
			borderRadius: 8,
			padding: "7px 12px",
			fontSize: 13,
			fontWeight: 450,
			color: palette.muted,
			background: "transparent",
			cursor: "pointer",
			transition: "background 120ms ease, color 120ms ease"
		};
		/** 分段选择键样式：active 时叠加激活态 */
		function pillStyle(active) {
			if (!active) return pillKey;
			return {
				...pillKey,
				fontWeight: 600,
				color: palette.text,
				background: palette.elevated,
				boxShadow: "0 1px 2px rgba(0,0,0,0.06)"
			};
		}
		/** 表单字段纵向容器 */
		const fieldBlock = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		/** 字段小标签 */
		const fieldLabel = {
			fontSize: 12,
			color: palette.muted,
			fontWeight: 500
		};
		/** 成员 / 封禁 / 在线成员等列表卡片行 */
		const listCard = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 10px",
			borderRadius: 10,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`
		};
		/** 列表卡片的主标题行（单行省略） */
		const listCardName = {
			fontSize: 13,
			fontWeight: 600,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		/**
		* 项目 logo（构建期由 tsdown 读 packages/client/public/logo.svg 注入）转 data URL。
		* 源文件是纯黑单色图形，这里统一用 CSS mask 渲染、以宿主语义文字色填充，
		* 因此亮/暗主题下都可见（详见 BrandLogo）。
		*/
		const talkLogoUrl = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\" role=\"img\" aria-labelledby=\"title desc\">\n  <title id=\"title\">dsh-talk</title>\n  <desc id=\"desc\">A minimal chat bubble.</desc>\n  <path\n    fill=\"#4D6BFE\"\n    d=\"M256 72C142.8 72 52 144.6 52 234c0 52.5 31.3 99.2 79.8 128.9l-20.6 66.8c-3.3 10.7 8.1 19.5 17.3 13.4l76.2-50.1c16.5 3.3 33.7 5 51.3 5 113.2 0 204-72.6 204-164S369.2 72 256 72Z\"\n  />\n</svg>\n")}`;
		/** 品牌 logo 标记：单色 mask 跟随宿主文字色，尺寸自定 */
		function BrandLogo({ size = 34, title }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				role: "img",
				"aria-label": title ?? "dsh-talk",
				title,
				style: {
					width: size,
					height: size,
					flex: "0 0 auto",
					display: "inline-block",
					backgroundColor: palette.text,
					maskImage: `url("${talkLogoUrl}")`,
					WebkitMaskImage: `url("${talkLogoUrl}")`,
					maskRepeat: "no-repeat",
					WebkitMaskRepeat: "no-repeat",
					maskPosition: "center",
					WebkitMaskPosition: "center",
					maskSize: "contain",
					WebkitMaskSize: "contain"
				}
			});
		}
		/** 头像圆块：有 url 时显示图片，无 url / 加载失败时回退到 handle 首字符字母头像 */
		function Avatar({ label, color, size = 28, src, inset }) {
			const [failed, setFailed] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (src) setFailed(false);
			}, [src]);
			const showImage = Boolean(src) && !failed;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				style: {
					width: size,
					height: size,
					flex: "0 0 auto",
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: "50%",
					overflow: "hidden",
					background: color ?? "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
					color: "#fff",
					fontSize: Math.round(size * .42),
					fontWeight: 600,
					userSelect: "none"
				},
				children: showImage ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: src ?? "",
					alt: label,
					onError: () => setFailed(true),
					style: {
						width: "100%",
						height: "100%",
						display: "block",
						objectFit: inset ? "contain" : "cover",
						...inset ? {
							boxSizing: "border-box",
							padding: inset
						} : {}
					}
				}) : label.slice(0, 1).toUpperCase()
			});
		}
		/** 头像/图标选择器：预览圆块 + 「修改/移除」按钮，选取后回调 onPick(File) */
		function AvatarPicker({ src, label, size = 60, onPick, onRemove, uploadLabel = "修改头像", removeLabel = "移除头像", busy }) {
			const inputRef = (0, react.useRef)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
						label,
						src: src ?? null,
						size
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "outline",
								disabled: busy,
								onClick: () => inputRef.current?.click(),
								children: uploadLabel
							}), onRemove ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								disabled: busy,
								onClick: onRemove,
								children: removeLabel
							}) : null]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								...smallText,
								fontSize: 11
							},
							children: "支持 JPG / PNG / WebP，建议方形图片"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						ref: inputRef,
						type: "file",
						accept: "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml",
						style: { display: "none" },
						onChange: (e) => {
							const file = e.target.files?.[0];
							e.target.value = "";
							if (file && onPick) onPick(file);
						},
						"aria-hidden": true,
						tabIndex: -1
					})
				]
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
			width: 420,
			maxWidth: "calc(100vw - 48px)",
			background: palette.panel,
			border: `1px solid ${palette.border}`,
			borderRadius: 16,
			padding: "26px 28px",
			color: palette.text,
			display: "flex",
			flexDirection: "column",
			gap: 16
		};
		const fieldHint = {
			fontSize: 11,
			color: palette.caption
		};
		const errorBanner = {
			display: "flex",
			alignItems: "flex-start",
			gap: 6,
			padding: "8px 10px",
			borderRadius: 8,
			background: palette.layer2,
			border: `1px solid ${palette.border}`,
			borderLeft: `3px solid ${palette.danger}`,
			color: palette.danger,
			fontSize: 12.5,
			lineHeight: 1.4
		};
		const linkButton = {
			border: "none",
			background: "transparent",
			padding: 0,
			color: palette.accent,
			fontSize: 12,
			cursor: "pointer"
		};
		const linkButtonDisabled = {
			...linkButton,
			color: palette.caption,
			cursor: "default"
		};
		/** 把异常转成可展示的文案 */
		function errorMessage(err) {
			return err instanceof Error ? err.message : String(err);
		}
		/** 卡片顶部品牌标识 + 标题 / 副标题 */
		function BrandHeader({ title, subtitle }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandLogo, {
					size: 42,
					title: "dsh-talk 社区"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 2
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							fontSize: 17,
							fontWeight: 650,
							lineHeight: 1.2
						},
						children: title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...fieldHint,
							fontSize: 12.5
						},
						children: subtitle
					})]
				})]
			});
		}
		/** 错误提示条（左侧警告图标 + 文案） */
		function ErrorBanner({ message }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: errorBanner,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						display: "inline-flex",
						flex: "0 0 auto",
						marginTop: 1
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, { size: 14 })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						flex: 1,
						minWidth: 0
					},
					children: message
				})]
			});
		}
		/** 显示 / 隐藏密码切换按钮 */
		function PasswordToggle({ shown, onToggle }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: onToggle,
				style: {
					border: "none",
					background: "transparent",
					padding: 0,
					color: palette.accent,
					fontSize: 11,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
					gap: 4
				},
				children: shown ? "隐藏" : "显示"
			});
		}
		/** 分段控制：登录 / 注册，以及登录态下的 邮箱 / 用户名 */
		function Segmented({ value, options, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: pillGroup,
				children: options.map((option) => {
					const active = value === option.key;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => onChange(option.key),
						style: {
							flex: 1,
							border: "none",
							borderRadius: 8,
							padding: "7px 12px",
							fontSize: 13,
							fontWeight: active ? 600 : 450,
							color: active ? palette.text : palette.muted,
							background: active ? palette.elevated : "transparent",
							cursor: "pointer",
							transition: "background 120ms ease, color 120ms ease"
						},
						children: option.label
					}, option.key);
				})
			});
		}
		/** 带标签行的表单字段：左侧 label，右侧可选插槽（如显示/隐藏密码） */
		function Field({ label, htmlFor, right, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: {
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between"
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						htmlFor,
						style: fieldLabel,
						children: label
					}), right]
				}), children]
			});
		}
		/** 忘记密码：邮箱 → 收验证码 → 设置新密码（全程在面板内完成，无需打开邮件链接） */
		function ForgotPasswordCard({ initialEmail, onDone }) {
			const [email, setEmail] = (0, react.useState)(initialEmail);
			const [otp, setOtp] = (0, react.useState)("");
			const [newPassword, setNewPassword] = (0, react.useState)("");
			const [showPassword, setShowPassword] = (0, react.useState)(false);
			const [stage, setStage] = (0, react.useState)("request");
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			async function request(event) {
				event.preventDefault();
				setBusy(true);
				setError("");
				try {
					await requestPasswordResetOtp(email);
					setStage("reset");
					setOtp("");
					setNewPassword("");
				} catch (err) {
					setError(errorMessage(err));
				} finally {
					setBusy(false);
				}
			}
			async function submitReset(event) {
				event.preventDefault();
				setBusy(true);
				setError("");
				try {
					await resetPasswordWithOtp({
						email,
						otp,
						password: newPassword
					});
					setStage("done");
				} catch (err) {
					setError(errorMessage(err));
				} finally {
					setBusy(false);
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandHeader, {
					title: "重置密码",
					subtitle: stage === "done" ? "密码已更新" : "通过邮箱验证码找回账号"
				}), stage === "done" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						fontSize: 13,
						color: palette.secondary,
						lineHeight: 1.6
					},
					children: "密码已重置成功，请使用新密码重新登录。"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					size: "md",
					style: { width: "100%" },
					onClick: onDone,
					children: "返回登录"
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
					onSubmit: stage === "request" ? (e) => void request(e) : (e) => void submitReset(e),
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 12
					},
					children: [
						stage === "request" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								fontSize: 13,
								color: palette.secondary,
								lineHeight: 1.6
							},
							children: "输入注册邮箱，我们会向它发送一封 6 位验证码邮件。"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
							label: "邮箱",
							htmlFor: "talk-reset-email",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-reset-email",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								placeholder: "you@example.com",
								type: "email",
								autoComplete: "email",
								autoFocus: true,
								required: true
							})
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									fontSize: 13,
									color: palette.secondary,
									lineHeight: 1.6
								},
								children: [
									"验证码已发送至 ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
										style: { color: palette.text },
										children: email
									}),
									"，5 分钟内有效；若该邮箱未注册则不会收到邮件。"
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "验证码",
								htmlFor: "talk-reset-otp",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-reset-otp",
									value: otp,
									onChange: (e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)),
									placeholder: "6 位数字",
									inputMode: "numeric",
									autoComplete: "one-time-code",
									autoFocus: true,
									required: true
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Field, {
								label: "新密码",
								htmlFor: "talk-reset-password",
								right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PasswordToggle, {
									shown: showPassword,
									onToggle: () => setShowPassword((prev) => !prev)
								}),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-reset-password",
									value: newPassword,
									onChange: (e) => setNewPassword(e.target.value),
									type: showPassword ? "text" : "password",
									autoComplete: "new-password",
									required: true
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: fieldHint,
									children: "至少 8 位"
								})]
							})
						] }),
						error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { message: error }) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							type: "submit",
							variant: "primary",
							size: "md",
							disabled: busy || (stage === "request" ? email.trim().length === 0 : otp.trim().length !== 6 || newPassword.length < 8),
							style: { width: "100%" },
							children: busy ? "请稍候…" : stage === "request" ? "发送验证码" : "重置密码"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center"
							},
							children: [stage === "reset" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: busy ? linkButtonDisabled : linkButton,
								disabled: busy,
								onClick: () => {
									setStage("request");
									setError("");
								},
								children: "换个邮箱"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: busy ? linkButtonDisabled : linkButton,
								disabled: busy,
								onClick: onDone,
								children: "返回登录"
							})]
						})
					]
				})]
			});
		}
		function AuthScreen() {
			const talk = useTalkState();
			const [mode, setMode] = (0, react.useState)("login");
			const [name, setName] = (0, react.useState)("");
			const [account, setAccount] = (0, react.useState)("");
			const [password, setPassword] = (0, react.useState)("");
			const [showPassword, setShowPassword] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [otp, setOtp] = (0, react.useState)("");
			const [otpBusy, setOtpBusy] = (0, react.useState)(false);
			const [otpError, setOtpError] = (0, react.useState)("");
			const [forgot, setForgot] = (0, react.useState)(false);
			const pendingEmail = talk.pendingEmail;
			(0, react.useEffect)(() => {
				if (pendingEmail) {
					setOtp("");
					setOtpError("");
				}
			}, [pendingEmail]);
			async function submit(event) {
				event.preventDefault();
				setBusy(true);
				setError("");
				try {
					if (mode === "login") await login("email", account.trim(), password);
					else {
						const extra = {};
						if (name.trim().length > 0) extra.name = name.trim();
						await register({
							...extra,
							email: account.trim(),
							password
						});
					}
				} catch (err) {
					setError(errorMessage(err));
				} finally {
					setBusy(false);
				}
			}
			async function verify(event) {
				event.preventDefault();
				setOtpBusy(true);
				setOtpError("");
				try {
					await verifyOtp(otp);
				} catch (err) {
					setOtpError(errorMessage(err));
				} finally {
					setOtpBusy(false);
				}
			}
			async function resend() {
				setOtpError("");
				setOtpBusy(true);
				try {
					await resendVerificationOtp();
				} catch (err) {
					setOtpError(errorMessage(err));
				} finally {
					setOtpBusy(false);
				}
			}
			const allowSubmit = account.trim().length > 0 && password.length >= 8;
			if (pendingEmail) {
				const otpReady = otp.trim().length === 6;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: card,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandHeader, {
							title: "验证邮箱",
							subtitle: "输入验证码完成注册"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								fontSize: 13,
								color: palette.secondary,
								lineHeight: 1.5
							},
							children: [
								"验证码已发送至 ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", {
									style: { color: palette.text },
									children: pendingEmail
								}),
								"， 请查收邮件。5 分钟内有效。"
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => void verify(e),
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 12
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
									label: "验证码",
									htmlFor: "talk-otp",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
										id: "talk-otp",
										value: otp,
										onChange: (e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0, 6)),
										placeholder: "6 位数字",
										inputMode: "numeric",
										autoComplete: "one-time-code",
										autoFocus: true,
										required: true
									})
								}),
								otpError ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { message: otpError }) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: otpBusy || !otpReady,
									style: { width: "100%" },
									children: otpBusy ? "验证中…" : "验证邮箱"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: otpBusy ? linkButtonDisabled : linkButton,
										disabled: otpBusy,
										onClick: () => void resend(),
										children: "重新发送"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: otpBusy ? linkButtonDisabled : linkButton,
										disabled: otpBusy,
										onClick: () => cancelVerification(),
										children: "返回登录"
									})]
								})
							]
						})
					]
				});
			}
			if (forgot) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForgotPasswordCard, {
				initialEmail: account.trim(),
				onDone: () => setForgot(false)
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: card,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandHeader, {
						title: "dsh-talk 社区",
						subtitle: "登录后参与社区讨论"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segmented, {
						value: mode,
						onChange: setMode,
						options: [{
							key: "login",
							label: "登录"
						}, {
							key: "register",
							label: "注册"
						}]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						onSubmit: (e) => void submit(e),
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 12
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "邮箱",
								htmlFor: "talk-account",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-account",
									value: account,
									onChange: (e) => setAccount(e.target.value),
									placeholder: "you@example.com",
									type: "email",
									autoComplete: "email",
									required: true
								})
							}),
							mode === "register" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Field, {
								label: "昵称（可选）",
								htmlFor: "talk-name",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-name",
									value: name,
									onChange: (e) => setName(e.target.value),
									placeholder: "显示名，留空用邮箱前缀"
								})
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Field, {
								label: "密码",
								htmlFor: "talk-password",
								right: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PasswordToggle, {
									shown: showPassword,
									onToggle: () => setShowPassword((prev) => !prev)
								}),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-password",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									type: showPassword ? "text" : "password",
									autoComplete: mode === "login" ? "current-password" : "new-password",
									required: true
								}), mode === "register" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: fieldHint,
									children: "至少 8 位"
								}) : null]
							}),
							mode === "login" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									justifyContent: "flex-end"
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: linkButton,
									onClick: () => {
										setForgot(true);
										setError("");
									},
									children: "忘记密码？"
								})
							}) : null,
							error ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorBanner, { message: error }) : null,
							talk.busy && !busy ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...fieldHint,
									color: palette.secondary
								},
								children: "正在连接 Server…"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								type: "submit",
								variant: "primary",
								size: "md",
								disabled: busy || !allowSubmit,
								style: { width: "100%" },
								children: busy ? "请稍候…" : mode === "login" ? "登录" : "创建账号"
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/homeStyles.ts
		const rail = {
			width: 72,
			flex: "0 0 auto",
			background: palette.rail,
			borderRight: `1px solid ${palette.border}`,
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			minHeight: 0,
			paddingTop: 8
		};
		const railScroll = {
			overflowY: "auto",
			flex: 1,
			width: "100%",
			padding: "6px 0"
		};
		const railAction = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 40,
			height: 40,
			borderRadius: 12,
			border: "none",
			background: "transparent",
			color: palette.secondary,
			cursor: "pointer",
			flex: "0 0 auto"
		};
		const railItem = {
			width: "100%",
			height: 48,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			border: "none",
			background: "transparent",
			cursor: "pointer",
			position: "relative",
			color: palette.text
		};
		const railAvatar = {
			position: "relative",
			display: "inline-flex"
		};
		const railPill = {
			position: "absolute",
			left: 0,
			top: "50%",
			transform: "translateY(-50%)",
			width: 4,
			height: 18,
			borderRadius: "0 4px 4px 0",
			background: palette.text
		};
		const railBubble = {
			position: "absolute",
			top: -2,
			right: -2,
			minWidth: 15,
			height: 15,
			padding: "0 3px",
			borderRadius: 999,
			background: palette.badge,
			color: "#fff",
			fontSize: 9,
			fontWeight: 700,
			lineHeight: "15px",
			textAlign: "center"
		};
		const railDivider = {
			width: 32,
			height: 1,
			margin: "6px 0",
			background: palette.border
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
			gap: 10,
			padding: "5px 12px",
			borderRadius: 8,
			position: "relative"
		};
		/** hover 时浮在消息右上角的操作条（Discord 风格，平时不占位） */
		const msgChip = {
			position: "absolute",
			top: 4,
			right: 8,
			display: "inline-flex",
			alignItems: "center",
			gap: 2,
			padding: 2,
			borderRadius: 8,
			background: palette.elevated,
			border: `1px solid ${palette.border}`,
			boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
		};
		/**
		* 消息行的 hover 表现走 CSS（避免在无交互语义的 div 上绑鼠标事件）：
		* 平时整行无底色，hover 淡显；操作条默认隐藏，hover / 键盘聚焦到行内时显示。
		*/
		const messageRowCss = `
  .dsht-msg-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
  .dsht-msg-row.is-mentioned { background: var(--dsw-alias-state-business-tertiary); }
  .dsht-msg-row.is-focus { animation: dsht-focus-fade 1.8s ease-out forwards; }
  @keyframes dsht-focus-fade {
    from { background-color: var(--dsw-alias-state-business-tertiary); }
    to { background-color: transparent; }
  }
  .dsht-msg-row .dsht-msg-actions { opacity: 0; pointer-events: none; }
  .dsht-msg-row:hover .dsht-msg-actions,
  .dsht-msg-row:focus-within .dsht-msg-actions,
  .dsht-msg-actions.is-open { opacity: 1; pointer-events: auto; }
  .dsht-quote-btn { cursor: pointer; }
`;
		const creatorRow = {
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			gap: 8,
			padding: "6px 0"
		};
		const emptyMsg = {
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: 6,
			padding: "38px 16px",
			color: palette.muted,
			textAlign: "center"
		};
		const composerWrap = {
			borderTop: `1px solid ${palette.border}`,
			background: palette.page,
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
		const emptyCard = {
			width: 380,
			maxWidth: "calc(100vw - 56px)",
			background: palette.panel,
			border: `1px solid ${palette.border}`,
			borderRadius: 16,
			padding: "34px 30px",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			gap: 12,
			color: palette.text,
			textAlign: "center"
		};
		const sectionTitle = {
			fontSize: 11,
			fontWeight: 650,
			color: palette.caption,
			letterSpacing: "0.06em",
			textTransform: "uppercase",
			padding: "4px 8px 2px"
		};
		/** 私密讨论组角标（图标库无锁图标，用 emoji + 文字标注） */
		const privacyBadge = {
			flex: "0 0 auto",
			fontSize: 10,
			fontWeight: 600,
			color: palette.muted,
			border: `1px solid ${palette.border}`,
			borderRadius: 999,
			padding: "0 6px",
			lineHeight: "16px",
			whiteSpace: "nowrap"
		};
		const activeTile = {
			background: palette.elevated,
			boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
			border: `1px solid ${palette.border}`
		};
		const liveDot = {
			width: 8,
			height: 8,
			borderRadius: "50%",
			flex: "0 0 auto"
		};
		const PRIVACY_LABELS = {
			public: "公开",
			private: "私密"
		};
		/** 回复目标 / 引用块的正文摘要上限 */
		const QUOTE_SNIPPET_MAX = 72;
		/** 被引用消息的展示辅助：拆出作者名与正文摘要 */
		function replyParts(item) {
			const target = item.replyTo;
			if (!target) return {
				author: "",
				content: ""
			};
			const author = target.author.displayName ?? target.author.handle;
			const raw = target.content.replace(/\s+/g, " ").trim();
			return {
				author,
				content: raw.length === 0 ? (target.attachments?.length ?? 0) > 0 ? "[附件]" : "" : raw.length > QUOTE_SNIPPET_MAX ? `${raw.slice(0, QUOTE_SNIPPET_MAX)}…` : raw
			};
		}
		/** 附件大小人类可读化 */
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
		//#endregion
		//#region packages/client/src/components/TalkModal.tsx
		/** 追加到 dialog 的标记类：供 :has() 定位对应的 portal root */
		const DIALOG_MARKER = "dsht-modal-dialog";
		/** 页签内容区根节点的查询属性（见 components.tsx 的 TalkPage） */
		const PAGE_ROOT_SELECTOR = "[data-dsht-page-root]";
		const talkModalCss = `
body > div[role="presentation"]:has(> .${DIALOG_MARKER}) {
  left: var(--dsht-modal-left, 0px);
  top: var(--dsht-modal-top, 0px);
  right: var(--dsht-modal-right, 0px);
  bottom: var(--dsht-modal-bottom, 0px);
}
`;
		let styleInjected = false;
		/** 注入一次覆盖样式（幂等） */
		function ensureStyle() {
			if (styleInjected) return;
			const style = document.createElement("style");
			style.setAttribute("data-dsht-modal-css", "");
			style.textContent = talkModalCss;
			document.head.appendChild(style);
			styleInjected = true;
		}
		/** 把页签内容区相对视口的偏移写入 CSS 变量，供上面的覆盖样式读取 */
		function syncBounds() {
			const root = document.querySelector(PAGE_ROOT_SELECTOR);
			if (!root) return;
			const rect = root.getBoundingClientRect();
			const right = Math.max(0, window.innerWidth - rect.right);
			const bottom = Math.max(0, window.innerHeight - rect.bottom);
			const style = document.documentElement.style;
			style.setProperty("--dsht-modal-left", `${Math.round(rect.left)}px`);
			style.setProperty("--dsht-modal-top", `${Math.round(rect.top)}px`);
			style.setProperty("--dsht-modal-right", `${Math.round(right)}px`);
			style.setProperty("--dsht-modal-bottom", `${Math.round(bottom)}px`);
		}
		/** 替代 primitives Modal：外观一致，仅在社区页签内容区内居中 */
		function TalkModal({ open, className, ...rest }) {
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				ensureStyle();
				syncBounds();
				const root = document.querySelector(PAGE_ROOT_SELECTOR);
				const observer = root ? new ResizeObserver(syncBounds) : null;
				if (root && observer) observer.observe(root);
				window.addEventListener("resize", syncBounds);
				window.addEventListener("scroll", syncBounds, true);
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", syncBounds);
					window.removeEventListener("scroll", syncBounds, true);
				};
			}, [open]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				className: className ? `${className} ${DIALOG_MARKER}` : DIALOG_MARKER,
				...rest
			});
		}
		//#endregion
		//#region packages/client/src/components/Manage.tsx
		const isModerator = (role) => role === "owner" || role === "admin";
		const roleColor = {
			owner: "var(--dsw-alias-state-warn-primary)",
			admin: "var(--dsw-alias-state-business-primary)",
			member: palette.muted
		};
		const roleName = {
			owner: "所有者",
			admin: "管理员",
			member: "成员"
		};
		/** 弹窗说明文字 */
		const dialogHint = {
			fontSize: 11.5,
			color: palette.caption,
			lineHeight: 1.6
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
				id: "invite-user",
				label: "邀请用户",
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
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
				icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRightUpOutline16, {})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open: menuOpen,
					onClose: () => setMenuOpen(false),
					onSelect: (id) => {
						setMenuOpen(false);
						if (id === "members" || id === "invite-user" || id === "invite" || id === "settings") setDialog(id);
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
					items: menuItems,
					portal: true
				}),
				dialog === "members" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MembersDialog, {
					open: true,
					onClose: () => setDialog(null)
				}) : null,
				dialog === "invite-user" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InviteUserDialog, {
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
		/** 邀请码展示 / 复制（创建社区时生成、固定不变；码对所有成员可见） */
		function InviteDialog({ open, onClose }) {
			const code = useTalkState().view.community?.inviteCode ?? "";
			async function copy() {
				await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(code);
				notify("邀请码已复制");
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "邀请码",
				closeLabel: "关闭",
				description: "把邀请码发给对方：对方在「＋ 加入」里输入即可进社区。",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: fieldBlock,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							htmlFor: "talk-invite-code",
							style: fieldLabel,
							children: "邀请码"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-invite-code",
								readOnly: true,
								value: code,
								"aria-label": "邀请码",
								style: { flex: 1 }
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCopyOutline16, {}),
								onClick: () => void copy(),
								children: "复制"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: dialogHint,
							children: "邀请码在创建社区时生成、固定不变，不会过期；请妥善保存，所有成员均可查看。"
						})
					]
				})
			});
		}
		/** 邀请已注册用户入社区（owner/admin）：输入 @用户名 或邮箱，对方会收到站内信 + 邮件 */
		function InviteUserDialog({ open, onClose }) {
			const [value, setValue] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (open) setValue("");
			}, [open]);
			async function submit() {
				if (busy || value.trim().length === 0) return;
				setBusy(true);
				const ok = await inviteMember(value);
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "邀请用户加入",
				closeLabel: "关闭",
				description: "输入对方的 @用户名 或注册邮箱，对方会收到站内信和邮件邀请。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || value.trim().length === 0,
					onClick: () => void submit(),
					children: busy ? "邀请中…" : "发送邀请"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: fieldBlock,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							htmlFor: "talk-invite-user",
							style: fieldLabel,
							children: "@用户名 或邮箱"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							id: "talk-invite-user",
							value,
							onChange: (e) => setValue(e.target.value),
							placeholder: "如 @alice 或 alice@example.com"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: dialogHint,
							children: "仅可邀请已注册的用户；对方接受后即可加入社区。"
						})
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
			const [iconUrl, setIconUrl] = (0, react.useState)(community?.iconUrl ?? null);
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!open) return;
				setName(community?.name ?? "");
				setDescription(community?.description ?? "");
				setPrivacy(community?.privacy ?? "public");
				setIconUrl(community?.iconUrl ?? null);
			}, [
				open,
				community?.name,
				community?.description,
				community?.privacy,
				community?.iconUrl
			]);
			async function pickIcon(file) {
				const url = await uploadImage(file);
				if (url) setIconUrl(url);
			}
			async function save() {
				if (name.trim().length === 0) return;
				setBusy(true);
				const ok = await updateCommunity({
					name: name.trim(),
					description: description.length > 0 ? description : null,
					privacy,
					iconUrl
				});
				setBusy(false);
				if (ok) onClose();
			}
			/** 删除社区（仅 owner 可见按钮）；删除后整个社区及其内容不复存在 */
			async function removeCommunity() {
				if (!community) return;
				if (!window.confirm(`删除社区「${community.name}」？其中所有频道与消息将被永久删除，且无法恢复。`)) return;
				setBusy(true);
				const ok = await deleteCommunity(community.id);
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
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
						gap: 12
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "社区头像"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AvatarPicker, {
								src: iconUrl,
								label: name.trim() || "社区",
								size: 60,
								onPick: (file) => void pickIcon(file),
								onRemove: () => setIconUrl(null),
								uploadLabel: "设置头像",
								removeLabel: "移除头像",
								busy
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-community-name",
								style: fieldLabel,
								children: "社区名称"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-community-name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "社区名称"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-community-desc",
								style: fieldLabel,
								children: "简介"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-community-desc",
								value: description,
								onChange: (e) => setDescription(e.target.value),
								placeholder: "一句话介绍这个社区"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "可见性"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: pillGroup,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(privacy === "public"),
									onClick: () => setPrivacy("public"),
									children: "公开"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(privacy === "private"),
									onClick: () => setPrivacy("private"),
									children: "私有"
								})]
							})]
						}),
						community?.myRole === "owner" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								borderTop: `1px solid ${palette.border}`,
								paddingTop: 12,
								display: "flex",
								flexDirection: "column",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: dialogHint,
								children: [
									"危险操作：删除社区「",
									community.name,
									"」后，其全部频道与消息将被永久清除。"
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
								disabled: busy,
								onClick: () => void removeCommunity(),
								style: {
									color: palette.danger,
									border: `1px solid ${palette.dangerSoft}`,
									alignSelf: "flex-start"
								},
								children: "删除社区"
							})]
						}) : null
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
			const [bans, setBans] = (0, react.useState)([]);
			const [loading, setLoading] = (0, react.useState)(true);
			const isOwner = myRole === "owner";
			const moder = isModerator(myRole);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setLoading(true);
				Promise.all([listMembers(), listBannedUsers()]).then(([ms, bs]) => {
					if (cancelled) return;
					setMembers(ms);
					setBans(bs);
					setLoading(false);
				});
				return () => {
					cancelled = true;
				};
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
			async function ban(user) {
				if (!window.confirm(`封禁 @${user.handle}？封禁会同时将其移出社区，且之后无法通过邀请码/邀请再加入（可在下方解封）。`)) return;
				if (await banUser(user.id)) {
					setMembers((prev) => prev.filter((m) => m.user.id !== user.id));
					listBannedUsers().then(setBans);
				}
			}
			async function unban(item) {
				if (!window.confirm(`解封 @${item.user.handle}？解封后 TA 可重新加入社区。`)) return;
				if (await unbanUser(item.userId)) setBans((prev) => prev.filter((b) => b.userId !== item.userId));
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TalkModal, {
				open,
				onClose,
				title: "成员管理",
				closeLabel: "关闭",
				children: [loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...smallText,
						padding: "12px 4px"
					},
					children: "加载成员…"
				}) : members.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...smallText,
						padding: "12px 4px"
					},
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
							style: listCard,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
									label: m.user.handle,
									src: m.user.avatarUrl
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										flex: 1,
										minWidth: 0
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: listCardName,
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
									children: [
										m.role !== "admin" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => void act(m.user.id, "admin", "设为管理员"),
											children: "设管理员"
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => void act(m.user.id, "member", "降为成员"),
											children: "降为成员"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
											onClick: () => void kick(m.user),
											"aria-label": "移除成员",
											children: "移除"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: "ghost",
											onClick: () => void ban(m.user),
											"aria-label": "封禁成员",
											title: "封禁（同时移出成员并禁止再次加入）",
											children: "封禁"
										})
									]
								}) : null
							]
						}, m.user.id);
					})
				}), bans.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						marginTop: 14,
						display: "flex",
						flexDirection: "column",
						gap: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							fontSize: 11,
							fontWeight: 650,
							color: palette.caption,
							letterSpacing: "0.06em",
							textTransform: "uppercase",
							padding: "2px 2px 0"
						},
						children: [
							"已封禁用户（",
							bans.length,
							"）"
						]
					}), bans.map((b) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: listCard,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
								label: b.user.handle,
								src: b.user.avatarUrl
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: listCardName,
									children: [
										"@",
										b.user.handle,
										b.reason ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												color: palette.caption,
												fontSize: 11
											},
											children: [" · ", b.reason]
										}) : null
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...smallText,
										fontSize: 11
									},
									children: ["封禁于 ", timeLabel(b.createdAt)]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => void unban(b),
								"aria-label": `解封 ${b.user.handle}`,
								children: "解封"
							})
						]
					}, b.userId))]
				}) : null]
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
			const [busy, setBusy] = (0, react.useState)(false);
			async function save() {
				if (name.trim().length === 0) return;
				setBusy(true);
				let ok = false;
				if (isEdit) ok = await updateChannelById(channel.id, {
					name: name.trim(),
					topic: topic.length > 0 ? topic : null,
					kind
				});
				else {
					const body = {
						name: name.trim(),
						kind
					};
					if (topic.length > 0) body.topic = topic;
					ok = await createChannel(body);
				}
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: isEdit ? "编辑频道" : "新建频道",
				closeLabel: "关闭",
				description: isEdit ? "可改名、改主题与类型。删除频道请用频道旁的「…」。" : "频道用于承载某一主题的实时消息。",
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
						gap: 12
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-channel-name",
								style: fieldLabel,
								children: "频道名"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-channel-name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "频道名，如 general / 公告 / 话题"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-channel-topic",
								style: fieldLabel,
								children: "主题（可选）"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-channel-topic",
								value: topic,
								onChange: (e) => setTopic(e.target.value),
								placeholder: "主题（显示在消息区顶部，可选）"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: fieldLabel,
									children: "类型"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: pillGroup,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: pillStyle(kind === "text"),
											onClick: () => setKind("text"),
											children: "文字"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: pillStyle(kind === "announcement"),
											onClick: () => setKind("announcement"),
											children: "公告"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											style: pillStyle(kind === "forum"),
											onClick: () => setKind("forum"),
											children: "话题"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: dialogHint,
									children: kind === "text" ? "全员自由发言。" : kind === "announcement" ? "仅所有者/管理员可发，普通成员只读。" : "频道里只列话题，点进话题才聊天（24h 无人回复自动归档）。"
								})
							]
						})
					]
				})
			});
		}
		/** 频道上移 / 下移图标（复用左箭头旋转，避免额外图标依赖） */
		const moveUpIcon = {
			display: "inline-flex",
			transform: "rotate(90deg)"
		};
		const moveDownIcon = {
			display: "inline-flex",
			transform: "rotate(-90deg)"
		};
		/**
		* 每行的频道呼出菜单：创建讨论组（所有成员可见，公告频道除外）+
		* 排序 / 改名 / 删除（owner/admin 可见）。无可用项时不渲染。
		*/
		function ChannelRowMenu({ channel, onCreateThread }) {
			const talk = useTalkState();
			const [menuOpen, setMenuOpen] = (0, react.useState)(false);
			const [editing, setEditing] = (0, react.useState)(false);
			const moderator = isModerator(talk.view.community?.myRole);
			const channels = talk.view.community?.channels ?? [];
			const index = channels.findIndex((c) => c.id === channel.id);
			const canMoveUp = moderator && index > 0;
			const canMoveDown = moderator && index >= 0 && index < channels.length - 1;
			const canCreateThread = channel.kind !== "announcement";
			const isForum = channel.kind === "forum";
			async function remove() {
				if (!window.confirm(`删除频道 #${channel.name}？其中的消息将一并删除。`)) return;
				if (await deleteChannelById(channel.id)) setMenuOpen(false);
			}
			const items = [
				...canCreateThread ? [{
					id: "create-thread",
					label: isForum ? "新建话题" : "创建讨论组",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
				}] : [],
				...canMoveUp ? [{
					id: "up",
					label: "上移",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: moveUpIcon,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
					})
				}] : [],
				...canMoveDown ? [{
					id: "down",
					label: "下移",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: moveDownIcon,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {})
					})
				}] : [],
				...moderator ? [{
					id: "edit",
					label: "编辑频道",
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {})
				}, {
					id: "delete",
					label: "删除频道",
					danger: true,
					icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {})
				}] : []
			];
			if (items.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: menuOpen,
				onClose: () => setMenuOpen(false),
				onSelect: (id) => {
					setMenuOpen(false);
					if (id === "create-thread") onCreateThread(channel.id);
					if (id === "edit") setEditing(true);
					if (id === "delete") remove();
					if (id === "up") moveChannel(channel.id, "up");
					if (id === "down") moveChannel(channel.id, "down");
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
				items,
				portal: true
			}), editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelDialog, {
				open: true,
				channel,
				onClose: () => setEditing(false)
			}) : null] });
		}
		//#endregion
		//#region packages/client/src/components/ThreadModals.tsx
		/** 创建讨论组 / 话题：按来源预填标题，可设为公开或私密（可带进入密码） */
		function ThreadCreateModal({ open, onClose, channelId, seed }) {
			const [name, setName] = (0, react.useState)("");
			const [visibility, setVisibility] = (0, react.useState)("public");
			const [passcode, setPasscode] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const talk = useTalkState();
			(0, react.useEffect)(() => {
				if (open) {
					setName(seed?.name ?? "");
					setVisibility("public");
					setPasscode("");
				}
			}, [open, seed]);
			async function submit() {
				const trimmed = name.trim();
				if (!channelId || trimmed.length === 0 || busy) return;
				setBusy(true);
				const input = {
					name: trimmed,
					visibility
				};
				if (seed?.starterMessageId) input.starterMessageId = seed.starterMessageId;
				if (visibility === "private") input.passcode = passcode.trim().length > 0 ? passcode.trim() : null;
				const ok = await createThreadInChannel(channelId, input);
				setBusy(false);
				if (ok) onClose();
			}
			const starterNote = seed?.starterMessageId ? "以这条消息为起点：讨论组会单独成串，原消息保留在主频道。" : null;
			const threadable = channelId ? talk.view.community?.channels.find((c) => c.id === channelId)?.kind ?? "text" : "text";
			const forumMode = threadable === "forum";
			if (!open || !channelId || threadable === "announcement") return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: forumMode ? "创建话题" : "创建讨论组",
				closeLabel: "关闭",
				description: forumMode ? "发一条新话题，它会列在本频道的话题列表里；大家点进去围绕它交流，24 小时无人回复会自动归档。" : "为某个话题开一个独立、集中的小空间，发言后它列在频道下的「讨论」里。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim().length === 0,
					onClick: () => void submit(),
					children: busy ? "创建中…" : forumMode ? "创建话题" : "创建讨论组"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-thread-name",
								style: fieldLabel,
								children: forumMode ? "话题标题" : "讨论组名称"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-thread-name",
								value: name,
								onChange: (e) => setName(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										submit();
									}
								},
								placeholder: forumMode ? "例如：如何快速导出聊天记录？" : "例如：周末活动安排"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: fieldLabel,
									children: "可见性"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: pillGroup,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: pillStyle(visibility === "public"),
										onClick: () => setVisibility("public"),
										children: "公开"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: pillStyle(visibility === "private"),
										onClick: () => setVisibility("private"),
										children: "私密"
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 12,
										lineHeight: 1.6
									},
									children: visibility === "public" ? "社区成员自由进出。" : passcode.trim().length > 0 ? "非成员可见但需凭密码进入；社区所有者/管理员可直接查看。" : "仅邀请可加入：非成员看到锁标识，需由组内成员把你拉入。"
								})
							]
						}),
						visibility === "private" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									htmlFor: "talk-thread-passcode",
									style: fieldLabel,
									children: "进入密码（可选）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-thread-passcode",
									value: passcode,
									onChange: (e) => setPasscode(e.target.value),
									placeholder: "留空表示仅邀请加入"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 11.5
									},
									children: "留空 = 只能由组内成员拉入；填写后，社区成员可凭该密码自行进入。"
								})
							]
						}) : null,
						starterNote ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12,
								lineHeight: 1.6
							},
							children: starterNote
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12,
								lineHeight: 1.6
							},
							children: "24 小时内没人发言会自动归档（从频道列表收起，可在「已归档」里恢复）；再有人发言会自动回到活跃区。"
						})
					]
				})
			});
		}
		/** 锁态私密讨论组：有密码 → 输入进入；无密码 → 仅提示需被邀请 */
		function ThreadJoinModal({ open, onClose, thread }) {
			const [passcode, setPasscode] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (open) setPasscode("");
			}, [open]);
			async function submit() {
				if (busy || passcode.trim().length === 0) return;
				setBusy(true);
				const ok = await joinThreadWithPasscode(thread.id, passcode);
				setBusy(false);
				if (ok) onClose();
			}
			const needsPasscode = thread.hasPasscode;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: needsPasscode ? "输入密码进入" : "私密讨论组",
				closeLabel: "关闭",
				description: needsPasscode ? `「${thread.name}」是私密讨论组，请输入进入密码。` : `「${thread.name}」是仅邀请可加入的私密讨论组，请联系组内成员把你拉入。`,
				footer: needsPasscode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || passcode.trim().length === 0,
					onClick: () => void submit(),
					children: busy ? "进入中…" : "进入"
				})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "知道了"
				}),
				children: needsPasscode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: fieldBlock,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
						htmlFor: "talk-thread-join-passcode",
						style: fieldLabel,
						children: "进入密码"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
						id: "talk-thread-join-passcode",
						type: "password",
						value: passcode,
						onChange: (e) => setPasscode(e.target.value),
						onKeyDown: (e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								submit();
							}
						},
						placeholder: "请输入密码"
					})]
				}) : null
			});
		}
		/** 讨论组设置：改名、公开↔私密、设置/清除进入密码（发起人或 owner/admin） */
		function ThreadSettingsModal({ open, onClose, thread }) {
			const [name, setName] = (0, react.useState)("");
			const [visibility, setVisibility] = (0, react.useState)("public");
			const [passcode, setPasscode] = (0, react.useState)("");
			const [clearPasscode, setClearPasscode] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!open) return;
				setName(thread.name);
				setVisibility(thread.visibility);
				setPasscode("");
				setClearPasscode(false);
			}, [
				open,
				thread.name,
				thread.visibility
			]);
			async function submit() {
				const trimmed = name.trim();
				if (busy || trimmed.length === 0) return;
				setBusy(true);
				const patch = {
					name: trimmed,
					visibility
				};
				if (visibility === "private") {
					if (clearPasscode) patch.passcode = null;
					else if (passcode.trim().length > 0) patch.passcode = passcode.trim();
				}
				const ok = await updateThread(thread.id, patch);
				setBusy(false);
				if (ok) onClose();
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "讨论组设置",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || name.trim().length === 0,
					onClick: () => void submit(),
					children: busy ? "保存中…" : "保存"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-thread-settings-name",
								style: fieldLabel,
								children: "名称"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-thread-settings-name",
								value: name,
								onChange: (e) => setName(e.target.value)
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "可见性"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: pillGroup,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(visibility === "public"),
									onClick: () => setVisibility("public"),
									children: "公开"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(visibility === "private"),
									onClick: () => setVisibility("private"),
									children: "私密"
								})]
							})]
						}),
						visibility === "private" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
									htmlFor: "talk-thread-settings-passcode",
									style: fieldLabel,
									children: "进入密码（可选）"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									id: "talk-thread-settings-passcode",
									type: "password",
									value: passcode,
									onChange: (e) => setPasscode(e.target.value),
									placeholder: thread.hasPasscode ? "留空保持原密码" : "留空 = 仅邀请可加入",
									disabled: clearPasscode
								}),
								thread.hasPasscode ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									style: {
										...smallText,
										display: "flex",
										alignItems: "center",
										gap: 6
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: clearPasscode,
										onChange: (e) => setClearPasscode(e.target.checked)
									}), "清除现有密码（改为仅邀请可加入）"]
								}) : null
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12
							},
							children: "公开讨论组：社区成员可自由进出；转为公开会一并清除进入密码。"
						})
					]
				})
			});
		}
		/** 私密讨论组成员：查看成员、移出/退出、从社区成员中搜索并拉入 */
		function ThreadMembersModal({ open, onClose, thread }) {
			const talk = useTalkState();
			const me = talk.me;
			const [members, setMembers] = (0, react.useState)([]);
			const [candidates, setCandidates] = (0, react.useState)([]);
			const [query, setQuery] = (0, react.useState)("");
			const [loading, setLoading] = (0, react.useState)(true);
			const [busyId, setBusyId] = (0, react.useState)(null);
			const role = talk.view.community?.myRole ?? null;
			const canManage = thread.createdBy === me?.id || role === "owner" || role === "admin";
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setLoading(true);
				setQuery("");
				listThreadMembers(thread.id).then((list) => {
					if (cancelled) return;
					setMembers(list);
					setLoading(false);
				});
				listThreadCandidates(thread.id, "").then((list) => {
					if (!cancelled) setCandidates(list);
				});
				return () => {
					cancelled = true;
				};
			}, [open, thread.id]);
			async function searchCandidates(value) {
				setQuery(value);
				const list = await listThreadCandidates(thread.id, value);
				setCandidates(list);
			}
			async function invite(userId) {
				if (busyId !== null) return;
				setBusyId(userId);
				const ok = await addThreadMember(thread.id, userId);
				setBusyId(null);
				if (!ok) return;
				const [nextMembers, nextCandidates] = await Promise.all([listThreadMembers(thread.id), listThreadCandidates(thread.id, query)]);
				setMembers(nextMembers);
				setCandidates(nextCandidates);
			}
			async function remove(userId, isSelf) {
				if (busyId !== null) return;
				if (!window.confirm(isSelf ? "退出该私密讨论组？" : "把该成员移出讨论组？")) return;
				setBusyId(userId);
				const ok = await removeThreadMember(thread.id, userId);
				setBusyId(null);
				if (!ok) return;
				if (isSelf) {
					onClose();
					closeThread();
					return;
				}
				setMembers((prev) => prev.filter((m) => m.userId !== userId));
				listThreadCandidates(thread.id, query).then(setCandidates);
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "讨论组成员",
				closeLabel: "关闭",
				description: "私密讨论组：仅成员可进入；可将社区成员直接拉入。",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 14
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 6
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: fieldLabel,
							children: [
								"成员（",
								members.length,
								"）"
							]
						}), loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: "8px 2px"
							},
							children: "加载成员…"
						}) : members.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: "8px 2px"
							},
							children: "还没有成员。"
						}) : members.map((m) => {
							const isSelf = me !== null && m.userId === me.id;
							const isCreator = m.userId === thread.createdBy;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: listCard,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
										label: m.user.handle,
										src: m.user.avatarUrl
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											flex: 1,
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: listCardName,
											children: [m.user.displayName ?? m.user.handle, isSelf ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
											children: [
												"@",
												m.user.handle,
												" · ",
												isCreator ? "发起人" : "成员"
											]
										})]
									}),
									isSelf && !isCreator ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										disabled: busyId !== null,
										onClick: () => void remove(m.userId, true),
										children: "退出"
									}) : canManage && !isCreator ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										disabled: busyId !== null,
										onClick: () => void remove(m.userId, false),
										children: "移出"
									}) : null
								]
							}, m.userId);
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 8
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "拉入社区成员"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: query,
								onChange: (e) => void searchCandidates(e.target.value),
								placeholder: "搜索 @用户名 / 昵称",
								"aria-label": "搜索可拉入的成员"
							}),
							candidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...smallText,
									padding: "4px 2px"
								},
								children: "没有可拉入的成员。"
							}) : candidates.map((u) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8,
									padding: "6px 10px",
									borderRadius: 10,
									border: `1px solid ${palette.border}`
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
										label: u.handle,
										src: u.avatarUrl
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											flex: 1,
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: listCardName,
											children: u.displayName ?? u.handle
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												...smallText,
												fontSize: 11
											},
											children: ["@", u.handle]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
										size: "sm",
										variant: "ghost",
										icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {}),
										disabled: busyId !== null,
										onClick: () => void invite(u.id),
										children: "拉入"
									})
								]
							}, u.id))
						]
					})]
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/ChannelList.tsx
		function ChannelList({ onCreateThread }) {
			const talk = useTalkState();
			const community = talk.view.community;
			const activeChannel = talk.view.channelId;
			if (!community) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: midCol,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "10px 12px 6px",
						display: "flex",
						alignItems: "center",
						gap: 4
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}),
							onClick: () => backToCommunities(),
							"aria-label": "返回社区列表",
							title: "返回社区列表"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
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
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunityTools, {})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						...railScroll,
						flex: 1,
						padding: "0 8px 8px"
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: sectionTitle,
							children: "频道"
						}),
						community.channels.map((ch) => {
							const active = ch.id === activeChannel;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 2,
									padding: "0 4px 0 8px",
									borderRadius: 8,
									border: "1px solid transparent",
									...active ? activeTile : {},
									marginBottom: 2
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
										fontWeight: active ? 600 : 450,
										cursor: "pointer",
										textAlign: "left"
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											display: "inline-flex",
											flex: "0 0 auto",
											color: palette.muted
										},
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
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelRowMenu, {
									channel: ch,
									onCreateThread
								})]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelThreadsOf, { channelId: ch.id })] }, ch.id);
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateChannelButton, {})
					]
				})]
			});
		}
		/** 单个讨论组的列表行（含未读角标与私密标识），点击进入该讨论 */
		function ThreadListRow({ thread, channelId }) {
			const talk = useTalkState();
			const [joinOpen, setJoinOpen] = (0, react.useState)(false);
			const opened = talk.view.threadId === thread.id;
			const unread = thread.unreadCount;
			const mention = thread.unreadMentions;
			const isPrivate = thread.visibility === "private";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => {
					if (thread.locked) setJoinOpen(true);
					else openThread({
						id: thread.id,
						channelId
					});
				},
				title: thread.starterSnippet ? `起点：${thread.starterSnippet}` : thread.name,
				style: {
					display: "flex",
					alignItems: "center",
					gap: 5,
					width: "100%",
					border: "none",
					background: opened ? palette.hover : "transparent",
					borderRadius: 6,
					padding: "4px 6px 4px 8px",
					color: palette.text,
					cursor: "pointer",
					textAlign: "left"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							color: opened ? palette.accent : palette.caption,
							display: "inline-flex",
							flex: "0 0 auto"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							flex: 1,
							minWidth: 0,
							fontSize: 12,
							color: thread.status === "archived" ? palette.muted : palette.secondary,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap"
						},
						children: thread.name
					}),
					isPrivate ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: privacyBadge,
						children: thread.locked ? "🔒 私密" : "私密"
					}) : null,
					unread > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							flex: "0 0 auto",
							minWidth: 15,
							height: 15,
							padding: "0 4px",
							borderRadius: 999,
							fontSize: 10,
							fontWeight: 700,
							lineHeight: "15px",
							textAlign: "center",
							color: "#fff",
							background: mention > 0 ? palette.accent : palette.badge
						},
						children: unread > 99 ? "99+" : unread
					}) : null
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadJoinModal, {
				open: joinOpen,
				onClose: () => setJoinOpen(false),
				thread
			})] });
		}
		/** 频道下方的「讨论」分组：活跃在列，已归档折叠可展开。话题频道不在此嵌套（右侧话题板承担列表）。 */
		function ChannelThreadsOf({ channelId }) {
			const talk = useTalkState();
			const [archivedOpen, setArchivedOpen] = (0, react.useState)(false);
			if (talk.view.community?.channels.find((c) => c.id === channelId)?.kind === "forum") return null;
			const all = talk.view.community?.threads.filter((t) => t.channelId === channelId) ?? [];
			const active = all.filter((t) => t.status === "active");
			const archived = all.filter((t) => t.status === "archived");
			if (active.length === 0 && archived.length === 0) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					margin: "1px 0 6px",
					paddingLeft: 12
				},
				children: [
					active.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 1
						},
						children: active.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadListRow, {
							thread: t,
							channelId
						}, t.id))
					}) : null,
					archived.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setArchivedOpen((v) => !v),
						style: {
							display: "flex",
							alignItems: "center",
							gap: 4,
							width: "100%",
							border: "none",
							background: "transparent",
							padding: "3px 8px",
							fontSize: 11,
							color: palette.caption,
							cursor: "pointer",
							textAlign: "left"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-flex",
									color: palette.muted,
									transition: "transform 120ms ease",
									transform: archivedOpen ? "rotate(90deg)" : void 0
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							}),
							"已归档讨论（",
							archived.length,
							"）"
						]
					}) : null,
					archivedOpen && archived.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 1
						},
						children: archived.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadListRow, {
							thread: t,
							channelId
						}, t.id))
					}) : null
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/ForumTopicBoard.tsx
		/** 单个话题行（帖子式：标题 + 发起人/活跃时间/回复数），点击进入话题内聊天 */
		function ForumTopicRow({ thread, channelId, archivedView }) {
			const [joinOpen, setJoinOpen] = (0, react.useState)(false);
			const unread = thread.unreadCount;
			const mention = thread.unreadMentions;
			const author = thread.creatorDisplayName ?? thread.creatorHandle;
			const replies = thread.messageCount;
			const isPrivate = thread.visibility === "private";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => {
					if (thread.locked) setJoinOpen(true);
					else openThread({
						id: thread.id,
						channelId
					});
				},
				title: thread.name,
				style: {
					display: "flex",
					alignItems: "center",
					gap: 10,
					width: "100%",
					border: "none",
					borderBottom: `1px solid ${palette.border}`,
					background: "transparent",
					padding: "9px 4px",
					color: palette.text,
					cursor: "pointer",
					textAlign: "left",
					transition: "background 120ms ease"
				},
				onMouseEnter: (e) => {
					e.currentTarget.style.background = palette.hover;
				},
				onMouseLeave: (e) => {
					e.currentTarget.style.background = "transparent";
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							width: 34,
							height: 34,
							borderRadius: 10,
							background: palette.inputBg,
							border: `1px solid ${palette.border}`,
							color: archivedView ? palette.muted : palette.accent,
							flex: "0 0 auto"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							gap: 3
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 6,
								minWidth: 0,
								fontSize: 13.5,
								fontWeight: 650,
								color: archivedView ? palette.muted : palette.text
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: thread.name
								}),
								isPrivate ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: privacyBadge,
									children: thread.locked ? "🔒 私密" : "私密"
								}) : null,
								archivedView ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										flex: "0 0 auto",
										fontSize: 10,
										fontWeight: 600,
										color: palette.muted,
										border: `1px solid ${palette.border}`,
										borderRadius: 999,
										padding: "0 6px",
										lineHeight: "16px"
									},
									children: "已归档"
								}) : null
							]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								...smallText,
								fontSize: 11.5,
								color: palette.caption
							},
							children: [
								author,
								" 发起",
								thread.starterSnippet ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [" · ", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: palette.muted },
									children: thread.starterSnippet
								})] }) : null,
								" · ",
								replies,
								" 条回复 · ",
								timeLabel(thread.lastActivityAt)
							]
						})]
					}),
					unread > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							flex: "0 0 auto",
							minWidth: 17,
							height: 17,
							padding: "0 5px",
							borderRadius: 999,
							fontSize: 11,
							fontWeight: 700,
							lineHeight: "17px",
							textAlign: "center",
							color: "#fff",
							background: mention > 0 ? palette.accent : palette.badge
						},
						children: unread > 99 ? "99+" : unread
					}) : null
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadJoinModal, {
				open: joinOpen,
				onClose: () => setJoinOpen(false),
				thread
			})] });
		}
		/** 话题频道主面板：活跃话题列表 + 已归档折叠 + 空状态引导；点行进入话题详情交流 */
		function ForumTopicBoard({ channelId, onNewTopic }) {
			const talk = useTalkState();
			const [archivedOpen, setArchivedOpen] = (0, react.useState)(false);
			if ((talk.view.community?.channels.find((c) => c.id === channelId) ?? null)?.kind !== "forum") return null;
			const canPost = (talk.view.community?.myRole ?? null) !== null;
			const [activeRaw, archivedRaw] = partition((talk.view.community?.threads ?? []).filter((t) => t.channelId === channelId), (t) => t.status === "active");
			const active = orderBy(activeRaw, [(t) => t.lastActivityAt], ["desc"]);
			const archived = orderBy(archivedRaw, [(t) => t.lastActivityAt], ["desc"]);
			if (active.length === 0 && archived.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					flex: 1,
					overflowY: "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: emptyMsg,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								width: 44,
								height: 44,
								borderRadius: 14,
								color: palette.accent,
								background: palette.inputBg,
								border: `1px solid ${palette.border}`,
								fontSize: 19,
								fontWeight: 700
							},
							children: "#"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 13,
								fontWeight: 600,
								color: palette.text
							},
							children: "这里还没有话题"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								fontSize: 12,
								lineHeight: 1.6
							},
							children: [
								"话题频道的聊天都放进一条条话题里：发一个新话题，",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
								"大家点进去围绕它交流；24 小时无人回复会自动归档。"
							]
						}),
						canPost ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							variant: "primary",
							size: "sm",
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}),
							onClick: onNewTopic,
							style: { marginTop: 4 },
							children: "创建第一个话题"
						}) : null,
						!canPost ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 12 },
							children: "成员可自由发布话题。"
						}) : null
					]
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					flex: 1,
					overflowY: "auto",
					padding: "10px 16px 14px"
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							gap: 8,
							padding: "4px 4px 8px"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								...smallText,
								fontSize: 11.5,
								color: palette.caption
							},
							children: [active.length + archived.length, " 条话题 · 点进话题查看与回复"]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							style: {
								display: "inline-flex",
								alignItems: "center",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutline16, {}),
								onClick: () => void reloadCommunityDetail(),
								"aria-label": "刷新话题",
								title: "刷新话题列表（含最新回复与未读）"
							}), canPost ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {}),
								onClick: onNewTopic,
								children: "新建话题"
							}) : null]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: active.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForumTopicRow, {
						thread: t,
						channelId,
						archivedView: false
					}, t.id)) }),
					archived.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setArchivedOpen((v) => !v),
						style: {
							display: "flex",
							alignItems: "center",
							gap: 4,
							marginTop: 8,
							border: "none",
							background: "transparent",
							padding: "4px 2px",
							fontSize: 11.5,
							fontWeight: 600,
							color: palette.caption,
							cursor: "pointer"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-flex",
									color: palette.muted,
									transition: "transform 120ms ease",
									transform: archivedOpen ? "rotate(90deg)" : void 0
								},
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutline14, {})
							}),
							"已归档话题（",
							archived.length,
							"）"
						]
					}), archivedOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: archived.map((t) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForumTopicRow, {
						thread: t,
						channelId,
						archivedView: true
					}, t.id)) }) : null] }) : null
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/ShareModals.tsx
		/** 工作区展示名：路径最后一段（对齐宿主左侧会话栏） */
		function workspaceLabel(cwd) {
			const parts = cwd.split(/[\\/]/).filter((part) => part.length > 0);
			return parts[parts.length - 1] ?? cwd;
		}
		/** 会话树按工作区（cwd）分组：保持工作区在会话树里首次出现的顺序 */
		function groupSessionsByWorkspace(rows) {
			const groups = /* @__PURE__ */ new Map();
			for (const row of rows) {
				const key = row.cwd ?? "";
				let group = groups.get(key);
				if (!group) {
					group = {
						key,
						label: key.length > 0 ? workspaceLabel(key) : "未知工作区",
						rows: []
					};
					groups.set(key, group);
				}
				group.rows.push(row);
			}
			return [...groups.values()];
		}
		/** 分享 DSH 会话弹窗：选一个本机会话，打包上传并发送卡片到当前频道 */
		function ShareSnapshotModal({ open, onClose, channelId, communityId }) {
			const [title, setTitle] = (0, react.useState)("");
			const [summary, setSummary] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [sessions, setSessions] = (0, react.useState)([]);
			const [sessionId, setSessionId] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				if (!open) return;
				const current = getCurrentDshSession();
				setSessionId(current ?? "");
				listShareableSessions().then((list) => {
					setSessions(list);
					if (!current && list.length > 0) setSessionId(list[0]?.id ?? "");
				});
			}, [open]);
			/** DSH 会话：host 打包上传后登记分享，并把卡片发到当前频道 */
			async function submitSession() {
				if (busy || sessionId.length === 0) return;
				setBusy(true);
				const shareId = await shareLocalSession({
					sessionId,
					title,
					summary,
					communityId
				});
				if (shareId && channelId.length > 0) {
					if (!await sendMessage("", [], shareId)) notify("分享已创建，但发送卡片失败");
				}
				setBusy(false);
				if (!shareId) return;
				setTitle("");
				setSummary("");
				onClose();
			}
			const sessionGroups = groupSessionsByWorkspace(sessions);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "分享 DSH 会话",
				description: "把本机一个 DSH 会话打包上传，社区成员可「克隆到会话」还原出同样的会话。",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || sessionId.length === 0,
					onClick: () => void submitSession(),
					children: busy ? "处理中…" : "分享到本频道"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 8
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 10,
									maxHeight: 240,
									overflowY: "auto"
								},
								children: sessionGroups.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...smallText,
										fontSize: 12
									},
									children: "没有可分享的本机会话。"
								}) : sessionGroups.map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 4
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										title: group.key.length > 0 ? group.key : void 0,
										style: {
											fontSize: 11,
											fontWeight: 650,
											color: palette.caption,
											letterSpacing: "0.04em"
										},
										children: group.label
									}), group.rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setSessionId(row.id),
										title: row.id,
										style: {
											...pillStyle(row.id === sessionId),
											textAlign: "left",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: row.title
									}, row.id))]
								}, group.key))
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: title,
							onChange: (e) => setTitle(e.target.value),
							placeholder: "会话分享标题（可选）"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							value: summary,
							onChange: (e) => setSummary(e.target.value),
							placeholder: "一句话摘要（可选）"
						})
					]
				})
			});
		}
		const shareCardStyle = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			marginTop: 6,
			padding: "8px 10px",
			maxWidth: 380,
			borderRadius: 10,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`,
			cursor: "pointer",
			textAlign: "left"
		};
		const shareCardBadge = {
			flex: "0 0 auto",
			fontSize: 10.5,
			fontWeight: 650,
			color: palette.accent,
			background: palette.elevated,
			border: `1px solid ${palette.border}`,
			borderRadius: 6,
			padding: "2px 6px",
			letterSpacing: "0.02em"
		};
		/** 消息内嵌分享卡片：点击打开详情弹窗（可在弹窗里克隆到本地会话） */
		function ShareCardView({ card }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => setOpen(true),
				title: "查看分享详情",
				style: shareCardStyle,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: shareCardBadge,
						children: "DSH 会话"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: {
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							gap: 2
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 13,
								fontWeight: 600,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: card.title
						}), card.summary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								...smallText,
								fontSize: 11.5,
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: card.summary
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							...smallText,
							fontSize: 11,
							flex: "0 0 auto"
						},
						children: "查看"
					})
				]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareCardModal, {
				open,
				onClose: () => setOpen(false),
				card
			})] });
		}
		/** 分享详情弹窗：展示分享信息；可一键克隆到本地会话 */
		function ShareCardModal({ open, onClose, card }) {
			const [detail, setDetail] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!open) return;
				let cancelled = false;
				setLoading(true);
				setDetail(null);
				getShareInfo(card.shareId).then((res) => {
					if (cancelled) return;
					setDetail(res);
					setLoading(false);
				});
				return () => {
					cancelled = true;
				};
			}, [open, card.shareId]);
			async function download() {
				if (busy) return;
				setBusy(true);
				const url = await shareDownloadUrl(card.shareId);
				setBusy(false);
				if (url) window.open(url, "_blank", "noopener");
			}
			async function clone() {
				if (busy) return;
				setBusy(true);
				const ok = await cloneShareToSession(card.shareId);
				setBusy(false);
				if (ok) onClose();
			}
			const eventCount = typeof detail?.manifest.eventCount === "number" ? detail.manifest.eventCount : null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "DSH 会话分享",
				closeLabel: "关闭",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					disabled: busy,
					onClick: () => void download(),
					children: "下载包体"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || loading,
					onClick: () => void clone(),
					children: busy ? "处理中…" : "克隆到本地的会话"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 10
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								alignItems: "center",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: shareCardBadge,
								children: "DSH 会话"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									fontSize: 14,
									fontWeight: 650
								},
								children: card.title
							})]
						}),
						card.summary ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12.5
							},
							children: card.summary
						}) : null,
						loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12
							},
							children: "加载分享信息…"
						}) : detail ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...smallText,
								fontSize: 12,
								lineHeight: 1.9
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["分享者：@", detail.author.handle] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["时间：", timeLabel(detail.createdAt)] }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["大小：", formatBytes(detail.sizeBytes)] }),
								eventCount !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["会话事件数：", eventCount] }) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: ["下载次数：", detail.downloadCount] })
							]
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								fontSize: 12
							},
							children: "克隆会在你的 DSH 里新建一个会话并切过去，不影响原会话。"
						})
					]
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/MessageRow.tsx
		/** 正文里的 @mention 高亮（自己用品牌底色反白） */
		function renderMentions(text, selfHandle) {
			const nodes = [];
			const re = /@([\p{L}\p{N}_]+)/gu;
			let last = 0;
			let index = 0;
			let match = re.exec(text);
			while (match !== null) {
				if (match.index > last) nodes.push(text.slice(last, match.index));
				const isSelf = match[1] === selfHandle;
				nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						color: isSelf ? "#ffffff" : palette.accent,
						background: isSelf ? palette.accent : "rgba(91,140,255,0.12)",
						borderRadius: 4,
						padding: isSelf ? "0 3px" : "0 2px",
						fontWeight: 500
					},
					children: match[0]
				}, `mention-${index}`));
				last = match.index + match[0].length;
				index += 1;
				match = re.exec(text);
			}
			if (last < text.length) nodes.push(text.slice(last));
			return nodes;
		}
		/** 回复（引用）小图标：拐角返回箭头，随按钮颜色 */
		function ReplyGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "2.2",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 14L4 9l5-5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5V19" })]
			});
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
		function MessageRow({ item, onCreateThread }) {
			const talk = useTalkState();
			const [editing, setEditing] = (0, react.useState)(false);
			const [draftText, setDraftText] = (0, react.useState)(item.content);
			const mine = talk.me !== null && item.authorId === talk.me.id;
			const mentionedMe = (item.mentions ?? []).includes(talk.me?.id ?? "");
			const focused = talk.view.focusMessageId === item.id;
			const allowEdit = canEditMessage(item);
			const allowRetract = canRetractMessage(item);
			const quote = item.replyTo ? replyParts(item) : null;
			const channelOf = talk.view.community?.channels.find((c) => c.id === item.channelId);
			const roleOf = talk.view.community?.myRole;
			const canReplyHere = channelOf?.kind !== "announcement" || roleOf === "owner" || roleOf === "admin";
			const canThreadHere = item.threadId === null && roleOf !== null && channelOf?.kind === "text";
			async function saveEdit() {
				try {
					await updateMessage(item.id, draftText);
					setEditing(false);
				} catch {}
			}
			/** 撤回（自己的消息，2 分钟内）或删除（owner/admin） */
			async function remove() {
				if (!window.confirm(mine ? "撤回这条消息？2 分钟内可撤回，超过 2 分钟只能编辑。" : "删除这条消息？")) return;
				try {
					await deleteMessage(item.id);
				} catch {}
			}
			async function jumpQuote() {
				const target = item.replyTo;
				if (!target) return;
				if (!await revealMessage(item.channelId, target.id, target.threadId ?? null)) notify("被引用的消息较旧，未能定位");
			}
			function onEditKeyDown(e) {
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					saveEdit();
				} else if (e.key === "Escape") {
					setDraftText(item.content);
					setEditing(false);
				}
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `dsht-msg-row${mentionedMe ? " is-mentioned" : ""}${focused ? " is-focus" : ""}`,
				"data-msg-id": item.id,
				style: msgRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
						label: item.author.handle,
						src: item.author.avatarUrl
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: 1,
							minWidth: 0
						},
						children: [
							quote ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void jumpQuote(),
								title: `跳转到 ${quote.author} 的消息`,
								style: {
									display: "flex",
									alignItems: "center",
									gap: 6,
									maxWidth: "100%",
									border: "none",
									background: "transparent",
									padding: "1px 0",
									margin: "0 0 2px",
									cursor: "pointer",
									color: palette.caption,
									fontSize: 11.5,
									textAlign: "left",
									overflow: "hidden"
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											color: palette.accent,
											display: "inline-flex",
											flex: "0 0 auto"
										},
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReplyGlyph, {})
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											flex: "0 0 auto",
											fontWeight: 600,
											color: palette.accent,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
											maxWidth: 150
										},
										children: quote.author
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											flex: 1,
											minWidth: 0,
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap"
										},
										children: quote.content
									})
								]
							}) : null,
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
								onKeyDown: onEditKeyDown,
								style: textAreaEdit
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									whiteSpace: "pre-wrap",
									wordBreak: "break-word",
									fontSize: 13.5,
									lineHeight: 1.55
								},
								children: renderMentions(item.content, talk.me?.handle ?? "")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AttachmentList, { attachments: item.attachments ?? [] }),
							item.shareCard ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareCardView, { card: item.shareCard }) : null
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `dsht-msg-actions${editing ? " is-open" : ""}`,
						style: msgChip,
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
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
							canReplyHere ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReplyGlyph, {}),
								onClick: () => replyToMessage(item),
								"aria-label": "回复",
								title: "回复这条消息"
							}) : null,
							canThreadHere && onCreateThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}),
								onClick: () => onCreateThread(item),
								"aria-label": "创建讨论组",
								title: "以此为话题创建讨论组"
							}) : null,
							allowEdit ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
								onClick: () => setEditing(true),
								"aria-label": "编辑",
								title: "编辑消息"
							}) : null,
							allowRetract ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, {}),
								onClick: () => void remove(),
								"aria-label": mine ? "撤回" : "删除",
								title: mine ? "撤回消息（2 分钟内）" : "删除消息"
							}) : null
						] })
					})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/SearchModals.tsx
		/** 高亮命中关键词（不区分大小写） */
		function highlightMatch(text, keyword) {
			const kw = keyword.trim().toLowerCase();
			if (kw.length === 0) return text;
			const lower = text.toLowerCase();
			const nodes = [];
			let cursor = 0;
			while (cursor < text.length) {
				const at = lower.indexOf(kw, cursor);
				if (at < 0) {
					nodes.push(text.slice(cursor));
					break;
				}
				if (at > cursor) nodes.push(text.slice(cursor, at));
				nodes.push(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: {
						background: "rgba(91,140,255,0.22)",
						borderRadius: 3,
						padding: "0 1px"
					},
					children: text.slice(at, at + kw.length)
				}, `${at}-${kw}`));
				cursor = at + kw.length;
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: nodes });
		}
		/** 消息搜索弹窗：社区内按正文关键词搜索，命中可一键跳到对应频道定位 */
		function SearchMessagesModal({ open, onClose }) {
			const [q, setQ] = (0, react.useState)("");
			const [busy, setBusy] = (0, react.useState)(false);
			const [ran, setRan] = (0, react.useState)(false);
			const [items, setItems] = (0, react.useState)([]);
			const [nextCursor, setNextCursor] = (0, react.useState)(null);
			const [loadingMore, setLoadingMore] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (open) {
					setQ("");
					setItems([]);
					setNextCursor(null);
					setRan(false);
					setBusy(false);
					setLoadingMore(false);
				}
			}, [open]);
			async function run(append) {
				const keyword = q.trim();
				if (keyword.length === 0) return;
				if (append) {
					if (loadingMore || nextCursor === null) return;
					setLoadingMore(true);
				} else {
					if (busy) return;
					setBusy(true);
					setRan(true);
				}
				const page = await searchCommunityMessages(keyword, append && nextCursor ? nextCursor : void 0);
				if (page) {
					setItems((prev) => append ? [...prev, ...page.items] : page.items);
					setNextCursor(page.nextCursor);
				}
				setBusy(false);
				setLoadingMore(false);
			}
			async function openHit(hit) {
				if (await revealMessage(hit.channelId, hit.id, hit.thread?.id ?? null)) onClose();
				else notify("该消息较旧，未能定位（可去对应频道向上加载更早消息）");
			}
			const keyword = q.trim();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "搜索消息",
				closeLabel: "关闭",
				description: "按正文关键词搜索本社区消息，命中结果可一键跳转定位。",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 8,
						minWidth: 340,
						minHeight: 160
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 6
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: q,
								onChange: (e) => setQ(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										run(false);
									}
								},
								placeholder: "搜索关键词"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								disabled: busy || keyword.length === 0,
								onClick: () => void run(false),
								children: busy ? "搜索中…" : "搜索"
							})]
						}),
						ran && !busy && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								...emptyMsg,
								padding: "26px 8px"
							},
							children: [
								"没有匹配「",
								keyword,
								"」的消息"
							]
						}) : !ran && items.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...emptyMsg,
								padding: "26px 8px"
							},
							children: "输入关键词搜索整个社区，点击结果可跳到对应频道定位。"
						}) : null,
						items.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 4,
								maxHeight: 330,
								overflowY: "auto"
							},
							children: [items.map((hit) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => void openHit(hit),
								style: {
									display: "block",
									width: "100%",
									border: "none",
									background: "transparent",
									borderRadius: 10,
									padding: "7px 10px",
									cursor: "pointer",
									textAlign: "left"
								},
								onMouseEnter: (e) => {
									e.currentTarget.style.background = palette.hover;
								},
								onMouseLeave: (e) => {
									e.currentTarget.style.background = "transparent";
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										alignItems: "center",
										gap: 6
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: { color: palette.muted },
											children: "#"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												fontSize: 12,
												fontWeight: 600,
												color: palette.text
											},
											children: hit.channel.name
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...smallText,
												fontSize: 11
											},
											children: timeLabel(hit.createdAt)
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												marginLeft: "auto",
												fontSize: 12,
												color: palette.caption,
												overflow: "hidden",
												textOverflow: "ellipsis",
												whiteSpace: "nowrap"
											},
											children: hit.author.displayName ?? hit.author.handle
										})
									]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										marginTop: 3,
										fontSize: 13,
										lineHeight: 1.5,
										color: palette.secondary,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: highlightMatch(hit.content.length > 180 ? `${hit.content.slice(0, 180)}…` : hit.content, keyword)
								})]
							}, hit.id)), nextCursor ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => void run(true),
								disabled: loadingMore,
								children: loadingMore ? "加载中…" : "加载更多"
							}) : null]
						}) : null
					]
				})
			});
		}
		const presenceColor = {
			online: palette.success,
			away: palette.warn,
			offline: palette.muted
		};
		const presenceLabel = {
			online: "在线",
			away: "离开",
			offline: "离线"
		};
		/** 当前频道在线成员弹窗：读频道 DO 的 presence 快照（仅统计保持连接的会话） */
		function OnlineMembersModal({ open, onClose, loading, members }) {
			const rank = {
				online: 0,
				away: 1,
				offline: 2
			};
			const sorted = [...members].sort((a, b) => rank[a.presence] - rank[b.presence] || a.handle.localeCompare(b.handle));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "在线成员",
				closeLabel: "关闭",
				description: "本频道当前保持连接的成员。",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 6,
						minWidth: 300
					},
					children: loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...smallText,
							padding: "14px 4px"
						},
						children: "加载中…"
					}) : sorted.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...smallText,
							padding: "16px 4px",
							textAlign: "center"
						},
						children: "暂无成员在线。"
					}) : sorted.map((m) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: "7px 10px",
							borderRadius: 10,
							background: palette.inputBg,
							border: `1px solid ${palette.border}`
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
								label: m.handle,
								src: m.avatarUrl
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									flex: 1,
									minWidth: 0
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: listCardName,
									children: m.displayName ?? m.handle
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...smallText,
										fontSize: 11
									},
									children: ["@", m.handle]
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: 6
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
									...liveDot,
									background: presenceColor[m.presence],
									flex: "0 0 auto"
								} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 11.5,
										color: palette.secondary
									},
									children: presenceLabel[m.presence]
								})]
							})
						]
					}, m.userId))
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/ChatPane.tsx
		function ChatPane({ onCreateThread }) {
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
			const [onlineOpen, setOnlineOpen] = (0, react.useState)(false);
			const [onlineLoading, setOnlineLoading] = (0, react.useState)(false);
			const [onlineMembers, setOnlineMembers] = (0, react.useState)([]);
			const composerRef = (0, react.useRef)(null);
			const [composerText, setComposerText] = (0, react.useState)("");
			const [searchOpen, setSearchOpen] = (0, react.useState)(false);
			const [mentionActive, setMentionActive] = (0, react.useState)(false);
			const [mentionQuery, setMentionQuery] = (0, react.useState)("");
			const [mentionIndex, setMentionIndex] = (0, react.useState)(0);
			const mentionStartRef = (0, react.useRef)(-1);
			const [threadMembersOpen, setThreadMembersOpen] = (0, react.useState)(false);
			const [threadSettingsOpen, setThreadSettingsOpen] = (0, react.useState)(false);
			const threadId = talk.view.threadId;
			const roomKey = threadId ?? channelId;
			const currentThread = channelId && threadId ? talk.view.community?.threads.find((t) => t.id === threadId) ?? null : null;
			const isThread = currentThread !== null;
			const isForumChannel = (channel?.kind ?? "text") === "forum";
			/** 话题频道的主面板 = 话题板（列表）；打开某条话题后才是聊天视图 */
			const isForumBoard = isForumChannel && !isThread;
			/** 与 @mentionQuery 匹配的候选成员（不含自己，最多 8 个） */
			const mentionCandidates = mentionActive ? talk.view.members.filter((m) => m.userId !== talk.me?.id).filter((m) => m.handle.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8) : [];
			/** 回复目标（composer 提示条）展示信息 */
			const replyingPreview = talk.view.replyingTo ? replyParts({ replyTo: talk.view.replyingTo }) : null;
			const myRole = community?.myRole ?? null;
			const canPost = channel?.kind !== "announcement" || myRole === "owner" || myRole === "admin";
			/** 能否管理当前讨论组（发起人或社区 owner/admin） */
			const canManageThread = currentThread !== null && (currentThread.createdBy === talk.me?.id || myRole === "owner" || myRole === "admin");
			/** 在主频道头部开一个空白讨论组（弹窗由 HomeScreen 承载） */
			function openBlankThread() {
				if (channelId) onCreateThread(channelId, null);
			}
			/** 从某条消息发起讨论组（自动用消息摘要取名） */
			function openThreadFromMessage(item) {
				const raw = item.content.replace(/\s+/g, " ").trim();
				const name = raw.length > 40 ? `${raw.slice(0, 40)}…` : raw || "话题讨论";
				if (channelId) onCreateThread(channelId, {
					name,
					starterMessageId: item.id
				});
			}
			/** 归档 / 恢复当前讨论组 */
			async function toggleThreadArchive() {
				if (!currentThread) return;
				await setThreadArchived(currentThread.id, currentThread.status === "active");
			}
			function onScroll(event) {
				const el = event.currentTarget;
				pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
			}
			(0, react.useEffect)(() => {
				const el = scrollRef.current;
				if (!el) return;
				const switched = channelRef.current !== roomKey;
				channelRef.current = roomKey;
				if (switched) {
					lastCountRef.current = messageCount;
					el.scrollTop = el.scrollHeight;
					pinnedRef.current = true;
					return;
				}
				const grew = messageCount > lastCountRef.current;
				lastCountRef.current = messageCount;
				if (grew && pinnedRef.current) el.scrollTop = el.scrollHeight;
			}, [roomKey, messageCount]);
			(0, react.useEffect)(() => {
				setComposerText("");
				setMentionActive(false);
				setMentionQuery("");
				setMentionIndex(0);
				mentionStartRef.current = -1;
			}, [roomKey]);
			(0, react.useEffect)(() => {
				if (talk.view.replyingTo) composerRef.current?.focus();
			}, [talk.view.replyingTo]);
			(0, react.useEffect)(() => {
				const targetId = talk.view.focusMessageId;
				if (!targetId) return;
				const el = scrollRef.current?.querySelector(`[data-msg-id="${targetId}"]`);
				if (el) {
					pinnedRef.current = false;
					el.scrollIntoView({
						block: "center",
						behavior: "smooth"
					});
				}
				const timer = window.setTimeout(() => clearMessageFocus(), 1800);
				return () => window.clearTimeout(timer);
			}, [talk.view.focusMessageId]);
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
			/** 光标前是否存在正在输入的 `@handle`，返回 token 起点与已输入部分 */
			function mentionAtCaret(text, caret) {
				if (caret < 1) return null;
				let i = caret - 1;
				while (i >= 0 && /[\p{L}\p{N}_]/u.test(text.charAt(i))) i -= 1;
				if (i < 0 || text.charAt(i) !== "@") return null;
				if (i > 0 && /[\p{L}\p{N}_]/u.test(text.charAt(i - 1))) return null;
				return {
					start: i,
					query: text.slice(i + 1, caret)
				};
			}
			/** 把选中的成员插入正文，替换掉当前 @token */
			function acceptMention(member) {
				const text = composerText;
				const caret = composerRef.current?.selectionStart ?? text.length;
				const start = mentionStartRef.current >= 0 ? mentionStartRef.current : Math.max(0, caret - mentionQuery.length - 1);
				const next = `${text.slice(0, start)}@${member.handle} ${text.slice(caret)}`;
				setComposerText(next);
				setMentionActive(false);
				setMentionQuery("");
				mentionStartRef.current = -1;
				const caretAfter = start + member.handle.length + 2;
				const el = composerRef.current;
				if (el) window.requestAnimationFrame(() => {
					el.focus();
					el.setSelectionRange(caretAfter, caretAfter);
				});
			}
			function handleComposerChange(value) {
				setComposerText(value);
				const hit = mentionAtCaret(value, composerRef.current?.selectionStart ?? value.length);
				if (hit) {
					mentionStartRef.current = hit.start;
					setMentionQuery(hit.query);
					setMentionIndex(0);
					setMentionActive(true);
				} else {
					mentionStartRef.current = -1;
					setMentionActive(false);
				}
			}
			function handleComposerKeyDown(e) {
				const choosing = mentionActive && mentionCandidates.length > 0;
				if (choosing && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
					e.preventDefault();
					const delta = e.key === "ArrowDown" ? 1 : -1;
					setMentionIndex((i) => (i + delta + mentionCandidates.length) % mentionCandidates.length);
					return;
				}
				if (choosing && (e.key === "Enter" || e.key === "Tab")) {
					e.preventDefault();
					const pick = mentionCandidates[mentionIndex];
					if (pick) acceptMention(pick);
					return;
				}
				if (mentionActive && e.key === "Escape") {
					e.preventDefault();
					setMentionActive(false);
					return;
				}
				if (e.key === "Enter" && !e.shiftKey) {
					e.preventDefault();
					submit();
				}
			}
			async function submit() {
				const text = composerText;
				if (text.trim().length === 0 && pendingFiles.length === 0) return;
				if (await sendMessage(text, pendingFiles)) {
					setComposerText("");
					setPendingFiles([]);
					setMentionActive(false);
					mentionStartRef.current = -1;
					composerRef.current?.focus();
				}
			}
			async function openOnline() {
				setOnlineOpen(true);
				setOnlineLoading(true);
				const list = await fetchChannelOnline();
				setOnlineMembers(list);
				setOnlineLoading(false);
			}
			const hasOlder = talk.view.nextCursor !== null;
			const canLoadMore = !talk.view.loadingOlder && hasOlder;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: chatCol,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "10px 16px",
							borderBottom: `1px solid ${palette.border}`
						},
						children: [
							isThread && currentThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutline14, {}),
								onClick: () => void closeThread(),
								"aria-label": isForumChannel ? "返回话题列表" : "返回主频道",
								title: isForumChannel ? "返回话题列表" : `返回 #${channel?.name ?? ""}`
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: {
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									width: 24,
									height: 22,
									borderRadius: 6,
									background: palette.inputBg,
									border: `1px solid ${palette.border}`,
									flex: "0 0 auto"
								},
								children: isThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { color: palette.muted },
									children: "#"
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									minWidth: 0,
									flex: 1
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 15,
										fontWeight: 700,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: isThread ? currentThread?.name ?? (isForumChannel ? "话题" : "讨论组") : channel?.name ?? ""
								}), isThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										...smallText,
										fontSize: 11,
										color: palette.caption
									},
									children: [
										isForumChannel ? "话题" : "讨论组",
										currentThread?.status === "archived" ? "（已归档）" : "",
										" · 位于 #",
										channel?.name ?? ""
									]
								}) : channel?.topic ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										...smallText,
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap"
									},
									children: channel.topic
								}) : null]
							}),
							isThread && currentThread?.visibility === "private" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {}),
								onClick: () => setThreadMembersOpen(true),
								"aria-label": "讨论组成员",
								title: "管理私密讨论组成员",
								children: "成员"
							}) : null,
							canManageThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, {}),
								onClick: () => setThreadSettingsOpen(true),
								"aria-label": "讨论组设置",
								title: "改动讨论组：名称 / 可见性 / 进入密码"
							}) : null,
							isThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => void toggleThreadArchive(),
								"aria-label": currentThread?.status === "active" ? "归档" : "恢复",
								title: isForumChannel ? currentThread?.status === "active" ? "归档话题（24h 无人回复也会自动归档）" : "把话题恢复为活跃" : currentThread?.status === "active" ? "手动归档（24h 无人发言也会自动归档）" : "把讨论组恢复为活跃",
								children: currentThread?.status === "active" ? "归档" : "恢复"
							}) : null,
							!isThread && canPost && channel?.kind !== "announcement" ? isForumChannel ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}),
								onClick: openBlankThread,
								children: "新建话题"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, {}),
								onClick: openBlankThread,
								"aria-label": "创建讨论组",
								title: "为当前频道开一个讨论组"
							}) : null,
							!isThread && !isForumBoard ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconShareOutline16, {}),
								onClick: () => setShareOpen(true),
								"aria-label": "分享",
								title: "把本机 DSH 会话分享到社区"
							}) : null,
							!isThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, {}),
								onClick: () => setSearchOpen(true),
								"aria-label": "搜索消息",
								title: "搜索社区内的消息"
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									marginLeft: "auto",
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
									flex: "0 0 auto"
								},
								children: [talk.view.live && !isThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									size: "sm",
									variant: "ghost",
									icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconUserOutline16, {}),
									onClick: () => void openOnline(),
									"aria-label": "在线成员",
									title: "当前房间在线成员",
									children: talk.view.onlineCount
								}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										gap: 6,
										padding: "3px 8px",
										borderRadius: 999,
										background: talk.view.live ? palette.hover : palette.inputBg,
										border: `1px solid ${palette.border}`
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
										...liveDot,
										background: talk.view.live ? palette.success : palette.muted,
										boxShadow: talk.view.live ? `0 0 5px ${palette.success}` : void 0
									} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											fontSize: 11,
											color: palette.secondary
										},
										children: talk.view.live ? "实时" : "重连中…"
									})]
								})]
							})
						]
					}), isForumBoard ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ForumTopicBoard, {
						channelId,
						onNewTopic: openBlankThread
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						ref: scrollRef,
						onScroll,
						style: messagesWrap,
						children: talk.view.messagesLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: { ...emptyMsg },
							children: "加载消息…"
						}) : talk.view.messages.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { ...emptyMsg },
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										width: 44,
										height: 44,
										borderRadius: 14,
										fontSize: 19,
										fontWeight: 700,
										color: palette.accent,
										background: palette.inputBg,
										border: `1px solid ${palette.border}`
									},
									children: "#"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 13,
										fontWeight: 600,
										color: palette.text
									},
									children: channel?.kind === "announcement" ? "暂无公告" : "还没有消息"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: { fontSize: 12 },
									children: channel?.kind === "announcement" ? canPost ? "在这里发布面向全员的公告。" : "公告由所有者/管理员发布。" : "来说第一句吧。"
								})
							]
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [canLoadMore ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: creatorRow,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => void loadOlderMessages(),
								disabled: talk.view.loadingOlder,
								children: talk.view.loadingOlder ? "加载中…" : "加载更早消息"
							})
						}) : null, talk.view.messages.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MessageRow, {
							item,
							onCreateThread: openThreadFromMessage
						}, item.id))] })
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: composerWrap,
						children: canPost ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
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
								children: [
									replyingPreview ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 8,
											background: palette.inputBg,
											border: `1px solid ${palette.border}`,
											borderRadius: 8,
											padding: "2px 4px 2px 8px"
										},
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: {
													color: palette.accent,
													display: "inline-flex"
												},
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ReplyGlyph, {})
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: {
													flex: 1,
													minWidth: 0,
													fontSize: 11.5,
													color: palette.secondary,
													overflow: "hidden",
													textOverflow: "ellipsis",
													whiteSpace: "nowrap"
												},
												children: [
													"正在回复",
													" ",
													/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														style: {
															fontWeight: 600,
															color: palette.text
														},
														children: ["@", replyingPreview.author]
													}),
													replyingPreview.content ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: ["：", replyingPreview.content] }) : null
												]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												size: "sm",
												variant: "ghost",
												icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, {}),
												onClick: () => {
													cancelReply();
													composerRef.current?.focus();
												},
												"aria-label": "取消回复"
											})
										]
									}) : null,
									pendingFiles.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
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
									}) : null,
									mentionActive ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										style: {
											background: palette.elevated,
											border: `1px solid ${palette.border}`,
											borderRadius: 10,
											padding: 4,
											maxHeight: 220,
											overflowY: "auto",
											boxShadow: "0 4px 16px rgba(0,0,0,0.14)"
										},
										children: talk.view.membersLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: palette.muted,
												padding: "8px 10px",
												textAlign: "center"
											},
											children: "加载成员…"
										}) : mentionCandidates.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											style: {
												fontSize: 12,
												color: palette.muted,
												padding: "8px 10px",
												textAlign: "center"
											},
											children: mentionQuery.length > 0 ? `没有匹配「${mentionQuery}」的成员` : "还没有成员"
										}) : mentionCandidates.map((member, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											onMouseDown: (e) => e.preventDefault(),
											onClick: () => acceptMention(member),
											style: {
												display: "flex",
												alignItems: "center",
												gap: 8,
												width: "100%",
												border: "none",
												background: i === mentionIndex ? palette.hover : "transparent",
												borderRadius: 8,
												padding: "5px 8px",
												cursor: "pointer",
												textAlign: "left"
											},
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
													label: member.handle,
													src: member.avatarUrl,
													size: 18
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: {
														fontSize: 13,
														fontWeight: 600,
														color: palette.text,
														flex: "0 0 auto"
													},
													children: member.displayName ?? member.handle
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														fontSize: 12,
														color: palette.caption
													},
													children: ["@", member.handle]
												})
											]
										}, member.userId))
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
										ref: composerRef,
										value: composerText,
										onChange: (e) => handleComposerChange(e.target.value),
										onKeyDown: handleComposerKeyDown,
										placeholder: isThread && currentThread ? `在「${currentThread.name}」里发消息…` : `在 #${channel?.name ?? ""} 发消息…`,
										style: textArea
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "primary",
								size: "md",
								icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline16, {}),
								disabled: talk.view.sending || composerText.trim().length === 0 && pendingFiles.length === 0,
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
						] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								...smallText,
								fontSize: 12,
								flex: 1,
								textAlign: "center",
								padding: "10px 0"
							},
							children: "公告频道仅所有者/管理员可发布，普通成员只读。"
						})
					})] })]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShareSnapshotModal, {
					open: shareOpen,
					onClose: () => setShareOpen(false),
					channelId: channelId ?? "",
					communityId: community?.id ?? null
				}),
				isThread && currentThread ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadMembersModal, {
					open: threadMembersOpen,
					onClose: () => setThreadMembersOpen(false),
					thread: currentThread
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadSettingsModal, {
					open: threadSettingsOpen,
					onClose: () => setThreadSettingsOpen(false),
					thread: currentThread
				})] }) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchMessagesModal, {
					open: searchOpen,
					onClose: () => setSearchOpen(false)
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(OnlineMembersModal, {
					open: onlineOpen,
					onClose: () => setOnlineOpen(false),
					loading: onlineLoading,
					members: onlineMembers
				})
			] });
		}
		//#endregion
		//#region packages/client/src/components/Inbox.tsx
		function BellGlyph() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				"aria-hidden": true,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 2.4a3.7 3.7 0 0 0-3.7 3.7c0 2 .6 2.9 1 3.5h5.4c.4-.6 1-1.5 1-3.5A3.7 3.7 0 0 0 8 2.4Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6.4 12.2a1.7 1.7 0 0 0 3.2 0" })]
			});
		}
		const rowWrap = {
			display: "flex",
			gap: 10,
			alignItems: "flex-start",
			padding: "10px 12px",
			borderRadius: 12,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`
		};
		const STATUS_LABEL = {
			accepted: "已接受",
			declined: "已拒绝"
		};
		function InboxRow({ item }) {
			const talk = useTalkState();
			const invite = item.invite;
			const busy = talk.inboxBusyId !== null && invite?.id === talk.inboxBusyId;
			const communityName = item.data?.communityName ?? "";
			const icon = item.data?.communityIconUrl ?? null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rowWrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
						label: communityName || "邀",
						src: icon,
						size: 34
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							flex: 1,
							minWidth: 0,
							display: "flex",
							flexDirection: "column",
							gap: 3
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 13,
									fontWeight: 650,
									color: palette.text,
									overflow: "hidden",
									textOverflow: "ellipsis",
									whiteSpace: "nowrap"
								},
								children: item.title
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									fontSize: 12,
									color: palette.secondary,
									lineHeight: 1.5,
									whiteSpace: "pre-wrap",
									wordBreak: "break-word"
								},
								children: item.body
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 8
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...smallText,
										fontSize: 11
									},
									children: timeLabel(item.createdAt)
								}), !item.isRead ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
									width: 7,
									height: 7,
									borderRadius: "50%",
									background: palette.accent,
									flex: "0 0 auto"
								} }) : null]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 6,
							flex: "0 0 auto",
							paddingTop: 2
						},
						children: item.kind === "invite" ? invite === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								...smallText,
								fontSize: 11,
								color: palette.muted
							},
							children: "邀请已失效"
						}) : invite.status === "pending" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "primary",
							disabled: busy,
							onClick: () => void acceptInvite(invite.id),
							children: busy ? "加入中…" : "加入"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							size: "sm",
							variant: "ghost",
							disabled: busy,
							onClick: () => {
								if (window.confirm("拒绝这条社区邀请？")) declineInvite(invite.id);
							},
							children: "拒绝"
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							style: {
								fontSize: 11.5,
								color: palette.muted
							},
							children: STATUS_LABEL[invite.status] ?? invite.status
						}) : null
					})
				]
			});
		}
		function InboxDialog() {
			const talk = useTalkState();
			const unread = talk.inboxUnread;
			const hasInvites = talk.notifications.length > 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open: talk.inboxOpen,
				onClose: () => closeInbox(),
				title: "站内信",
				closeLabel: "关闭",
				description: "社区邀请与重要事件会出现在这里。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					size: "sm",
					disabled: unread === 0,
					onClick: () => void markAllNotificationsRead(),
					children: "全部已读"
				}),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 8,
						maxWidth: 560
					},
					children: talk.inboxLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...smallText,
							padding: "14px 4px"
						},
						children: "加载中…"
					}) : !hasInvites ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...smallText,
							padding: "20px 4px",
							textAlign: "center"
						},
						children: [
							"暂时没有站内信。",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
							"当有人邀请你加入社区时，会第一时间出现在这里。"
						]
					}) : talk.notifications.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InboxRow, { item }, item.id))
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/CommunitiesRail.tsx
		const tipWrap = {
			display: "flex",
			flexDirection: "column",
			gap: 2,
			minWidth: 176,
			maxWidth: 260
		};
		const tipTitle = {
			fontSize: 13,
			fontWeight: 600,
			color: palette.text
		};
		const tipHint = {
			fontSize: 11.5,
			lineHeight: 1.5,
			color: palette.caption
		};
		/** 窄列图标的 hover 说明卡：标题 + 可选副标题 */
		function RailTip({ title, hint }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: tipWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: tipTitle,
					children: title
				}), hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: tipHint,
					children: hint
				}) : null]
			});
		}
		/** 社区栏 hover 小窗：名称、可见性、描述、成员总数（只读，点击仍选社区） */
		function CommunityMetaCard({ community }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: tipWrap,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							alignItems: "center",
							gap: 8
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
							color: "#fff",
							label: community.name,
							src: community.iconUrl,
							size: 32,
							inset: 3
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: { minWidth: 0 },
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: {
									...tipTitle,
									whiteSpace: "nowrap",
									overflow: "hidden",
									textOverflow: "ellipsis"
								},
								children: community.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								style: tipHint,
								children: PRIVACY_LABELS[community.privacy]
							})]
						})]
					}),
					community.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							marginTop: 6,
							fontSize: 12,
							lineHeight: 1.6,
							color: palette.secondary,
							whiteSpace: "pre-wrap",
							wordBreak: "break-word",
							display: "-webkit-box",
							WebkitLineClamp: 3,
							WebkitBoxOrient: "vertical",
							overflow: "hidden"
						},
						children: community.description
					}) : null,
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...tipHint,
							marginTop: 6
						},
						children: [community.memberCount, " 名成员"]
					})
				]
			});
		}
		/** 底部个人中心 hover 小窗：头像 + 昵称/@用户名 + 进入提示 */
		function UserMetaCard({ label, handle, avatarUrl }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: tipWrap,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
						label: handle,
						src: avatarUrl,
						size: 32
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: { minWidth: 0 },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...tipTitle,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis"
							},
							children: label
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: tipHint,
							children: ["@", handle]
						})]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: {
						...tipHint,
						marginTop: 6
					},
					children: "点击进入个人中心"
				})]
			});
		}
		function CommunitiesRail({ onAdd, onInbox, onOpenProfile }) {
			const talk = useTalkState();
			const current = talk.view.communityId;
			const me = talk.me;
			const unreadLabel = talk.inboxUnread > 99 ? "99+" : String(talk.inboxUnread);
			/** 统一给窄列图标包一层 hover 卡（去除原生 title，避免重复提示） */
			function withTip(anchor, content, delay = 300) {
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.HoverCard, {
					openDelayMs: delay,
					content,
					anchor
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rail,
				children: [
					withTip(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandLogo, {
						size: 34,
						title: "dsh-talk 社区"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RailTip, {
						title: "dsh-talk",
						hint: "把本机 DSH 会话分享到社区里交流"
					})),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 2,
							marginTop: 6
						},
						children: [withTip(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: railAction,
							onClick: onInbox,
							"aria-label": "站内信",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: railAvatar,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BellGlyph, {}), talk.inboxUnread > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										...railBubble,
										top: -5,
										right: -7
									},
									children: unreadLabel
								}) : null]
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RailTip, {
							title: "站内信",
							hint: talk.inboxUnread > 0 ? `${unreadLabel} 条未读，含社区邀请` : "社区邀请与重要事件"
						})), withTip(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: railAction,
							onClick: onAdd,
							"aria-label": "加入、发现或创建社区",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, {})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RailTip, {
							title: "加入、发现或创建社区",
							hint: "用邀请码加入，或发现、创建新社区"
						}))]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: railDivider }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: railScroll,
						children: talk.communities.map((c) => {
							const active = c.id === current;
							const unread = c.unreadChannels;
							const mention = c.unreadMentions;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								style: railItem,
								onClick: () => {
									if (!active) openCommunity(c.id);
								},
								children: [active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: railPill }) : null, withTip(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: railAvatar,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
										color: "#fff",
										label: c.name,
										src: c.iconUrl,
										size: 44,
										inset: 4
									}), mention > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...railBubble,
											background: palette.accent
										},
										children: mention
									}) : unread > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: railBubble,
										children: unread
									}) : null]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunityMetaCard, { community: c }))]
							}, c.id);
						})
					}),
					me ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							padding: "8px 0 12px",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 4,
							width: "100%"
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { style: railDivider }), withTip(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							style: railAction,
							onClick: onOpenProfile,
							"aria-label": "个人中心",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
								label: me.handle,
								src: me.avatarUrl,
								size: 34
							})
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UserMetaCard, {
							label: me.displayName ?? me.handle,
							handle: me.handle,
							avatarUrl: me.avatarUrl
						}), 150)]
					}) : null
				]
			});
		}
		//#endregion
		//#region packages/client/src/components/CommunityAddModal.tsx
		const discoverRow = {
			display: "flex",
			alignItems: "center",
			gap: 8,
			padding: "7px 10px",
			borderRadius: 10,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`
		};
		const discoverName = {
			fontSize: 13,
			fontWeight: 600,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		const discoverDesc = {
			fontSize: 11.5,
			color: palette.caption,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		/** 「加入 / 发现 / 创建」合并为一个弹窗：顶部 tab 切换，默认「加入」 */
		function CommunityAddModal({ open, onClose }) {
			const talk = useTalkState();
			const [tab, setTab] = (0, react.useState)("join");
			const [code, setCode] = (0, react.useState)("");
			const [discoverItems, setDiscoverItems] = (0, react.useState)([]);
			const [discoverLoading, setDiscoverLoading] = (0, react.useState)(false);
			const [keyword, setKeyword] = (0, react.useState)("");
			const [joiningId, setJoiningId] = (0, react.useState)(null);
			const [name, setName] = (0, react.useState)("");
			const [description, setDescription] = (0, react.useState)("");
			const [privacy, setPrivacy] = (0, react.useState)("public");
			const [iconUrl, setIconUrl] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(false);
			const joinedIds = new Set(talk.communities.map((c) => c.id));
			(0, react.useEffect)(() => {
				if (open) {
					setTab("join");
					setCode("");
					setKeyword("");
					setDiscoverItems([]);
					setJoiningId(null);
					setName("");
					setDescription("");
					setPrivacy("public");
					setIconUrl(null);
				}
			}, [open]);
			async function pickIcon(file) {
				const url = await uploadImage(file);
				if (url) setIconUrl(url);
			}
			/** 拉公开社区目录（关键词为空 = 热门） */
			async function loadDiscover(q) {
				setDiscoverLoading(true);
				const items = await discoverCommunities({ q });
				setDiscoverItems(items);
				setDiscoverLoading(false);
			}
			/** 加入公开社区并进入 */
			async function enter(communityId) {
				if (joiningId !== null) return;
				setJoiningId(communityId);
				const ok = await joinPublicCommunity(communityId);
				setJoiningId(null);
				if (ok) onClose();
			}
			async function submit() {
				if (busy) return;
				if (tab !== "create") {
					if (code.trim().length === 0) return;
					setBusy(true);
					const ok = await joinCommunityByCode(code);
					setBusy(false);
					if (ok) {
						setCode("");
						onClose();
					}
					return;
				}
				if (name.trim().length === 0) return;
				setBusy(true);
				const body = {
					name: name.trim(),
					privacy,
					iconUrl
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
			const creating = tab === "create";
			const discovering = tab === "discover";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: creating ? "创建社区" : discovering ? "发现社区" : "加入社区",
				closeLabel: "关闭",
				footer: discovering ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "关闭"
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "取消"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy || (creating ? name.trim().length === 0 : code.trim().length === 0),
					onClick: () => void submit(),
					children: busy ? creating ? "创建中…" : "加入中…" : creating ? "创建" : "加入"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 12
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: pillGroup,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: pillStyle(tab === "join"),
								onClick: () => setTab("join"),
								children: "加入"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: pillStyle(discovering),
								onClick: () => {
									setTab("discover");
									loadDiscover(keyword);
								},
								children: "发现"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: pillStyle(creating),
								onClick: () => setTab("create"),
								children: "创建"
							})
						]
					}), creating ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "社区头像"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AvatarPicker, {
								src: iconUrl,
								label: name.trim() || "社区",
								size: 60,
								onPick: (file) => void pickIcon(file),
								onRemove: () => setIconUrl(null),
								uploadLabel: "设置头像",
								removeLabel: "移除头像",
								busy
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-create-name",
								style: fieldLabel,
								children: "社区名称"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-create-name",
								value: name,
								onChange: (e) => setName(e.target.value),
								placeholder: "社区名称"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "talk-create-desc",
								style: fieldLabel,
								children: "简介"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								id: "talk-create-desc",
								value: description,
								onChange: (e) => setDescription(e.target.value),
								placeholder: "简介（可选）"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: fieldBlock,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								style: fieldLabel,
								children: "可见性"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: pillGroup,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(privacy === "public"),
									onClick: () => setPrivacy("public"),
									children: "公开"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: pillStyle(privacy === "private"),
									onClick: () => setPrivacy("private"),
									children: "私有"
								})]
							})]
						})
					] }) : discovering ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: "flex",
							flexDirection: "column",
							gap: 10
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								gap: 8
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
								value: keyword,
								onChange: (e) => setKeyword(e.target.value),
								onKeyDown: (e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										loadDiscover(keyword);
									}
								},
								placeholder: "搜索公开社区（名称 / 简介）",
								"aria-label": "搜索公开社区"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
								variant: "outline",
								onClick: () => void loadDiscover(keyword),
								children: "搜索"
							})]
						}), discoverLoading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: "8px 2px"
							},
							children: "加载社区…"
						}) : discoverItems.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								...smallText,
								padding: "8px 2px"
							},
							children: "没有找到公开社区。"
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 6,
								maxHeight: 320,
								overflowY: "auto"
							},
							children: discoverItems.map((item) => {
								const joined = joinedIds.has(item.id);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: discoverRow,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Avatar, {
											label: item.name,
											src: item.iconUrl
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												flex: 1,
												minWidth: 0
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												style: discoverName,
												children: [item.name, /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													style: {
														color: palette.caption,
														fontSize: 11
													},
													children: [
														" ",
														"· ",
														item.memberCount,
														" 成员"
													]
												})]
											}), item.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												style: discoverDesc,
												children: item.description
											}) : null]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
											size: "sm",
											variant: joined ? "ghost" : "primary",
											disabled: joiningId !== null,
											onClick: () => joined ? void openCommunity(item.id) : void enter(item.id),
											children: joined ? "进入" : joiningId === item.id ? "加入中…" : "加入"
										})
									]
								}, item.id);
							})
						})]
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: fieldBlock,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							htmlFor: "talk-join-code",
							style: fieldLabel,
							children: "邀请码"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
							id: "talk-join-code",
							value: code,
							onChange: (e) => setCode(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									submit();
								}
							},
							placeholder: "邀请码，如 ABCD1234"
						})]
					})]
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/ProfileModal.tsx
		/** 只读信息行：左侧标签，右侧值（单行省略） */
		const infoRow = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 12,
			padding: "8px 10px",
			borderRadius: 10,
			background: palette.inputBg,
			border: `1px solid ${palette.border}`
		};
		const infoValue = {
			fontSize: 13,
			fontWeight: 600,
			color: palette.text,
			minWidth: 0,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap"
		};
		function ProfileModal({ open, onClose }) {
			const talk = useTalkState();
			const me = talk.me;
			const [nickname, setNickname] = (0, react.useState)("");
			const [nicknameBusy, setNicknameBusy] = (0, react.useState)(false);
			const [username, setUsername] = (0, react.useState)("");
			const [usernameBusy, setUsernameBusy] = (0, react.useState)(false);
			const [avatarBusy, setAvatarBusy] = (0, react.useState)(false);
			const [currentPwd, setCurrentPwd] = (0, react.useState)("");
			const [newPwd, setNewPwd] = (0, react.useState)("");
			const [confirmPwd, setConfirmPwd] = (0, react.useState)("");
			const [pwdBusy, setPwdBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (open) setNickname(me?.displayName ?? "");
			}, [open, me?.displayName]);
			(0, react.useEffect)(() => {
				if (open) setUsername(me?.handle ?? "");
			}, [open, me?.handle]);
			(0, react.useEffect)(() => {
				if (open) {
					setCurrentPwd("");
					setNewPwd("");
					setConfirmPwd("");
				}
			}, [open]);
			if (!me) return null;
			async function pickAvatar(file) {
				setAvatarBusy(true);
				await updateUserAvatar(file);
				setAvatarBusy(false);
			}
			async function removeAvatar() {
				setAvatarBusy(true);
				await removeUserAvatar();
				setAvatarBusy(false);
			}
			async function saveNickname() {
				if (nicknameBusy) return;
				setNicknameBusy(true);
				await updateUserNickname(nickname);
				setNicknameBusy(false);
			}
			async function saveUsername() {
				if (usernameBusy) return;
				setUsernameBusy(true);
				await updateUserUsername(username);
				setUsernameBusy(false);
			}
			async function submitPassword() {
				if (pwdBusy) return;
				if (currentPwd.length === 0) {
					notify("请输入当前密码");
					return;
				}
				if (newPwd.length < 8) {
					notify("新密码至少 8 位");
					return;
				}
				if (newPwd !== confirmPwd) {
					notify("两次输入的新密码不一致");
					return;
				}
				setPwdBusy(true);
				const ok = await changePassword({
					currentPassword: currentPwd,
					newPassword: newPwd
				});
				setPwdBusy(false);
				if (ok) {
					setCurrentPwd("");
					setNewPwd("");
					setConfirmPwd("");
				}
			}
			function confirmLogout() {
				if (window.confirm("确定要退出登录吗？")) logout();
			}
			const canSubmitPwd = !pwdBusy && currentPwd.length > 0 && newPwd.length >= 8 && newPwd === confirmPwd;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TalkModal, {
				open,
				onClose,
				title: "个人中心",
				closeLabel: "关闭",
				description: "管理你的头像、昵称、用户名与登录密码。",
				footer: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "ghost",
					onClick: onClose,
					children: "关闭"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					onClick: confirmLogout,
					children: "退出登录"
				})] }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 16
					},
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 10
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										fontWeight: 650,
										color: palette.text
									},
									children: "个人资料"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 6
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: fieldLabel,
										children: "头像"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AvatarPicker, {
										src: me.avatarUrl,
										label: me.handle,
										size: 60,
										onPick: (file) => void pickAvatar(file),
										onRemove: () => void removeAvatar(),
										busy: avatarBusy
									})]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 6
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "talk-profile-nickname",
											style: fieldLabel,
											children: "昵称"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 8
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "talk-profile-nickname",
												value: nickname,
												onChange: (e) => setNickname(e.target.value),
												onKeyDown: (e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														saveNickname();
													}
												},
												placeholder: me.handle
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												disabled: nicknameBusy || nickname.trim().length === 0,
												onClick: () => void saveNickname(),
												children: nicknameBusy ? "保存中…" : "保存"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...smallText,
												fontSize: 11.5
											},
											children: "昵称会显示在消息与成员列表里。"
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 6
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										fontWeight: 650,
										color: palette.text
									},
									children: "账号信息"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: {
										display: "flex",
										flexDirection: "column",
										gap: 6
									},
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "talk-profile-username",
											style: fieldLabel,
											children: "用户名"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											style: {
												display: "flex",
												gap: 8
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
												id: "talk-profile-username",
												value: username,
												onChange: (e) => setUsername(e.target.value),
												onKeyDown: (e) => {
													if (e.key === "Enter") {
														e.preventDefault();
														saveUsername();
													}
												},
												placeholder: me.handle
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
												variant: "primary",
												disabled: usernameBusy || username.trim().length === 0,
												onClick: () => void saveUsername(),
												children: usernameBusy ? "保存中…" : "保存"
											})]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												...smallText,
												fontSize: 11.5
											},
											children: "仅限大小写字母和数字，至少 4 个字符，每周只能修改一次。"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									style: infoRow,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										style: {
											...smallText,
											fontSize: 12,
											flex: "0 0 auto"
										},
										children: "邮箱"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										style: {
											display: "flex",
											alignItems: "center",
											gap: 6,
											minWidth: 0
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: infoValue,
											children: talk.meEmail ?? "—"
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											style: {
												flex: "0 0 auto",
												fontSize: 11,
												fontWeight: 600,
												color: palette.success
											},
											children: "已验证"
										})]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: {
								display: "flex",
								flexDirection: "column",
								gap: 8
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: {
										fontSize: 12,
										fontWeight: 650,
										color: palette.text
									},
									children: "修改密码"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "password",
									autoComplete: "current-password",
									value: currentPwd,
									onChange: (e) => setCurrentPwd(e.target.value),
									placeholder: "当前密码",
									"aria-label": "当前密码"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "password",
									autoComplete: "new-password",
									value: newPwd,
									onChange: (e) => setNewPwd(e.target.value),
									placeholder: "新密码（至少 8 位）",
									"aria-label": "新密码"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Input, {
									type: "password",
									autoComplete: "new-password",
									value: confirmPwd,
									onChange: (e) => setConfirmPwd(e.target.value),
									onKeyDown: (e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											submitPassword();
										}
									},
									placeholder: "确认新密码",
									"aria-label": "确认新密码"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
									variant: "primary",
									disabled: !canSubmitPwd,
									onClick: () => void submitPassword(),
									children: pwdBusy ? "更新中…" : "更新密码"
								}) })
							]
						})
					]
				})
			});
		}
		//#endregion
		//#region packages/client/src/components/HomeScreen.tsx
		function HomeScreen() {
			const talk = useTalkState();
			const [showAdd, setShowAdd] = (0, react.useState)(false);
			const [showProfile, setShowProfile] = (0, react.useState)(false);
			/** 创建讨论组弹窗：由 HomeScreen 承载，频道列表菜单与会话头部共用 */
			const [threadCreate, setThreadCreate] = (0, react.useState)(null);
			const inCommunity = talk.view.communityId !== null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flex: 1,
					minHeight: 0
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: messageRowCss }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunitiesRail, {
						onAdd: () => setShowAdd(true),
						onInbox: () => void openInbox(),
						onOpenProfile: () => setShowProfile(true)
					}),
					inCommunity ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChannelList, { onCreateThread: (channelId) => setThreadCreate({
						channelId,
						seed: null
					}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChatPane, { onCreateThread: (channelId, seed) => setThreadCreate({
						channelId,
						seed
					}) })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						style: {
							...chatCol,
							alignItems: "center",
							justifyContent: "center"
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: emptyCard,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandLogo, { size: 52 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									style: {
										fontSize: 15,
										fontWeight: 700,
										lineHeight: 1.3,
										marginTop: 2
									},
									children: "欢迎使用 dsh-talk 社区"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									style: {
										...smallText,
										fontSize: 12.5,
										lineHeight: 1.7
									},
									children: [
										"从左侧选择一个社区开始聊天，",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
										"点左栏「＋」发现公开社区、用邀请码加入，或创建一个新社区。",
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("br", {}),
										"请不要输入如 密码、银行卡、APIKEY 等敏感信息。"
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ThreadCreateModal, {
						open: threadCreate !== null,
						onClose: () => setThreadCreate(null),
						channelId: threadCreate?.channelId ?? null,
						seed: threadCreate?.seed ?? null
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommunityAddModal, {
						open: showAdd,
						onClose: () => setShowAdd(false)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProfileModal, {
						open: showProfile,
						onClose: () => setShowProfile(false)
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InboxDialog, {})
				]
			});
		}
		//#endregion
		//#region packages/client/src/components.tsx
		/** 居中提示视图 */
		function Centered({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					flex: 1,
					minHeight: 0,
					display: "grid",
					placeItems: "center",
					padding: 24
				},
				children
			});
		}
		function LoadingView() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					color: palette.muted,
					fontSize: 13
				},
				children: "正在连接 dsh-talk Server…"
			});
		}
		function ErrorView() {
			const { error } = useTalkState();
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 12
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						color: palette.danger,
						fontSize: 13
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
		/** 「社区」页签页：随会话 view 挂载/卸载而激活/释放实时连接 */
		function TalkPage(props) {
			const talk = useTalkState();
			const ready = talk.phase === "ready";
			const sessionId = props.sessionId ?? null;
			(0, react.useEffect)(() => {
				setCurrentDshSession(sessionId);
			}, [sessionId]);
			(0, react.useEffect)(() => {
				activateTalk();
				return () => deactivateTalk();
			}, []);
			(0, react.useEffect)(() => {
				if (!ready) return;
				refreshInboxUnread();
				const timer = window.setInterval(() => void refreshInboxUnread(), 3e4);
				return () => window.clearInterval(timer);
			}, [ready]);
			let body;
			if (talk.phase === "error") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Centered, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ErrorView, {}) });
			else if (talk.phase === "anon") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Centered, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AuthScreen, {}) });
			else if (talk.busy || talk.phase === "booting") body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Centered, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LoadingView, {}) });
			else body = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HomeScreen, {});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: pageRoot,
				"data-dsht-page-root": true,
				children: [body, talk.toast.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
					text: talk.toast,
					onDone: () => dismissToast()
				}) : null]
			});
		}
		//#endregion
		//#region packages/client/src/index.ts
		const inject = ["slots", "sessions"];
		function apply(ctx) {
			const sessions = ctx.get("sessions");
			bindSessionOpener(async (sessionId) => {
				if (!sessions) return false;
				try {
					await sessions.refresh();
				} catch {}
				try {
					sessions.open(sessionId);
					return true;
				} catch {
					return false;
				}
			});
			bindSessionTree(() => {
				if (!sessions) return [];
				const snapshot = sessions.list.getSnapshot();
				const rows = [];
				for (const id of snapshot.ids) {
					const row = snapshot.byId[id];
					if (!row || row.blank || row.origin === "subagent") continue;
					rows.push({
						id: row.id,
						title: row.displayTitle ?? row.id,
						...row.cwd ? { cwd: row.cwd } : {}
					});
				}
				return rows;
			});
			try {
				ctx.slots.inject("conversation.view", () => ctx.slots.register({
					name: "conversation.view",
					id: "dsh-talk",
					order: 20,
					label: "社区",
					registrant: "dsh-talk"
				}, TalkPage));
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