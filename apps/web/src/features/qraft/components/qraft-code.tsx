"use client";

/* oxlint-disable anti-slop/require-safety-comment-for-type-assertion -- The Select returns a string from an option list this file built. */

import {
  CODE_FAMILIES,
  FAMILY_LABEL_KEY,
  symbologiesOf,
  symbologyOf,
} from "../qraft";
import type { CodeFamily, SymbologyId } from "../qraft";
import type { QraftController } from "../use-qraft";
import { QraftSelect } from "./qraft-fields";

/** The Code Family and the Symbology inside it. */
export const QraftCode = ({
  controller,
}: {
  readonly controller: QraftController;
}) => {
  const c = controller;
  const familyOptions = CODE_FAMILIES.map((family) => ({
    id: family,
    label: c.t(FAMILY_LABEL_KEY[family]),
  }));
  const symbologyOptions = symbologiesOf(c.family).map((id) => ({
    id,
    label: c.t(symbologyOf(id).labelTranslation),
  }));
  return (
    <section aria-labelledby="qraft-code-heading" className="min-w-0">
      <h2
        className="border-rule font-display border-b-2 pb-2 text-lg font-black uppercase [font-stretch:75%]"
        id="qraft-code-heading"
      >
        {c.t("qraftCodeHeading")}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <QraftSelect
          id="qraft-family"
          label={c.t("qraftFamily")}
          options={familyOptions}
          value={c.family}
          onChange={(next) => c.chooseFamily(next as CodeFamily)}
        />
        <QraftSelect
          id="qraft-symbology"
          label={c.t("qraftSymbology")}
          options={symbologyOptions}
          value={c.settings.symbology}
          onChange={(next) => c.chooseSymbology(next as SymbologyId)}
        />
      </div>
      <p className="text-muted-fg mt-3 text-sm/6">
        {c.t(c.spec.hintTranslation)}
      </p>
    </section>
  );
};
