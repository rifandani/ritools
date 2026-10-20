import { Badge } from "@/core/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table";

import { Variant, VariantGrid } from "../variant";

interface BatchRow {
  id: string;
  name: string;
  format: string;
  before: string;
  after: string | null;
  status: "Hit" | "Miss";
}

const batch: BatchRow[] = [
  {
    id: "1",
    name: "IMG_4021.jpg",
    format: "JPEG",
    before: "3.2 MB",
    after: "198 KB",
    status: "Hit",
  },
  {
    id: "2",
    name: "receipt-scan.png",
    format: "PNG",
    before: "1.8 MB",
    after: "187 KB",
    status: "Hit",
  },
  {
    id: "3",
    name: "hero-banner.webp",
    format: "WebP",
    before: "940 KB",
    after: "196 KB",
    status: "Hit",
  },
  {
    id: "4",
    name: "screenshot-0912.png",
    format: "PNG",
    before: "6.1 MB",
    after: null,
    status: "Miss",
  },
];

const noRows: BatchRow[] = [];

/** A figure takes the one numerals face; the unit stays in Archivo. */
const Size = ({ value }: { value: string | null }) => {
  if (!value) {
    return <span className="text-muted-fg">—</span>;
  }
  const [amount, unit] = value.split(" ");
  return (
    <>
      <span className="num">{amount}</span> {unit}
    </>
  );
};

const BatchTable = ({
  className,
  isNarrow = false,
  isSelected = false,
  isStriped = false,
  isGrid = false,
}: {
  className?: string;
  isNarrow?: boolean;
  isSelected?: boolean;
  isStriped?: boolean;
  isGrid?: boolean;
}) => (
  <Table
    aria-label="Squeeze Batch"
    className={className}
    grid={isGrid}
    selectionMode={isSelected ? "multiple" : undefined}
    defaultSelectedKeys={isSelected ? ["2"] : undefined}
    striped={isStriped}
  >
    <TableHeader>
      <TableColumn isRowHeader>File</TableColumn>
      {isNarrow ? null : <TableColumn>Format</TableColumn>}
      {isNarrow ? null : <TableColumn className="text-end">Before</TableColumn>}
      <TableColumn className="text-end">After</TableColumn>
      <TableColumn>Status</TableColumn>
    </TableHeader>
    <TableBody items={batch}>
      {(file) => (
        <TableRow id={file.id}>
          <TableCell className="font-medium">{file.name}</TableCell>
          {isNarrow ? null : <TableCell>{file.format}</TableCell>}
          {isNarrow ? null : (
            <TableCell className="text-end whitespace-nowrap">
              <Size value={file.before} />
            </TableCell>
          )}
          <TableCell className="text-end whitespace-nowrap">
            <Size value={file.after} />
          </TableCell>
          <TableCell>
            <Badge intent={file.status === "Hit" ? "success" : "danger"}>
              {file.status}
            </Badge>
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  </Table>
);

export const TableShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-full" label="Batch">
        <BatchTable className="w-full" />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="narrow, two columns of fact">
        <BatchTable className="w-full" isNarrow />
      </Variant>
      <Variant className="w-72" label="striped">
        <BatchTable className="w-full" isNarrow isStriped />
      </Variant>
      <Variant className="w-72" label="grid, column rules">
        <BatchTable className="w-full" isNarrow isGrid />
      </Variant>
      <Variant className="w-72" label="selection">
        <BatchTable className="w-full" isNarrow isSelected />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <BatchTable className="w-full" isNarrow />
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <BatchTable className="w-full" isNarrow />
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <BatchTable className="w-full" isNarrow />
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <BatchTable className="w-full" isNarrow />
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <BatchTable className="w-full" isNarrow />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="empty">
        <Table aria-label="Squeeze Batch" className="w-full">
          <TableHeader>
            <TableColumn isRowHeader>File</TableColumn>
            <TableColumn className="text-end">After</TableColumn>
            <TableColumn>Status</TableColumn>
          </TableHeader>
          <TableBody items={noRows}>
            {(file) => <TableRow id={file.id} />}
          </TableBody>
        </Table>
      </Variant>
    </VariantGrid>
  </div>
);
