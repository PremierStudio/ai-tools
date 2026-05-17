import { getPluginHostInfo, KNOWN_PLUGIN_HOSTS } from "./hosts.js";
import { getAllPluginEngines, loadEngineRegistries } from "./runtime.js";
import type {
  AiPluginDefinition,
  BuildPluginPlanOptions,
  EngineInstallPlan,
  PluginEngine,
  PluginInstallPlan,
  PluginTargetPlan,
  PluginToolId,
} from "./types.js";

type EngineRegistrySupport = Record<PluginEngine, Set<string>>;

function getRequestedEngines(plugin: AiPluginDefinition): PluginEngine[] {
  const engines: PluginEngine[] = [];
  if ((plugin.mcpServers?.length ?? 0) > 0) engines.push("mcp");
  if ((plugin.skills?.length ?? 0) > 0) engines.push("skills");
  if ((plugin.rules?.length ?? 0) > 0) engines.push("rules");
  if ((plugin.agents?.length ?? 0) > 0) engines.push("agents");
  if ((plugin.hooks?.length ?? 0) > 0) engines.push("hooks");
  return engines;
}

function getAdapterSupport(
  registries: Awaited<ReturnType<typeof loadEngineRegistries>>,
): EngineRegistrySupport {
  return {
    mcp: new Set(registries.mcp.list()),
    skills: new Set(registries.skills.list()),
    rules: new Set(registries.rules.list()),
    agents: new Set(registries.agents.list()),
    hooks: new Set(registries.hooks.list()),
  };
}

async function detectTools(
  registries: Awaited<ReturnType<typeof loadEngineRegistries>>,
): Promise<Set<string>> {
  const [mcp, skills, rules, agents, hooks] = await Promise.all([
    registries.mcp.detectAll(),
    registries.skills.detectAll(),
    registries.rules.detectAll(),
    registries.agents.detectAll(),
    registries.hooks.detectAll(),
  ]);
  return new Set([
    ...mcp.map((adapter) => adapter.id),
    ...skills.map((adapter) => adapter.id),
    ...rules.map((adapter) => adapter.id),
    ...agents.map((adapter) => adapter.id),
    ...hooks.map((adapter) => adapter.id),
  ]);
}

function resolveKnownToolIds(
  requestedEngines: PluginEngine[],
  support: EngineRegistrySupport,
): PluginToolId[] {
  const ids = new Set<string>(Object.keys(KNOWN_PLUGIN_HOSTS));
  for (const engine of requestedEngines) {
    for (const id of support[engine]) {
      ids.add(id);
    }
  }
  return [...ids].sort();
}

function selectToolIds(
  plugin: AiPluginDefinition,
  knownToolIds: PluginToolId[],
  detectedToolIds: Set<string>,
  options: BuildPluginPlanOptions,
): PluginToolId[] {
  const requested = options.tools?.length ? options.tools : plugin.targets?.include;
  const excluded = new Set(plugin.targets?.exclude ?? []);

  const selectedBase = requested?.length
    ? requested
    : detectedToolIds.size > 0
      ? [...detectedToolIds]
      : knownToolIds;

  const filtered = selectedBase.filter((toolId) => !excluded.has(toolId));
  return [...new Set(filtered)].sort();
}

function buildEnginePlan(
  engine: PluginEngine,
  toolId: PluginToolId,
  detectedToolIds: Set<string>,
  support: EngineRegistrySupport,
  requestedEngines: PluginEngine[],
  force: boolean,
): EngineInstallPlan {
  const requested = requestedEngines.includes(engine);
  const host = getPluginHostInfo(toolId);
  const nativeHostSupport = host.nativeEngineSupport[engine];
  const adapterAvailable = support[engine].has(toolId);
  const detected = detectedToolIds.has(toolId);

  if (!requested) {
    return {
      engine,
      requested: false,
      nativeHostSupport,
      adapterAvailable,
      detected,
      status: "not-requested",
    };
  }

  if (!nativeHostSupport) {
    return {
      engine,
      requested,
      nativeHostSupport,
      adapterAvailable,
      detected,
      status: "host-unsupported",
    };
  }

  if (!adapterAvailable) {
    return {
      engine,
      requested,
      nativeHostSupport,
      adapterAvailable,
      detected,
      status: "adapter-missing",
    };
  }

  if (!force && !detected) {
    return {
      engine,
      requested,
      nativeHostSupport,
      adapterAvailable,
      detected,
      status: "not-detected",
    };
  }

  return { engine, requested, nativeHostSupport, adapterAvailable, detected, status: "ready" };
}

function buildTargetPlan(
  toolId: PluginToolId,
  detectedToolIds: Set<string>,
  support: EngineRegistrySupport,
  requestedEngines: PluginEngine[],
  force: boolean,
): PluginTargetPlan {
  const host = getPluginHostInfo(toolId);
  const allEngines = getAllPluginEngines();
  const engines: EngineInstallPlan[] = allEngines.map((engine) =>
    buildEnginePlan(engine, toolId, detectedToolIds, support, requestedEngines, force),
  );

  return {
    toolId,
    toolName: host.name,
    detected: detectedToolIds.has(toolId),
    selected: true,
    installable: engines.some((entry) => entry.status === "ready"),
    host,
    engines,
  };
}

export async function buildPluginInstallPlan(
  plugin: AiPluginDefinition,
  options: BuildPluginPlanOptions = {},
): Promise<PluginInstallPlan> {
  const registries = await loadEngineRegistries();
  const requestedEngines = getRequestedEngines(plugin);
  const support = getAdapterSupport(registries);
  const detectedToolIds = new Set(
    options.detectedToolsOverride ?? [...(await detectTools(registries))],
  );
  const knownToolIds = resolveKnownToolIds(requestedEngines, support);
  const selectedToolIds = selectToolIds(plugin, knownToolIds, detectedToolIds, options);

  return {
    plugin: {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
    },
    requestedEngines,
    targets: selectedToolIds.map((toolId) =>
      buildTargetPlan(toolId, detectedToolIds, support, requestedEngines, options.force ?? false),
    ),
  };
}
