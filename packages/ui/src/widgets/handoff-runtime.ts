import type { SessionContext, UnifiedSession } from "@itz4blitz/ai-tools-sessions";

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
  const pkg = "@itz4blitz/ai-tools-sessions";
  const adaptersPkg = "@itz4blitz/ai-tools-sessions/adapters/all";
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
