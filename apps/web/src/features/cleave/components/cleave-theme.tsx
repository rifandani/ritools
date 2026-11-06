import { Autocomplete, useFilter } from "react-aria-components/Autocomplete";
import { HiChevronUpDown } from "react-icons/hi2";

import { Label } from "@/core/components/ui/field";
import { ListBox } from "@/core/components/ui/list-box";
import { PopoverContent } from "@/core/components/ui/popover";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import { Select, SelectItem, SelectTrigger } from "@/core/components/ui/select";
import { useTranslation } from "@/features/i18n/use-translation";

import type { DiffTheme, ThemeMode } from "../cleave.themes";
import { themesForMode } from "../cleave.themes";

export const CleaveTheme = ({
  mode,
  theme,
  isDisabled,
  onChange,
}: {
  readonly mode: ThemeMode;
  readonly theme: DiffTheme;
  readonly isDisabled: boolean;
  readonly onChange: (theme: DiffTheme) => void;
}) => {
  const { t } = useTranslation();
  const { contains } = useFilter({ sensitivity: "base" });
  const themes = themesForMode(mode);
  return (
    <Select
      className="cleave-select cleave-theme"
      isDisabled={isDisabled}
      selectedKey={theme}
      onSelectionChange={(key) => {
        const selected = themes.find((item) => item.id === key);
        if (selected) {
          onChange(selected.id);
        }
      }}
    >
      <Label>{t("cleaveTheme")}</Label>
      <SelectTrigger>
        <span className="truncate">
          {themes.find((item) => item.id === theme)?.name}
        </span>
        <HiChevronUpDown
          aria-hidden="true"
          className="text-muted-fg ms-auto size-4 shrink-0"
        />
      </SelectTrigger>
      <PopoverContent className="w-72 min-w-(--trigger-width) overflow-hidden *:data-[slot=popover-inner]:overflow-hidden">
        <Autocomplete
          filter={(text, query) =>
            query.split(/[\s-]+/u).every((word) => contains(text, word))
          }
        >
          <SearchField
            aria-label={t("cleaveSearchThemes")}
            className="m-2 w-auto min-w-0"
          >
            <SearchInput placeholder={t("cleaveSearchThemes")} autoFocus />
          </SearchField>
          <ListBox
            className="max-h-[min(20rem,50dvh)] border-0"
            renderEmptyState={() => (
              <p className="text-muted-fg col-span-2 px-3 py-4">
                {t("cleaveNoThemes")}
              </p>
            )}
          >
            {themes.map((item) => (
              <SelectItem id={item.id} key={item.id} textValue={item.name}>
                {item.name}
              </SelectItem>
            ))}
          </ListBox>
        </Autocomplete>
      </PopoverContent>
    </Select>
  );
};
