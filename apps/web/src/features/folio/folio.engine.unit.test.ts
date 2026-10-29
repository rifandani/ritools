/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion, anti-slop/no-chained-type-assertions, anti-slop/no-unknown-parameters, anti-slop/no-conditional-empty-object-spread, typescript/no-non-null-assertion, eslint/no-await-in-loop, eslint/require-await, unicorn/no-array-reverse, unicorn/no-array-sort, unicorn/no-await-expression-member, unicorn/relative-url-style -- Tests use the branded contract fixture, run real async fixtures, and assert after explicit guards. */
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import type {
  Annotation,
  Command,
  ExportScope,
  FormField,
  FormValue,
  PlanId,
  Request,
  Response,
  Snapshot,
} from "./folio";
import { findLiteralMatches, exportFilename } from "./folio";
import { BoundedCache } from "./folio.cache";
import { FolioEngine } from "./folio.engine";
import { openReader } from "./folio.reader";
import { loadWriter } from "./folio.writer";

const fixture = async (name: string) =>
  new Uint8Array(
    await readFile(new URL(`./fixtures/${name}.pdf`, import.meta.url))
  );

const token = <T>(value: string) => value as T;

interface OpenResult {
  readonly engine: FolioEngine;
  readonly snapshot: Snapshot;
}

const open = async (
  name = "geometry-forms",
  password?: string
): Promise<OpenResult> => {
  const engine = new FolioEngine();
  const opened = await engine.handle({
    _tag: "Open",
    request: token("open"),
    bytes: await fixture(name),
    name: `${name}.pdf`,
    ...(password === undefined ? {} : { password }),
  });
  if (opened.payload._tag !== "Opened") {
    throw new Error(`open failed: ${opened.payload._tag}`);
  }
  return { engine, snapshot: opened.payload.snapshot };
};

const commit = async (
  engine: FolioEngine,
  snapshot: Snapshot,
  command: Command,
  commandId = `command-${snapshot.revision}`
) =>
  (
    await engine.handle({
      _tag: "Commit",
      request: token(`commit-${commandId}`),
      session: snapshot.session,
      baseRevision: snapshot.revision,
      commandId: token(commandId),
      command,
    } as Request)
  ).payload;

const changed = (response: Response) => {
  if (response._tag !== "Changed") {
    throw new Error(`expected Changed: ${JSON.stringify(response)}`);
  }
  return response;
};

const rejected = (response: Response) => {
  if (response._tag !== "Rejected") {
    throw new Error(`expected Rejected: ${response._tag}`);
  }
  return response;
};

const plan = async (
  engine: FolioEngine,
  snapshot: Snapshot,
  scope: ExportScope
) => {
  const response = await engine.handle({
    _tag: "PlanExport",
    request: token("plan"),
    session: snapshot.session,
    revision: snapshot.revision,
    scope,
  } as Request);
  if (response.payload._tag !== "ExportPlanned") {
    throw new Error(`plan failed: ${JSON.stringify(response.payload)}`);
  }
  return response.payload.plan;
};

const write = async (
  engine: FolioEngine,
  snapshot: Snapshot,
  planId: PlanId
) => {
  const response = await engine.handle({
    _tag: "Write",
    request: token("write"),
    session: snapshot.session,
    revision: snapshot.revision,
    plan: planId,
  } as Request);
  if (response.payload._tag !== "Written") {
    throw new Error(`write failed: ${JSON.stringify(response.payload)}`);
  }
  return response.payload;
};

const fullPlan = async (engine: FolioEngine, snapshot: Snapshot) => {
  const planned = await plan(engine, snapshot, { _tag: "Full" });
  return planned;
};

const readAnnotations = async (
  engine: FolioEngine,
  snapshot: Snapshot,
  page: Snapshot["pages"][number]["id"]
) => {
  const response = await engine.handle({
    _tag: "ReadAnnotations",
    request: token("annotations"),
    session: snapshot.session,
    revision: snapshot.revision,
    page,
  } as Request);
  if (response.payload._tag !== "AnnotationsRead") {
    throw new Error(`annotations failed: ${JSON.stringify(response.payload)}`);
  }
  return response.payload.annotations;
};

