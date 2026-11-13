import { useId } from "react";
import {
  HiArrowUturnLeft,
  HiArrowUturnRight,
  HiOutlineMinusCircle,
  HiOutlinePlusCircle,
  HiPhoto,
  HiPlus,
} from "react-icons/hi2";

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

const EASEL_PANELS = [
  "easelPanelCrop",
  "easelPanelFinetune",
  "easelPanelFilter",
  "easelPanelAnnotate",
  "easelPanelRedact",
] as const;

const EASEL_TABS = ["skyline.jpg", "street.png"] as const;

/** The Mosaic cells over the billboard, in reading order, 7 by 3. */
const EASEL_MOSAIC = [
  "#E6E2D8",
  "#ADA89D",
  "#CFCAC0",
  "#75716A",
  "#E6E2D8",
  "#8C877D",
  "#CFCAC0",
  "#8C877D",
  "#57534B",
  "#E6E2D8",
  "#ADA89D",
  "#57534B",
  "#CFCAC0",
  "#75716A",
  "#CFCAC0",
  "#ADA89D",
  "#8C877D",
  "#E6E2D8",
  "#CFCAC0",
  "#ADA89D",
  "#E6E2D8",
] as const;

const EaselPreviewTabs = () => (
  <span className="home-easel-tabs">
    {EASEL_TABS.map((name, index) => (
      <span
        className="home-easel-tab"
        data-active={index === 0 || undefined}
        key={name}
      >
        <HiPhoto />
        {index === 0 ? <span className="home-easel-tab-dirty" /> : null}
        <span className="home-editor-filename">{name}</span>
      </span>
    ))}
    <HiPlus className="home-easel-tab-add" />
  </span>
);

/** One image with a crop box, a Mosaic Redaction, an Arrow, and a Watermark. */
const EaselPreviewPhoto = () => {
  const id = useId();
  const dots = `${id}-dots`;
  const head = `${id}-head`;

  return (
    <svg className="home-easel-photo" viewBox="0 0 320 200">
      <defs>
        <pattern height="6" id={dots} patternUnits="userSpaceOnUse" width="6">
          <circle cx="3" cy="3" r="1.1" />
        </pattern>
        <marker
          id={head}
          markerHeight="4"
          markerWidth="4"
          orient="auto"
          refX="5"
          refY="5"
          viewBox="0 0 10 10"
        >
          <path d="M0 0 10 5 0 10z" />
        </marker>
      </defs>
      <rect className="home-easel-sky" height="200" width="320" />
      <rect
        className="home-easel-dots"
        fill={`url(#${dots})`}
        height="150"
        width="320"
      />
      <circle className="home-easel-paper" cx="200" cy="66" r="30" />
      <path
        className="home-easel-ink"
        d="M0 200V112H34V92H62V120H80V76H112V104H128V60H150V50H162V60H176V96H204V118H232V84H262V110H286V70H320V200Z"
      />
      <g className="home-easel-paper">
        <rect height="6" width="6" x="98" y="84" />
        <rect height="6" width="6" x="98" y="96" />
        <rect height="6" width="5" x="134" y="70" />
        <rect height="6" width="5" x="134" y="84" />
        <rect height="6" width="6" x="292" y="80" />
        <rect height="6" width="6" x="304" y="92" />
      </g>
      <path className="home-easel-post" d="M32 84V92M64 84V92" />
      <g>
        {EASEL_MOSAIC.map((fill, index) => (
          <rect
            fill={fill}
            height="9"
            key={`${index.toString()}-${fill}`}
            width="8"
            x={20 + (index % 7) * 8}
            y={57 + Math.floor(index / 7) * 9}
          />
        ))}
      </g>
      <path className="home-easel-lane" d="M0 190H320" />
      <path
        className="home-easel-arrow"
        d="M140 150 86 92"
        markerEnd={`url(#${head})`}
      />
      <text className="home-easel-watermark" x="250" y="172">
        ri<tspan>/</tspan>tools
      </text>
      <path
        className="home-easel-crop-shade"
        d="M0 0H320V200H0ZM16 20V180H256V20Z"
        fillRule="evenodd"
      />
      <path
        className="home-easel-crop-thirds"
        d="M96 20V180M176 20V180M16 73.3H256M16 126.7H256"
      />
      <rect
        className="home-easel-crop-box"
        height="160"
        width="240"
        x="16"
        y="20"
      />
      <path
        className="home-easel-crop-handle"
        d="M16 34V20H30M242 20H256V34M256 166V180H242M30 180H16V166"
      />
    </svg>
  );
};

/** A small print of the editor: the panel row, then the image on its stage. */
const EaselPreview = () => {
  const { t } = useTranslation();

  return (
    <div className="home-easel">
      <div className="home-easel-bar">
        <span className="home-easel-panels">
          {EASEL_PANELS.map((key, index) => (
            <span data-chosen={index === 0 || undefined} key={key}>
              {t(key)}
            </span>
          ))}
        </span>
        <span className="home-easel-history">
          <HiArrowUturnLeft />
          <HiArrowUturnRight />
        </span>
      </div>
      <div className="home-easel-stage">
        <EaselPreviewPhoto />
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
        {name === "Easel" ? (
          <EaselPreviewTabs />
        ) : (
          <span className="home-editor-filename">{`example.${extension}`}</span>
        )}
        <span>{t("homeEditorExample")}</span>
      </div>
      <div className="home-editor-canvas">
        {name === "Easel" ? (
          <EaselPreview />
        ) : name === "Tabular" ? (
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
