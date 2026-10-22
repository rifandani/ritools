import { Note } from "@/core/components/ui/note";

import { Variant, VariantGrid } from "../variant";

const intents = ["default", "info", "warning", "danger", "success"] as const;

const copy: Record<
  (typeof intents)[number],
  { label: string; body: React.ReactNode }
> = {
  default: {
    label: "Batch ready",
    body: (
      <>
        <span className="num">10</span> images are loaded. Nothing left the
        device.
      </>
    ),
  },
  info: {
    label: "Working",
    body: (
      <>
        Squeeze is searching for the <span className="num">200</span> KB Target
        on every image.
      </>
    ),
  },
  warning: {
    label: "Slow",
    body: <>The encoder runs on the main thread, so the page may stutter.</>,
  },
  danger: {
    label: "Miss",
    body: (
      <>
        screenshot-0912.png did not reach the <span className="num">200</span>{" "}
        KB Target.
      </>
    ),
  },
  success: {
    label: "Done",
    body: (
      <>
        <span className="num">9</span> of <span className="num">10</span> images
        are under the <span className="num">200</span> KB Target.
      </>
    ),
  },
};

export const NoteShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      {intents.map((intent) => (
        <Variant className="w-72" key={intent} label={`intent="${intent}"`}>
          <Note intent={intent}>
            <strong>{copy[intent].label}.</strong> {copy[intent].body}
          </Note>
        </Variant>
      ))}
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="indicator={false}">
        <Note intent="success" indicator={false}>
          <strong>Done.</strong> The Batch is written to your Downloads folder.
        </Note>
      </Variant>
      <Variant className="w-72" label="long copy">
        <Note intent="warning">
          <strong>Slow.</strong> This device reports{" "}
          <span className="num">4</span> GB of memory. A Batch this large may
          take a while, and the page will not answer while it runs.
        </Note>
      </Variant>
    </VariantGrid>
  </div>
);
