// ================================================================
// 认证视图：登录 / 注册（邮箱+用户名+GitHub OAuth）
// ================================================================

import { Button, Input, Pill } from "@deepseek-ai/dsh-client-ui-primitives";
import type { CSSProperties, FormEvent, ReactElement } from "react";
import { useState } from "react";
import { githubLogin, login, register, useTalkState } from "../store";
import { palette } from "./styles";

type Mode = "login" | "register";
type LoginId = "email" | "username";

const card: CSSProperties = {
  width: 400,
  maxWidth: "calc(100vw - 48px)",
  background: palette.panel,
  border: `1px solid ${palette.border}`,
  borderRadius: 14,
  padding: "22px 24px",
  color: palette.text,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const title: CSSProperties = { margin: 0, fontSize: 17, fontWeight: 650 };

const label: CSSProperties = { fontSize: 12, color: palette.muted };

export function AuthScreen(): ReactElement {
  const talk = useTalkState();
  const [mode, setMode] = useState<Mode>("login");
  const [loginId, setLoginId] = useState<LoginId>("email");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login(loginId, account.trim(), password);
      } else {
        const extra: { name?: string; username?: string } = {};
        if (name.trim().length > 0) extra.name = name.trim();
        if (username.trim().length > 0) extra.username = username.trim();
        await register({ ...extra, email: account.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onGithub(): Promise<void> {
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

  return (
    <div style={card}>
      <h2 style={title}>dsh-talk 社区</h2>
      <div style={{ display: "flex", gap: 6 }}>
        <Pill active={mode === "login"} onClick={() => setMode("login")}>
          登录
        </Pill>
        <Pill active={mode === "register"} onClick={() => setMode("register")}>
          注册
        </Pill>
      </div>

      <form
        onSubmit={(e) => void submit(e)}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {mode === "register" ? (
          <label htmlFor="talk-name" style={label}>
            昵称（可选）
            <Input
              id="talk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="显示名，留空用邮箱前缀"
            />
          </label>
        ) : null}

        {mode === "register" ? (
          <label htmlFor="talk-username" style={label}>
            {"用户名（可选，用于 @mention 与用户名登录）"}
            <Input
              id="talk-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="如 alice"
              autoComplete="username"
            />
          </label>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Pill active={loginId === "email"} onClick={() => setLoginId("email")}>
              邮箱
            </Pill>
            <Pill active={loginId === "username"} onClick={() => setLoginId("username")}>
              用户名
            </Pill>
          </div>
        )}

        <label htmlFor="talk-account" style={label}>
          {mode === "register" ? "邮箱" : loginId === "email" ? "邮箱" : "用户名"}
          <Input
            id="talk-account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder={mode === "register" || loginId === "email" ? "you@example.com" : "alice"}
            type={mode === "register" || loginId === "email" ? "email" : "text"}
            autoComplete={mode === "register" ? "email" : "username"}
            required
          />
        </label>

        <label htmlFor="talk-password" style={label}>
          密码（至少 8 位）
          <Input
            id="talk-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </label>

        {error ? <div style={{ color: palette.danger, fontSize: 13 }}>{error}</div> : null}
        {talk.busy ? <div style={label}>连接 Server…</div> : null}

        <Button type="submit" variant="primary" size="md" disabled={busy || !allowSubmit}>
          {mode === "login" ? "登录" : "创建账号"}
        </Button>
      </form>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0" }}>
        <span style={{ flex: 1, height: 1, background: palette.border }} />
        <span style={label}>或</span>
        <span style={{ flex: 1, height: 1, background: palette.border }} />
      </div>

      <Button variant="outline" size="md" onClick={() => void onGithub()} disabled={busy}>
        GitHub 登录
      </Button>
    </div>
  );
}
