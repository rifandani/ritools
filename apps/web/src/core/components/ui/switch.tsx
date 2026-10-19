import {
  SwitchButton,
  type SwitchButtonProps,
  SwitchField as SwitchFieldPrimitive,
  type SwitchFieldProps,
} from "react-aria-components/Switch"
import { tv } from "tailwind-variants"
import { Label } from "@/core/components/ui/field"
import { cx } from "@/core/utils/primitive"

export function SwitchField({ className, ...props }: SwitchFieldProps) {
  return (
    <SwitchFieldPrimitive
      {...props}
      data-slot="control"
      className={cx("has-[[slot=description]]:**:data-[slot=control-label]:font-medium", className)}
      style={({ defaultStyle }) => ({
        ...defaultStyle,
        WebkitTapHighlightColor: "transparent",
      })}
    />
  )
}

/*
 * A square track with a square block. Off: an outlined track, the block in
 * control edge at the start. On: a solid ink track, the paper block at the
 * end; the block's place is the signal, not the fill. Pressed prints the track
 * solid at once. Disabled fades and strikes the label. Focus brackets the
 * whole control.
 */
const switchStyles = tv({
  slots: {
    root: [
      "bracket group relative grid cursor-default gap-x-6 gap-y-1 outline-hidden ltr:grid-cols-[1fr_auto] rtl:grid-cols-[auto_1fr]",
      "*:data-[slot=control-label]:row-start-1 ltr:*:data-[slot=control-label]:col-start-1 rtl:*:data-[slot=control-label]:col-start-2",
      "*:[[slot=description]]:row-start-2 ltr:*:[[slot=description]]:col-start-1 rtl:*:[[slot=description]]:col-start-2",
      "disabled:cursor-not-allowed",
    ],
    track: [
      "relative isolate inline-flex h-6 w-11 shrink-0 cursor-default self-start border-2 border-input bg-(--control-bg,transparent) p-0.5 sm:mt-0.5 sm:h-5 sm:w-9 ltr:col-start-2 rtl:col-start-1",
      "transition-[background-color,border-color] duration-90 ease-out",
      "group-hover:border-fg in-data-[demo=hover]:border-fg in-data-[demo=focus]:border-fg",
      "group-pressed:border-fg group-pressed:bg-fg in-data-[demo=pressed]:border-fg in-data-[demo=pressed]:bg-fg",
      "forced-colors:border-[ButtonText]",
    ],
    thumb: [
      "pointer-events-none block size-4 bg-input sm:size-3",
      "transition-[translate,background-color] duration-140 ease-out-expo",
      "group-hover:bg-fg in-data-[demo=hover]:bg-fg in-data-[demo=focus]:bg-fg",
      "group-pressed:bg-bg in-data-[demo=pressed]:bg-bg",
      "forced-colors:bg-[ButtonText]",
    ],
    label: "font-normal decoration-2 decoration-muted-fg group-disabled:line-through",
  },
  variants: {
    isSelected: {
      true: {
        track:
          "border-fg bg-fg forced-colors:border-[Highlight] forced-colors:bg-[Highlight]",
        thumb:
          "bg-bg group-hover:bg-bg in-data-[demo=hover]:bg-bg in-data-[demo=focus]:bg-bg ltr:translate-x-5 sm:ltr:translate-x-4 rtl:-translate-x-5 sm:rtl:-translate-x-4 forced-colors:bg-[HighlightText]",
      },
    },
    isDisabled: {
      true: {
        track:
          "border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] bg-transparent group-hover:border-[color-mix(in_oklab,var(--input)_40%,var(--bg))] forced-colors:border-[GrayText] forced-colors:bg-transparent",
        thumb:
          "bg-[color-mix(in_oklab,var(--input)_55%,var(--bg))] group-hover:bg-[color-mix(in_oklab,var(--input)_55%,var(--bg))] forced-colors:bg-[GrayText]",
      },
    },
  },
  compoundVariants: [
    // An on track has an ink edge already, so hover doubles it outward.
    {
      isSelected: true,
      isDisabled: false,
      class: { track: "group-hover:outline-2 group-hover:outline-fg in-data-[demo=hover]:outline-2 in-data-[demo=hover]:outline-fg" },
    },
  ],
})

export function Switch({ children, className, ...props }: SwitchButtonProps) {
  return (
    <SwitchButton
      className={cx(switchStyles().root(), className)}
      {...props}
    >
      {(values) => {
        const { track, thumb, label } = switchStyles({
          isSelected: values.isSelected,
          isDisabled: values.isDisabled,
        })
        return (
          <>
            <span data-slot="indicator" className={track()}>
              <span aria-hidden="true" className={thumb()} />
            </span>
            {typeof children === "function" ? (
              children(values)
            ) : typeof children === "string" ? (
              <Label className={label()} elementType="span" data-slot="control-label">
                {children}
              </Label>
            ) : (
              children
            )}
          </>
        )
      }}
    </SwitchButton>
  )
}
