import { Button } from "@/core/components/ui/button";
import {
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@/core/components/ui/modal";
import { useTranslation } from "@/features/i18n/use-translation";

export const TabularConfirm = ({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  readonly title: string;
  readonly description: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel?: string;
}) => {
  const { t } = useTranslation();
  return (
    <ModalContent
      isOpen
      role="alertdialog"
      aria-label={title}
      size="sm"
      closeButton={false}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <ModalHeader title={title} description={description} />
      <ModalFooter>
        <Button autoFocus intent="outline" onPress={onCancel}>
          {t("tabularKeepWorking")}
        </Button>
        <Button intent="danger" onPress={onConfirm}>
          {confirmLabel ?? t("tabularApply")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};
