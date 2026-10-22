import { Description, FieldError, Label } from "@/core/components/ui/field";
import {
  Select,
  SelectContent,
  SelectDescription,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/core/components/ui/select";

import { Variant, VariantGrid } from "../variant";

const orders = [
  { id: "name", name: "File name" },
  { id: "largest", name: "Size, largest first" },
  { id: "smallest", name: "Size, smallest first" },
  { id: "misses", name: "Misses first" },
];

const states = ["hover", "pressed", "focus"] as const;

export const SelectShowcase = () => (
  <div className="flex flex-col gap-8">
    {/* A trigger is a well that is also a button: it has a pressed print. */}
    <VariantGrid>
      <Variant label="rest">
        <Select className="w-full" defaultSelectedKey="largest">
          <Label>Sort the Batch by</Label>
          <SelectTrigger />
          <SelectContent items={orders}>
            {(item) => <SelectItem>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      </Variant>
      {states.map((state) => (
        <Variant demo={state} key={state} label={state}>
          <Select className="w-full" defaultSelectedKey="largest">
            <Label>Sort the Batch by</Label>
            <SelectTrigger />
            <SelectContent items={orders}>
              {(item) => <SelectItem>{item.name}</SelectItem>}
            </SelectContent>
          </Select>
        </Variant>
      ))}
      <Variant label="empty, placeholder">
        <Select className="w-full" placeholder="Pick an order">
          <Label>Sort the Batch by</Label>
          <SelectTrigger />
          <SelectContent items={orders}>
            {(item) => <SelectItem>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      </Variant>
      <Variant label="isInvalid">
        <Select className="w-full" isInvalid placeholder="Pick an order">
          <Label>Sort the Batch by</Label>
          <SelectTrigger />
          <SelectContent items={orders}>
            {(item) => <SelectItem>{item.name}</SelectItem>}
          </SelectContent>
          <FieldError>Pick an order for the Batch.</FieldError>
        </Select>
      </Variant>
      <Variant label="isDisabled">
        <Select className="w-full" defaultSelectedKey="largest" isDisabled>
          <Label>Sort the Batch by</Label>
          <SelectTrigger />
          <SelectContent items={orders}>
            {(item) => <SelectItem>{item.name}</SelectItem>}
          </SelectContent>
        </Select>
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant label="items with descriptions, open it">
        <Select className="w-full" defaultSelectedKey="closest">
          <Label>When an image misses its Target</Label>
          <SelectTrigger />
          <SelectContent>
            <SelectItem id="closest" textValue="Keep the closest result">
              <SelectLabel>Keep the closest result</SelectLabel>
              <SelectDescription>
                The smallest file the search reached.
              </SelectDescription>
            </SelectItem>
            <SelectItem id="original" textValue="Keep the original">
              <SelectLabel>Keep the original</SelectLabel>
              <SelectDescription>
                The file leaves the Batch unchanged.
              </SelectDescription>
            </SelectItem>
            <SelectItem id="drop" isDisabled textValue="Drop the image">
              <SelectLabel>Drop the image</SelectLabel>
              <SelectDescription>Not in this version.</SelectDescription>
            </SelectItem>
          </SelectContent>
          <Description>
            A Miss is never hidden: the result list marks it.
          </Description>
        </Select>
      </Variant>
    </VariantGrid>
  </div>
);
