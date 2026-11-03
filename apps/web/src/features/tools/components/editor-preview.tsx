import { useTranslation } from "@/features/i18n/use-translation";

const SAMPLE_ROWS = [
  ["120", "80", "200"],
  ["240", "160", "400"],
  ["360", "240", "600"],
  ["480", "320", "800"],
] as const;

/** Decorative examples show each document type without loading an editor. */
export const EditorPreview = ({ name }: { readonly name: string }) => {
  const { t } = useTranslation();
  const extension =
    name === "Tabular" ? "csv" : name === "Folio" ? "pdf" : "md";

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