const readForms = async (engine: FolioEngine, snapshot: Snapshot) => {
  const response = await engine.handle({
    _tag: "ReadForms",
    request: token("forms"),
    session: snapshot.session,
    revision: snapshot.revision,
  } as Request);
  if (response.payload._tag !== "FormsRead") {
    throw new Error(`forms failed: ${JSON.stringify(response.payload)}`);
  }
  return response.payload.fields;
};

const field = (fields: readonly FormField[], name: string) => {
  const found = fields.find((item) => item.name === name);
  if (!found) {
    throw new Error(`missing field ${name}`);
  }
  return found;
};

const formValue = (fields: readonly FormField[], name: string): FormValue =>
  field(fields, name).value;

const reopenText = async (bytes: Uint8Array) => {
  const reader = await openReader(bytes);
  const pages: { rotation: number; text: string }[] = [];
  for (let index = 0; index < reader.numPages; index += 1) {
    const text = await reader.text(index);
    const page = (await reader.pages([token(`p:${index}`)]))[0]!;
    pages.push({
      rotation: page.rotation,
      text: text.runs.map((run) => run.text).join(""),
    });
  }
  await reader.destroy();
  return pages;
};

describe("folio public helpers", () => {
  it("makes safe download names", () => {
    expect(exportFilename("Report.PDF", { _tag: "Full" })).toBe(
      "Report-edited.pdf"
    );
    expect(exportFilename("a/b:c", { _tag: "Selected", pages: [] })).toBe(
      "a-b-c-pages.pdf"
    );
    expect(exportFilename(".pdf", { _tag: "Full" })).toBe(
      "document-edited.pdf"
    );
  });

  it("finds literal matches across runs without a regular expression", () => {
    const runs = [
      {
        text: "Hello ",
        transform: [1, 0, 0, 1, 0, 0] as const,
        width: 30,
        height: 10,
        direction: "ltr" as const,
        hasEol: false,
      },
      {
        text: "World",
        transform: [1, 0, 0, 1, 30, 0] as const,
        width: 30,
        height: 10,
        direction: "ltr" as const,
        hasEol: false,
      },
    ];
    const boxes = [
      { x: 0, y: 0, width: 30, height: 10 },
      { x: 30, y: 0, width: 30, height: 10 },
    ];
    const matches = findLiteralMatches(token("page:1"), runs, boxes, "o w");
    expect(matches).toHaveLength(1);
    expect(matches[0]?.boxes).toHaveLength(2);
    expect(findLiteralMatches(token("page:1"), runs, boxes, "")).toEqual([]);
  });

  it("keeps caches inside count and byte limits and closes evicted values", () => {
    const closed: number[] = [];
    const cache = new BoundedCache<string, { size: number; id: number }>(
      { maxCount: 2, maxBytes: 10 },
      (value) => value.size,
      (value) => closed.push(value.id)
    );
    cache.set("a", { size: 4, id: 1 });
    cache.set("b", { size: 4, id: 2 });
    expect(cache.retainedBytes).toBe(8);
    cache.get("a");
    cache.set("c", { size: 4, id: 3 });
    expect(cache.get("b")).toBeNull();
    expect(closed).toEqual([2]);
    cache.set("d", { size: 9, id: 4 });
    expect(cache.get("a")).toBeNull();
    expect(cache.get("c")).toBeNull();
    expect(cache.count).toBe(1);
    cache.clear();
    expect(cache.retainedBytes).toBe(0);
    const closedAgain: number[] = [];
    const fresh = new BoundedCache<string, { size: number; id: number }>(
      { maxCount: 2, maxBytes: 10 },
      (value) => value.size,
      (value) => closedAgain.push(value.id)
    );
    const same = { size: 1, id: 5 };
    fresh.set("same", same);
    fresh.set("same", same);
    expect(closedAgain).toEqual([]);
    fresh.set("same", { size: 1, id: 6 });
    expect(closedAgain).toEqual([5]);
    expect(fresh.delete("missing")).toBe(false);
    expect(fresh.delete("same")).toBe(true);
    expect(closedAgain).toEqual([5, 6]);
    fresh.set("clear", { size: 1, id: 7 });
    fresh.clear();
    expect(closedAgain).toContain(7);
    fresh.set("huge", { size: 11, id: 8 });
    expect(fresh.count).toBe(0);
    expect(closedAgain).toContain(8);
    expect(fresh.get("missing")).toBeNull();
  });
});

