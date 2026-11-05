import { Autocomplete, useFilter } from "react-aria-components/Autocomplete";
import { HiChevronUpDown } from "react-icons/hi2";

import { Label } from "@/core/components/ui/field";
import { ListBox } from "@/core/components/ui/list-box";
import { PopoverContent } from "@/core/components/ui/popover";
import { SearchField, SearchInput } from "@/core/components/ui/search-field";
import { Select, SelectItem, SelectTrigger } from "@/core/components/ui/select";
import { useTranslation } from "@/features/i18n/use-translation";

import { LANGUAGE_CATALOG, languageLabel } from "../cleave.languages";
import type {
  Language,
  LanguageOption,
  LanguageSelection,
} from "../cleave.languages";

const searchNames = new Map<string, string>(
  LANGUAGE_CATALOG.map((item) => [
    item.name,
    [item.id, ...item.aliases].join(" "),
  ])
);

export const CleaveLanguage = ({
  language,
  selection,
  languages,
  isDisabled,
  onChange,
}: {
  readonly language: Language;
  readonly selection: LanguageSelection;
  readonly languages: readonly LanguageOption[];
  readonly isDisabled: boolean;
  readonly onChange: (selection: LanguageSelection) => void;
}) => {
  const { t } = useTranslation();
  const { contains } = useFilter({ sensitivity: "base" });
  const plain = t("cleavePlain");
  const label = language === "text" ? plain : languageLabel(language);
  const filter = (text: string, query: string) =>
    contains(text, query) ||
    contains(
      searchNames.get(text === plain ? languageLabel("text") : text) ?? "",
      query
    );

  return (
    <Select
      className="cleave-select cleave-language"
      isDisabled={isDisabled}
      selectedKey={selection}
      onSelectionChange={(key) => {
        const selected =
          key === "auto" ? key : languages.find((item) => item.id === key)?.id;
        if (selected) {
          onChange(selected);
        }
      }}
    >
      <Label>{t("cleaveLanguage")}</Label>
      <SelectTrigger>
        <span className="truncate">
          {selection === "auto" ? `${t("cleaveAutomatic")} · ${label}` : label}
        </span>
        <HiChevronUpDown
          aria-hidden="true"
          className="text-muted-fg ms-auto size-4 shrink-0"
        />
      </SelectTrigger>
      <PopoverContent className="w-72 min-w-(--trigger-width) overflow-hidden *:data-[slot=popover-inner]:overflow-hidden">
        <Autocomplete filter={filter}>
          <SearchField
            aria-label={t("cleaveSearchLanguages")}
            className="m-2 w-auto min-w-0"
          >
            <SearchInput placeholder={t("cleaveSearchLanguages")} autoFocus />
          </SearchField>
          <ListBox
            className="max-h-[min(20rem,50dvh)] border-0"
            renderEmptyState={() => (
              <p className="text-muted-fg col-span-2 px-3 py-4">
                {t("cleaveNoLanguages")}
              </p>
            )}
          >
            <SelectItem id="auto">{t("cleaveAutomatic")}</SelectItem>
            <SelectItem id="text">{plain}</SelectItem>
            {languages.map((item) =>
              item.id === "text" ? null : (
                <SelectItem id={item.id} key={item.id} textValue={item.name}>
                  {item.name}
                </SelectItem>
              )
            )}
          </ListBox>
        </Autocomplete>
      </PopoverContent>
    </Select>
  );
};
