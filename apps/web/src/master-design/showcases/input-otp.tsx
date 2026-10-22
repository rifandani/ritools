import { useState } from "react";
import { HiExclamationTriangle } from "react-icons/hi2";

import { fieldErrorStyles } from "@/core/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPLabel,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/core/components/ui/input-otp";

import { Variant, VariantGrid } from "../variant";

const SLOTS = [0, 1, 2, 3, 4, 5] as const;

/** input-otp owns its input's value, so each specimen holds its code in state. */
const Code = ({
  defaultValue = "",
  disabled = false,
  isInvalid = false,
}: {
  defaultValue?: string;
  disabled?: boolean;
  isInvalid?: boolean;
}) => {
  const [code, setCode] = useState(defaultValue);
  return (
    <div className="space-y-2">
      <InputOTPLabel>Preset code</InputOTPLabel>
      <InputOTP
        disabled={disabled}
        inputMode="numeric"
        maxLength={6}
        onChange={setCode}
        value={code}
      >
        <InputOTPGroup>
          {SLOTS.map((index) => (
            <InputOTPSlot aria-invalid={isInvalid} index={index} key={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};

const SplitCode = () => {
  const [code, setCode] = useState("2048");
  return (
    <div className="space-y-2">
      <InputOTPLabel>Preset code</InputOTPLabel>
      <InputOTP
        inputMode="numeric"
        maxLength={6}
        onChange={setCode}
        value={code}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
};

/**
 * Six 40px slots plus the separator make a 264px control, wider than one
 * 13.5rem track, so this entry raises its own track until the widest specimen
 * fits inside the cell's right rule.
 */
export const InputOtpShowcase = () => (
  <VariantGrid className="grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
    <Variant label="rest, empty">
      <Code />
    </Variant>
    <Variant label="rest, filled">
      <Code defaultValue="204800" />
    </Variant>
    <Variant demo="focus" label="focus">
      <Code defaultValue="2048" />
    </Variant>
    <Variant label="invalid">
      <Code defaultValue="204801" isInvalid />
      <p className={fieldErrorStyles()}>
        <HiExclamationTriangle aria-hidden data-slot="icon" />
        <span>No preset has this code.</span>
      </p>
    </Variant>
    <Variant label="disabled">
      <Code defaultValue="204800" disabled />
    </Variant>
    <Variant label="InputOTPSeparator">
      <SplitCode />
    </Variant>
  </VariantGrid>
);