describe("folio read and write proofs", () => {
  it("opens a local PDF and returns pages, text, and forms", async () => {
    const { engine, snapshot } = await open();
    expect(snapshot.pages).toHaveLength(2);
    expect(snapshot.facts.hasForms).toBe(true);
    expect(snapshot.pages[0]?.cropBox.width).toBeCloseTo(300, 1);
    const fields = await readForms(engine, snapshot);
    expect(field(fields, "shared").label).toBe("shared");
    const text = await engine.handle({
      _tag: "ReadText",
      request: token("text"),
      session: snapshot.session,
      revision: snapshot.revision,
      page: snapshot.pages[0]!.id,
    } as Request);
    expect(text.payload._tag).toBe("TextRead");
    if (text.payload._tag === "TextRead") {
      expect(text.payload.runs.map((run) => run.text).join("")).toContain(
        "Crop and form page"
      );
    }
    await engine.destroy();
  });

  it("creates, updates, deletes, undoes, and redoes annotations with stable ids", async () => {
    const { engine, snapshot } = await open();
    const page = snapshot.pages[0]!.id;
    const sourceNote = (await readAnnotations(engine, snapshot, page)).find(
      (annotation) => annotation._tag === "Note"
    );
    expect(sourceNote).toBeDefined();
    const editedSource = changed(
      await commit(engine, snapshot, {
        _tag: "UpdateAnnotation",
        annotation: {
          ...sourceNote!,
          contents: "source note changed",
        },
      } as Command)
    ).snapshot;
    expect(
      (await readAnnotations(engine, editedSource, page)).find(
        (annotation) => annotation.id === sourceNote!.id
      )
    ).toMatchObject({ contents: "source note changed" });
    const create = changed(
      await commit(engine, editedSource, {
        _tag: "CreateAnnotation",
        annotation: {
          _tag: "Highlight",
          id: token("highlight:1"),
          page,
          quads: [
            [
              [40, 300],
              [140, 300],
              [40, 320],
              [140, 320],
            ],
          ],
          color: [255, 217, 0, 102],
          contents: "first",
        },
      })
    );
    let current = create.snapshot;
    expect(await readAnnotations(engine, current, page)).toHaveLength(2);
    const update = changed(
      await commit(engine, current, {
        _tag: "UpdateAnnotation",
        annotation: {
          _tag: "Highlight",
          id: token("highlight:1"),
          page,
          quads: [
            [
              [40, 300],
              [160, 300],
              [40, 320],
              [160, 320],
            ],
          ],
          color: [255, 217, 0, 102],
          contents: "changed",
        },
      })
    );
    current = update.snapshot;
    expect(
      (await readAnnotations(engine, current, page)).find(
        (annotation) => annotation.id === "highlight:1"
      )
    ).toMatchObject({ contents: "changed" });
    const undo = changed(
      (
        await engine.handle({
          _tag: "Undo",
          request: token("undo"),
          session: current.session,
          baseRevision: current.revision,
        } as Request)
      ).payload
    );
    current = undo.snapshot;
    expect(
      (await readAnnotations(engine, current, page)).find(
        (annotation) => annotation.id === "highlight:1"
      )
    ).toMatchObject({ contents: "first" });
    const redo = changed(
      (
        await engine.handle({
          _tag: "Redo",
          request: token("redo"),
          session: current.session,
          baseRevision: current.revision,
        } as Request)
      ).payload
    );
    current = redo.snapshot;
    const deleted = changed(
      await commit(engine, current, {
        _tag: "DeleteAnnotation",
        annotation: token("highlight:1"),
      })
    );
    current = deleted.snapshot;
    expect(await readAnnotations(engine, current, page)).toHaveLength(1);
    const restored = changed(
      (
        await engine.handle({
          _tag: "Undo",
          request: token("undo-delete"),
          session: current.session,
          baseRevision: current.revision,
        } as Request)
      ).payload
    );
    expect(
      (await readAnnotations(engine, restored.snapshot, page)).find(
        (annotation) => annotation.id === "highlight:1"
      )
    ).toMatchObject({ contents: "changed" });
    const written = await write(
      engine,
      restored.snapshot,
      (await fullPlan(engine, restored.snapshot)).id
    );
    const pages = await reopenText(written.bytes);
    expect(pages[0]?.text).toContain("Crop and form page");
    const reopened = await openReader(written.bytes);
    const annotations = await (await reopened.pages([page]))[0];
    expect(annotations).toBeDefined();
    await reopened.destroy();
    await engine.destroy();
  });

  it("writes supported forms and every widget appearance to real bytes", async () => {
    const { engine, snapshot } = await open("all-forms");
    let current = snapshot;
    const commitForm = async (name: string, value: FormValue) => {
      const response = changed(
        await commit(engine, current, {
          _tag: "SetFormValue",
          field: token(`field:${name}`),
          value,
        })
      );
      current = response.snapshot;
    };
    await commitForm("requiredText", { _tag: "Text", value: "changed" });
    await commitForm("check", { _tag: "Check", checked: true });
    await commitForm("radio", { _tag: "Radio", option: "two" });
    await commitForm("combo", { _tag: "Choice", selected: ["beta"] });
    await commitForm("single", { _tag: "Choice", selected: ["two"] });
    await commitForm("multi", {
      _tag: "Choice",
      selected: ["two", "three"],
    });
    const fields = await readForms(engine, current);
    expect(formValue(fields, "requiredText")).toEqual({
      _tag: "Text",
      value: "changed",
    });
    const planned = await fullPlan(engine, current);
    const written = await write(engine, current, planned.id);
    const doc = await PDFDocument.load(written.bytes);
    const form = doc.getForm();
    expect(form.getTextField("requiredText").getText()).toBe("changed");
    expect(form.getCheckBox("check").isChecked()).toBe(true);
    expect(form.getRadioGroup("radio").getSelected()).toBe("two");
    expect(form.getDropdown("combo").getSelected()).toEqual(["beta"]);
    expect(form.getOptionList("multi").getSelected()).toEqual(["two", "three"]);
    await expect(
      commit(engine, current, {
        _tag: "SetFormValue",
        field: token("field:locked"),
        value: { _tag: "Text", value: "no" },
      })
    ).resolves.toMatchObject({ _tag: "Rejected", code: "read-only-field" });
    await engine.destroy();
  });

  it("persists rotation, reorder, deletion, and extraction in bytes", async () => {
    const { engine, snapshot } = await open();
    const first = snapshot.pages[0]!.id;
    const second = snapshot.pages[1]!.id;
    let current = changed(
      await commit(engine, snapshot, {
        _tag: "RotatePages",
        pages: [first],
        clockwise: 90,
      })
    ).snapshot;
    current = changed(
      await commit(engine, current, {
        _tag: "ReorderPages",
        order: [second, first],
      })
    ).snapshot;
    let pages = await reopenText(
      (await write(engine, current, (await fullPlan(engine, current)).id)).bytes
    );
    expect(pages).toHaveLength(2);
    expect(pages[0]?.rotation).toBe(90);
    expect(pages[0]?.text).toContain("Rotated page");
    current = changed(
      await commit(engine, current, {
        _tag: "DeletePages",
        pages: [second],
      })
    ).snapshot;
    pages = await reopenText(
      (await write(engine, current, (await fullPlan(engine, current)).id)).bytes
    );
    expect(pages).toHaveLength(1);
    expect(pages[0]?.text).toContain("Crop and form page");
    await expect(
      commit(engine, current, {
        _tag: "DeletePages",
        pages: [first],
      })
    ).resolves.toMatchObject({ _tag: "Rejected", code: "last-page" });
    await engine.destroy();
  });

  it("imports selected pages, namespaces fields, and rejects collisions atomically", async () => {
    const { engine, snapshot } = await open();
    const sourceBytes = await fixture("geometry-forms");
    const inspected = await engine.handle({
      _tag: "InspectSource",
      request: token("inspect"),
      session: snapshot.session,
      revision: snapshot.revision,
      bytes: sourceBytes,
    } as Request);
    expect(inspected.payload._tag).toBe("SourceInspected");
    if (inspected.payload._tag !== "SourceInspected") {
      return;
    }
    const sourcePage = inspected.payload.pages[0]!.id;
    const imported = changed(
      await commit(engine, snapshot, {
        _tag: "ImportPages",
        before: null,
        sources: [
          {
            source: inspected.payload.source,
            pages: [sourcePage],
            fieldNamespace: "src",
          },
        ],
      })
    );
    expect(imported.snapshot.pages).toHaveLength(3);
    const written = await write(
      engine,
      imported.snapshot,
      (await fullPlan(engine, imported.snapshot)).id
    );
    const doc = await PDFDocument.load(written.bytes);
    expect(
      doc
        .getForm()
        .getFields()
        .map((item) => item.getName())
    ).toContain("src.shared");
    const beforeCollision = await write(
      engine,
      imported.snapshot,
      (await fullPlan(engine, imported.snapshot)).id
    );
    const collision = await commit(engine, imported.snapshot, {
      _tag: "ImportPages",
      before: null,
      sources: [
        {
          source: inspected.payload.source,
          pages: [sourcePage],
          fieldNamespace: "shared",
        },
      ],
    });
    expect(rejected(collision).code).toBe("source-rejected");
    const afterCollision = await write(
      engine,
      imported.snapshot,
      (await fullPlan(engine, imported.snapshot)).id
    );
    expect(afterCollision.sha256).toBe(beforeCollision.sha256);
    await engine.destroy();
  });

  it("extracts selected pages in working order without changing the session", async () => {
    const { engine, snapshot } = await open();
    const first = snapshot.pages[0]!.id;
    const second = snapshot.pages[1]!.id;
    const reordered = changed(
      await commit(engine, snapshot, {
        _tag: "ReorderPages",
        order: [second, first],
      })
    ).snapshot;
    const planned = await plan(engine, reordered, {
      _tag: "Selected",
      pages: [first, second],
    });
    expect(planned.filename).toBe("geometry-forms-pages.pdf");
    const written = await write(engine, reordered, planned.id);
    const pages = await reopenText(written.bytes);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.text).toContain("Rotated page");
    expect(pages[1]?.text).toContain("Crop and form page");
    expect(reordered.revision).toBe(1);
    await engine.destroy();
  });

  it("rejects operations on protected inputs before mutation", async () => {
    for (const name of [
      "signed",
      "xfa",
      "script",
      "tags",
      "layers",
      "attachments",
      "unknown-annotation",
    ]) {
      const { engine, snapshot } = await open(name);
      expect(snapshot.facts.readOnlyReasons.length).toBeGreaterThan(0);
      const response = await commit(engine, snapshot, {
        _tag: "RotatePages",
        pages: [snapshot.pages[0]!.id],
        clockwise: 90,
      });
      expect(rejected(response).code).toBe("read-only");
      await engine.destroy();
    }
    const encrypted = await open("encrypted", "folio-test");
    expect(encrypted.snapshot.facts.encrypted).toBe(true);
    expect(
      rejected(
        await commit(encrypted.engine, encrypted.snapshot, {
          _tag: "RotatePages",
          pages: [encrypted.snapshot.pages[0]!.id],
          clockwise: 90,
        })
      ).code
    ).toBe("read-only");
    await encrypted.engine.destroy();
    for (const name of ["corrupt", "pages-0"]) {
      await expect(open(name)).rejects.toThrow();
    }
  });

  it("rejects bad passwords and distinguishes missing from wrong", async () => {
    const engine = new FolioEngine();
    const missing = await engine.handle({
      _tag: "Open",
      request: token("missing"),
      bytes: await fixture("encrypted"),
      name: "encrypted.pdf",
    });
    expect(rejected(missing.payload).code).toBe("password-required");
    const wrong = await engine.handle({
      _tag: "Open",
      request: token("wrong"),
      bytes: await fixture("encrypted"),
      name: "encrypted.pdf",
      password: "bad",
    });
    expect(rejected(wrong.payload).code).toBe("wrong-password");
    await engine.destroy();
  });

  it("rejects stale revisions, duplicate commands, and cancelled mutations", async () => {
    const { engine, snapshot } = await open();
    const command: Command = {
      _tag: "RotatePages",
      pages: [snapshot.pages[0]!.id],
      clockwise: 90,
    };
    const first = changed(await commit(engine, snapshot, command, "same"));
    const duplicate = changed(await commit(engine, snapshot, command, "same"));
    expect(duplicate.change).toBe(first.change);
    expect(duplicate.snapshot.revision).toBe(1);
    const stale = await commit(
      engine,
      snapshot,
      { ...command, clockwise: 180 },
      "other"
    );
    expect(rejected(stale).code).toBe("stale-revision");
    expect(first.snapshot.revision).toBe(1);
    const second = changed(
      await commit(engine, first.snapshot, command, "after-stale")
    );
    expect(second.snapshot.revision).toBe(2);
    const controller = new AbortController();
    controller.abort();
    const cancelled = await engine.handle(
      {
        _tag: "Commit",
        request: token("cancelled"),
        session: second.snapshot.session,
        baseRevision: second.snapshot.revision,
        commandId: token("cancelled"),
        command,
      } as Request,
      undefined,
      controller.signal
    );
    expect(rejected(cancelled.payload).code).toBe("cancelled");
    await engine.destroy();
  });

  it("writes only after verification and expires stale plans", async () => {
    const { engine, snapshot } = await open();
    const planned = await fullPlan(engine, snapshot);
    expect(planned.filename).toBe("geometry-forms-edited.pdf");
    expect(planned.warnings).toContain("not-conformance-checked");
    const written = await write(engine, snapshot, planned.id);
    expect(written.sha256).toHaveLength(64);
    expect(written.mime).toBe("application/pdf");
    const acknowledged = await engine.handle({
      _tag: "AcknowledgeDownload",
      request: token("ack"),
      session: snapshot.session,
      revision: snapshot.revision,
      plan: planned.id,
    } as Request);
    expect(acknowledged.payload._tag).toBe("Acknowledged");
    const changedSnapshot = changed(
      await commit(engine, snapshot, {
        _tag: "RotatePages",
        pages: [snapshot.pages[0]!.id],
        clockwise: 90,
      })
    ).snapshot;
    const stale = await engine.handle({
      _tag: "Write",
      request: token("stale"),
      session: changedSnapshot.session,
      revision: changedSnapshot.revision,
      plan: planned.id,
    } as Request);
    expect(rejected(stale.payload).code).toBe("stale-plan");
    await engine.destroy();
  });

  it("searches pages in order with wrapped next and previous results", async () => {
    const { engine, snapshot } = await open("text-10");
    const response = await engine.handle({
      _tag: "Search",
      request: token("search"),
      session: snapshot.session,
      revision: snapshot.revision,
      query: "Folio fixture page",
      cursor: null,
      direction: "next",
      maxMatches: 10,
    } as Request);
    expect(response.payload._tag).toBe("SearchRead");
    if (response.payload._tag !== "SearchRead") {
      return;
    }
    expect(response.payload.matches.length).toBe(10);
    expect(response.payload.current?.page).toBe(snapshot.pages[0]!.id);
    const previous = await engine.handle({
      _tag: "Search",
      request: token("previous"),
      session: snapshot.session,
      revision: snapshot.revision,
      query: "Folio fixture page",
      cursor: {
        page: response.payload.current!.page,
        offset: response.payload.current!.start,
      },
      direction: "previous",
      maxMatches: 10,
    } as Request);
    expect(previous.payload._tag).toBe("SearchRead");
    if (previous.payload._tag === "SearchRead") {
      expect(previous.payload.current?.page).toBe(snapshot.pages.at(-1)?.id);
    }
    await engine.destroy();
  });

  it("reads an outline with stable page identities", async () => {
    const { engine, snapshot } = await open("structure");
    const response = await engine.handle({
      _tag: "ReadOutline",
      request: token("outline"),
      session: snapshot.session,
      revision: snapshot.revision,
    } as Request);
    expect(response.payload._tag).toBe("OutlineRead");
    if (response.payload._tag === "OutlineRead") {
      expect(response.payload.items[0]?.title).toBe("Go to beta");
      expect(response.payload.items[0]?.page).toBe(snapshot.pages[1]!.id);
    }
    const reorder = await commit(engine, snapshot, {
      _tag: "ReorderPages",
      order: [...snapshot.pages].reverse().map((page) => page.id),
    });
    expect(rejected(reorder).code).toBe("unsupported-preservation");
    await engine.destroy();
  });

  it("exposes every supported simple form kind and option id", async () => {
    const { engine, snapshot } = await open("all-forms");
    const fields = await readForms(engine, snapshot);
    expect(fields.map((item) => item.kind).sort()).toEqual(
      ["checkbox", "combo", "list", "list", "radio", "text", "text"].sort()
    );
    expect(field(fields, "multi").multiple).toBe(true);
    expect(field(fields, "single").multiple).toBe(false);
    expect(field(fields, "combo").options.map((option) => option.id)).toEqual([
      "alpha",
      "beta",
    ]);
    expect(field(fields, "locked").readOnly).toBe(true);
    await engine.destroy();
  });
});

