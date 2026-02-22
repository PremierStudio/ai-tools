# Add a new adapter

Create a new tool adapter for the specified package and tool. Follow these steps exactly.

## 1. Determine the target

Ask which **package** (hooks, mcp, agents, skills, or rules) and which **AI tool** to add.

## 2. Study the reference adapter

Read the Claude Code adapter for the target package — it's always the most complete:
- `packages/{package}/src/adapters/claude-code.ts`
- `packages/{package}/src/adapters/claude-code.test.ts`

Also read `packages/{package}/src/adapters/base.ts` for the base class interface.

## 3. Create the adapter file

Create `packages/{package}/src/adapters/{tool-name}.ts`:

**For hooks adapters** (complex — event mapping required):
- Define `EVENT_MAP: Record<string, string[]>` mapping all 15 universal events to tool-native events (empty array for unsupported)
- Define `REVERSE_MAP: Record<string, HookEventType[]>` as the inverse
- Extend `BaseAdapter`, implement: `id`, `name`, `version`, `capabilities`, `detect()`, `generate()`, `mapEvent()`, `mapNativeEvent()`, `uninstall()`
- Use `this.commandExists()` and `this.existsSync()` from base class in `detect()`

**For mcp/agents/skills/rules adapters** (simpler — no event mapping):
- Extend the package's `BaseAdapter`
- Implement: `id`, `name`, `version`, `detect()`, `generate()`, `install()`
- For agents: consider using `createMarkdownAdapter()` factory from `markdown-adapter.ts`

End the file with self-registration:
```typescript
const adapter = new MyToolAdapter();
registry.register(adapter);
export { MyToolAdapter };
export default adapter;
```

## 4. Register in all.ts

Add `import "./{tool-name}.js";` to `packages/{package}/src/adapters/all.ts`.

## 5. Write tests

Create `packages/{package}/src/adapters/{tool-name}.test.ts` covering:
- Metadata: `id`, `name`, `version`
- Capabilities (hooks only): all flags, `supportedEvents`, `blockableEvents`
- `mapEvent()` / `mapNativeEvent()` (hooks only): every map entry + unknown events returning `[]`
- `generate()`: file paths, content format, deduplication, empty input, multi-event
- `detect()`: both found and not-found paths

Target 100% coverage. Use the Claude Code adapter test as template.

## 6. Verify

Run `npm run check` — must pass with 0 errors and 0 warnings.
