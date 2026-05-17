import type { SessionContext, UnifiedSession } from "@premierstudio/ai-tools-sessions";

export async function loadSessionRegistry(): Promise<{
  registry: {
    detectAll(): Promise<
      Array<{
        parseSessions(): Promise<UnifiedSession[]>;
        extractContext(session: UnifiedSession): Promise<SessionContext>;
      }>
    >;
  };
}> {
  const pkg = "@premierstudio/ai-tools-sessions";
  const adaptersPkg = "@premierstudio/ai-tools-sessions/adapters/all";
  const mod = await import(pkg);
  await import(adaptersPkg);

  return mod as {
    registry: {
      detectAll(): Promise<
        Array<{
          parseSessions(): Promise<UnifiedSession[]>;
          extractContext(session: UnifiedSession): Promise<SessionContext>;
        }>
      >;
    };
  };
}