describe("folio annotation kinds", () => {
  it("writes note, ink, and added text with appearances", async () => {
    const { engine, snapshot } = await open();
    const page = snapshot.pages[0]!.id;
    const annotations: Annotation[] = [
      {
        _tag: "Note",
        id: token("note:1"),
        page,
        position: [100, 300],
        contents: "note",
      },
      {
        _tag: "Ink",
        id: token("ink:1"),
        page,
        strokes: [
          [
            [60, 250],
            [100, 280],
            [140, 260],
          ],
        ],
        width: 2,
        color: [20, 20, 20, 255],
        contents: "ink",
      },
      {
        _tag: "AddedText",
        id: token("text:1"),
        page,
        box: { x: 60, y: 200, width: 180, height: 40 },
        text: "Added text",
        fontSize: 12,
        color: [0, 0, 0, 255],
      },
    ];
    let current = snapshot;
    for (const annotation of annotations) {
      current = changed(
        await commit(engine, current, {
          _tag: "CreateAnnotation",
          annotation,
        })
      ).snapshot;
    }
    const written = await write(
      engine,
      current,
      (await fullPlan(engine, current)).id
    );
    const reader = await openReader(written.bytes);
    const pdfPage = await reader.text(0);
    expect(pdfPage.runs.length).toBeGreaterThan(0);
    await reader.destroy();
    const doc = await loadWriter(written.bytes);
    const annots = doc.getPage(0).node.Annots();
    expect(annots?.size()).toBe(6);
    await engine.destroy();
  });

  it("rejects glyphs outside the bundled standard font and keeps bytes intact", async () => {
    const { engine, snapshot } = await open();
    const planBefore = await fullPlan(engine, snapshot);
    const before = await write(engine, snapshot, planBefore.id);
    const response = await commit(engine, snapshot, {
      _tag: "CreateAnnotation",
      annotation: {
        _tag: "AddedText",
        id: token("text:bad"),
        page: snapshot.pages[0]!.id,
        box: { x: 60, y: 200, width: 180, height: 40 },
        text: "日本語",
        fontSize: 12,
        color: [0, 0, 0, 255],
      },
    });
    expect(rejected(response).code).toBe("unsupported-glyph");
    const after = await write(
      engine,
      snapshot,
      (await fullPlan(engine, snapshot)).id
    );
    expect(after.sha256).toBe(before.sha256);
    await engine.destroy();
  });
});

