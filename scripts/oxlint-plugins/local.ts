const FIXED_TEMP_PATH = /^\/(?:private\/)?tmp(?:\/|$)/u;

interface RuleContext {
  report: (descriptor: { messageId: string; node: { value: string } }) => void;
}

const plugin = {
  meta: { name: "local" },
  rules: {
    "no-fixed-temp-path": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Use testInfo.outputPath() for test artifacts, not a fixed temporary path.",
        },
        messages: {
          fixedTempPath:
            "Write test artifacts with testInfo.outputPath(), not a fixed temporary path.",
        },
        schema: [],
      },
      create(context: RuleContext) {
        return {
          Literal(node: { value: string }) {
            if (FIXED_TEMP_PATH.test(node.value)) {
              context.report({ messageId: "fixedTempPath", node });
            }
          },
        };
      },
    },
  },
};

export default plugin;
