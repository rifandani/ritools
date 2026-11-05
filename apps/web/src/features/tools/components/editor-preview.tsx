import { HiOutlineMinusCircle, HiOutlinePlusCircle } from "react-icons/hi2";

import { useTranslation } from "@/features/i18n/use-translation";

const SAMPLE_ROWS = [
  ["120", "80", "200"],
  ["240", "160", "400"],
  ["360", "240", "600"],
  ["480", "320", "800"],
] as const;

interface CleaveLine {
  readonly number: number;
  readonly text: string;
  readonly change?: "removed" | "added";
  /** The changed word at the end of the line. */
  readonly word?: string;
}

type CleaveRow = readonly [before: CleaveLine | null, after: CleaveLine];

/** The two Removals and three Additions in the preview head count these rows. */
const CLEAVE_CHANGE: readonly CleaveRow[] = [
  [
    { number: 1, text: "name = notes" },
    { number: 1, text: "name = notes" },
  ],
  [
    { number: 2, text: "version = ", word: "1", change: "removed" },
    { number: 2, text: "version = ", word: "2", change: "added" },
  ],
  [
    { number: 3, text: "cache = ", word: "off", change: "removed" },
    { number: 3, text: "cache = ", word: "on", change: "added" },
  ],
  [null, { number: 4, text: "offline = on", change: "added" }],
];

const CLEAVE_CLOSE: CleaveRow = [
  { number: 4, text: "upload = no" },
  { number: 5, text: "upload = no" },
];

const CLEAVE_MARKS = { removed: "−", added: "+" } as const;

const CleavePreviewLine = ({ line }: { readonly line: CleaveLine | null }) => {
  if (!line) {
    return <div className="home-cleave-line" data-change="empty" />;
  }
  return (
    <div className="home-cleave-line" data-change={line.change}>
      <span className="home-cleave-number">{line.number}</span>
      <span className="home-cleave-mark">
        {line.change ? CLEAVE_MARKS[line.change] : null}
      </span>
      <span className="home-cleave-text">
        {line.text}
        {line.word ? <mark>{line.word}</mark> : null}
      </span>
    </div>
  );
};

const CleavePreviewRow = ({ row }: { readonly row: CleaveRow }) => (
  <div className="home-cleave-row">
    <CleavePreviewLine line={row[0]} />
    <CleavePreviewLine line={row[1]} />
  </div>
);

/** A small print of the Split layout with one Change open in Resolve. */
const CleavePreview = () => {
  const { t } = useTranslation();

  return (
    <div className="home-cleave">
      <div className="home-cleave-row home-cleave-head">
        <div>
          <strong>{t("cleaveBefore")}</strong>
          <span data-change="removed">
            <HiOutlineMinusCircle />
            {t("cleaveRemovals", { count: 2 })}
          </span>
        </div>
        <div>
          <strong>{t("cleaveAfter")}</strong>
          <span data-change="added">
            <HiOutlinePlusCircle />
            {t("cleaveAdditions", { count: 3 })}
          </span>
        </div>
      </div>
      <div className="home-cleave-lines">
        {CLEAVE_CHANGE.map((row) => (
          <CleavePreviewRow key={row[1].number} row={row} />
        ))}
        <div className="home-cleave-resolve">
          <strong>{t("cleaveResolve")}</strong>
          <span>{t("cleaveAcceptBefore")}</span>
          <span data-chosen>{t("cleaveAcceptAfter")}</span>
          <span>{t("cleaveAcceptBoth")}</span>
        </div>
        <CleavePreviewRow row={CLEAVE_CLOSE} />
      </div>
    </div>
  );
};

/** Decorative examples show each document type without loading an editor. */
export const EditorPreview = ({ name }: { readonly name: string }) => {
  const { t } = useTranslation();
  const extension =
    name === "Tabular"
      ? "csv"
      : name === "Folio"
        ? "pdf"
        : name === "Cleave"
          ? "txt"
          : "md";

  return (
    <div aria-hidden="true" className="home-editor-preview ground-ink">
      <div className="home-editor-file">
        <span className="home-editor-filename">{`example.${extension}`}</span>
        <span>{t("homeEditorExample")}</span>
      </div>
      <div className="home-editor-canvas">
        {name === "Tabular" ? (
          <div className="home-editor-sheet">
            <div className="home-editor-value">
              <span>C2</span>
              <span>400</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>A</th>
                  <th>B</th>
                  <th>C</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map((row, index) => (
                  <tr key={row[0]}>
                    <th>{index + 1}</th>
                    {row.map((value, column) => (
                      <td
                        className={
                          index === 1 && column === 2
                            ? "home-editor-cell-selected"
                            : undefined
                        }
                        key={value}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : name === "Folio" ? (
          <div className="home-editor-pdf">
            <div className="home-editor-pdf-page">
              <span className="home-editor-doc-format">PDF</span>
              <strong>{t("homeTitle")}</strong>
              <p>{t("homeLocalClaim")}</p>
              <span className="home-editor-highlight">
                {t("homeLocalLimit")}
              </span>
              <div className="home-editor-document-lines">
                <span />
                <span />
                <span />
              </div>
              <span className="home-editor-page-number">1</span>
            </div>
          </div>
        ) : name === "Cleave" ? (
          <CleavePreview />
        ) : (
          <div className="home-editor-markdown">
            <div className="home-editor-markdown-title">
              <span>#</span> {t("homeTitle")}
            </div>
            <p>
              <span>**</span>
              {t("homeLocalClaim")}
              <span>**</span>
            </p>
            <p>{t("homeLocalLimit")}</p>
            <div className="home-editor-markdown-rule">---</div>
            <div className="home-editor-markdown-code">
              <span>```</span>
              <br />
              notes.md
              <br />
              <span>```</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