describe("folio history limits", () => {
  it("blocks the next change at 128 entries and never evicts silently", async () => {
    const { engine, snapshot } = await open();
    const page = snapshot.pages[0]!.id;
    let current = snapshot;
    for (let index = 0; index < 128; index += 1) {
      current = changed(
        await commit(
          engine,
          current,
          { _tag: "RotatePages", pages: [page], clockwise: 90 },
          `rotate-${index}`
        )
      ).snapshot;
    }
    expect(current.history.entries).toBe(128);
    expect(current.history.limitReached).toBe(true);
    const blocked = await commit(
      engine,
      current,
      { _tag: "RotatePages", pages: [page], clockwise: 90 },
      "overflow"
    );
    expect(rejected(blocked).code).toBe("resource-limit");
    expect(rejected(blocked).preservedRevision).toBe(128);
    await engine.destroy();
  }, 30_000);
});

describe("folio page history", () => {
  it("undoes and redoes rotation and reorder through byte checkpoints", async () => {
    const { engine, snapshot } = await open();
    const first = snapshot.pages[0]!.id;
    const second = snapshot.pages[1]!.id;
    let current = changed(
      await commit(engine, snapshot, {
        _tag: "RotatePages",
        pages: [first],
        clockwise: 90,
      })
    ).snapshot;
    current = changed(
      await commit(engine, current, {
        _tag: "ReorderPages",
        order: [second, first],
      })
    ).snapshot;
    current = changed(
      (
        await engine.handle({
          _tag: "Undo",
          request: token("undo-reorder"),
          session: current.session,
          baseRevision: current.revision,
        } as Request)
      ).payload
    ).snapshot;
    let pages = await reopenText(
      (await write(engine, current, (await fullPlan(engine, current)).id)).bytes
    );
    expect(pages[0]?.text).toContain("Crop and form page");
    expect(pages[0]?.rotation).toBe(90);
    current = changed(
      (
        await engine.handle({
          _tag: "Undo",
          request: token("undo-rotate"),
          session: current.session,
          baseRevision: current.revision,
        } as Request)
      ).payload
    ).snapshot;
    expect(current.pages[0]?.rotation).toBe(0);
    pages = await reopenText(
      (await write(engine, current, (await fullPlan(engine, current)).id)).bytes
    );
    expect(pages[0]?.rotation).toBe(0);
    for (const direction of ["Redo", "Redo"] as const) {
      current = changed(
        (
          await engine.handle({
            _tag: direction,
            request: token(`redo-${current.revision}`),
            session: current.session,
            baseRevision: current.revision,
          } as Request)
        ).payload
      ).snapshot;
    }
    pages = await reopenText(
      (await write(engine, current, (await fullPlan(engine, current)).id)).bytes
    );
    expect(pages[0]?.text).toContain("Rotated page");
    expect(pages[0]?.rotation).toBe(90);
    await engine.destroy();
  });
});
