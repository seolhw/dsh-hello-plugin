// ================================================================
// 认证视图：登录 / 注册（邮箱或用户名 + 密码）
// 视觉全部走宿主 --dsw-* 语义 token（styles.tsx 的 palette），
// 仅在状态/行为上调用 store，不改动认证逻辑。
// ================================================================

import { Button, IconWarningOutline16, Input } from "@deepseek-ai/dsh-client-ui-primitives";
import type { CSSProperties, FormEvent, ReactElement, ReactNode } from "react";
import { useState } from "react";
import { login, register, useTalkState } from "../store";
import { palette } from "./styles";

type Mode = "login" | "register";

const card: CSSProperties = {
  width: 420,
  maxWidth: "calc(100vw - 48px)",
  background: palette.panel,
  border: `1px solid ${palette.border}`,
  borderRadius: 16,
  padding: "26px 28px",
  color: palette.text,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const brandMark: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background:
    "linear-gradient(135deg, var(--dsw-static-deepseek-500), var(--dsw-static-deepseek-400))",
  color: "#fff",
  fontWeight: 700,
  fontSize: 20,
  userSelect: "none",
  flex: "0 0 auto",
};

const fieldLabel: CSSProperties = { fontSize: 12, color: palette.muted, fontWeight: 500 };

const fieldHint: CSSProperties = { fontSize: 11, color: palette.caption };

const errorBanner: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  padding: "8px 10px",
  borderRadius: 8,
  background: palette.dangerSoft,
  color: palette.danger,
  fontSize: 12.5,
  lineHeight: 1.4,
};

/** 分段控制：登录 / 注册，以及登录态下的 邮箱 / 用户名 */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}): ReactElement {
  return (
    <div
      style={{
        display: "flex",
        padding: 3,
        gap: 2,
        borderRadius: 10,
        background: palette.inputBg,
        border: `1px solid ${palette.border}`,
      }}
    >
      {options.map((option) => {
        const active = value === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 8,
              padding: "7px 12px",
              fontSize: 13,
              fontWeight: active ? 600 : 450,
              color: active ? palette.text : palette.muted,
              background: active ? palette.elevated : "transparent",
              cursor: "pointer",
              transition: "background 120ms ease, color 120ms ease",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 带标签行的表单字段：左侧 label，右侧可选插槽（如显示/隐藏密码） */
function Field({
  label,
  htmlFor,
  right,
  children,
}: {
  label: string;
  htmlFor: string;
  right?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label htmlFor={htmlFor} style={fieldLabel}>
          {label}
        </label>
        {right}
      </span>
      {children}
    </div>
  );
}

export function AuthScreen(): ReactElement {
  const talk = useTalkState();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "login") {
        await login("email", account.trim(), password);
      } else {
        const extra: { name?: string } = {};
        if (name.trim().length > 0) extra.name = name.trim();
        await register({ ...extra, email: account.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const allowSubmit = account.trim().length > 0 && password.length >= 8;

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((prev) => !prev)}
      style={{
        border: "none",
        background: "transparent",
        padding: 0,
        color: palette.accent,
        fontSize: 11,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {showPassword ? "隐藏" : "显示"}
    </button>
  );

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={brandMark}>T</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 17, fontWeight: 650, lineHeight: 1.2 }}>dsh-talk 社区</div>
          <div style={{ ...fieldHint, fontSize: 12.5 }}>登录后参与社区讨论</div>
        </div>
      </div>

      <Segmented<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { key: "login", label: "登录" },
          { key: "register", label: "注册" },
        ]}
      />

      <form
        onSubmit={(e) => void submit(e)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Field label="邮箱" htmlFor="talk-account">
          <Input
            id="talk-account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="you@example.com"
            type="email"
            autoComplete="email"
            required
          />
        </Field>

        {mode === "register" ? (
          <Field label="昵称（可选）" htmlFor="talk-name">
            <Input
              id="talk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="显示名，留空用邮箱前缀"
            />
          </Field>
        ) : null}

        <Field label="密码" htmlFor="talk-password" right={passwordToggle}>
          <Input
            id="talk-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
          {mode === "register" ? <span style={fieldHint}>至少 8 位</span> : null}
        </Field>

        {error ? (
          <div style={errorBanner}>
            <span style={{ display: "inline-flex", flex: "0 0 auto", marginTop: 1 }}>
              <IconWarningOutline16 size={14} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>{error}</span>
          </div>
        ) : null}

        {talk.busy && !busy ? (
          <div style={{ ...fieldHint, color: palette.secondary }}>正在连接 Server…</div>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={busy || !allowSubmit}
          style={{ width: "100%" }}
        >
          {busy ? "请稍候…" : mode === "login" ? "登录" : "创建账号"}
        </Button>
      </form>
    </div>
  );
}
