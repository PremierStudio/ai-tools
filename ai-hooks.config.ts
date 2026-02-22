import { defineConfig, hook, builtinHooks } from "@premierstudio/ai-hooks";

export default defineConfig({
  // Start with built-in security hooks
  extends: [{ hooks: builtinHooks }],

  hooks: [
    // Add your custom hooks here:
    //
    // hook("before", ["shell:before"], async (ctx, next) => {
    //   console.log("Running:", ctx.event.command);
    //   await next();
    // })
    //   .id("my-hook")
    //   .name("Log Shell Commands")
    //   .build(),
  ],

  settings: {
    logLevel: "warn",
    hookTimeout: 5000,
    failMode: "open",
  },
});
