"use client";

import { useState } from "react";

export default function StudioLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function login(event) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/studio/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "로그인하지 못했습니다.");
      setPending(false);
      return;
    }

    window.location.reload();
  }

  return (
    <section className="studio-gate">
      <p className="eyebrow">PRIVATE STUDIO</p>
      <h1>글 쓰는 곳</h1>
      <p>원문을 보존하고, 필요한 만큼만 다듬어 발행합니다.</p>
      <form onSubmit={login} className="studio-login-form">
        <label htmlFor="studio-password">비밀번호</label>
        <input
          id="studio-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="studio-error">{error}</p> : null}
        <button type="submit" disabled={pending}>
          {pending ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </section>
  );
}
