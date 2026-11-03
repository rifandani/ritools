import { Button } from "@/core/components/ui/button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
} from "@/core/components/ui/menu";

export interface ContextAction {
  readonly label: string;
  readonly action: () => void;
  readonly disabled?: boolean;
  readonly icon?: React.ReactNode;
  readonly intent?: "danger";
}
export interface ContextPoint {
  readonly x: number;
  readonly y: number;
}
export const QuillContextMenu = ({
  point,
  onClose,
  label,
  actions,
}: {
  readonly point: ContextPoint | null;
  readonly onClose: () => void;
  readonly label: string;
  readonly actions: readonly ContextAction[];
}) => (
  <Menu
    isOpen={!!point}
    onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}
  >
    <Button className="hidden" aria-hidden="true" />
    <MenuContent
      aria-label={label}
      popover={{
        trigger: "longPress",
        getTargetRect: () => new DOMRect(point?.x ?? 0, point?.y ?? 0, 0, 0),
      }}
    >
      {actions.map((item) => (
        <MenuItem
          key={item.label}
          textValue={item.label}
          intent={item.intent}
          isDisabled={item.disabled}
          onAction={() => {
            item.action();
            onClose();
          }}
        >
          {item.icon}
          <MenuLabel>{item.label}</MenuLabel>
        </MenuItem>
      ))}
    </MenuContent>
  </Menu>
);
