import { cookies } from "next/headers";
import {
  STUDIO_COOKIE,
  studioIsConfigured,
  verifyStudioSession,
} from "../../lib/studio-auth";
import StudioEditor from "./studio-editor";
import StudioLogin from "./studio-login";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Studio",
  robots: { index: false, follow: false },
};

export default async function StudioPage() {
  if (!studioIsConfigured()) {
    return (
      <section className="shell studio-gate">
        <p className="eyebrow">PRIVATE STUDIO</p>
        <h1>설정이 필요합니다</h1>
        <p>
          <code>STUDIO_PASSWORD</code>와 <code>STUDIO_SECRET</code>을 환경변수로
          설정하면 편집기를 사용할 수 있습니다.
        </p>
      </section>
    );
  }

  const cookieStore = await cookies();
  const authenticated = verifyStudioSession(
    cookieStore.get(STUDIO_COOKIE)?.value,
  );

  return authenticated ? <StudioEditor /> : <StudioLogin />;
}
