/** One numbered group of a settings ticket: a numbered heading and its body. */
export const NumberedGroup = ({
  children,
  index,
  title,
}: {
  readonly children: React.ReactNode;
  readonly index: string;
  readonly title: string;
}) => (
  <section className="py-4">
    <h3 className="border-rule flex items-center gap-x-2 border-b-2 pb-1.5">
      <span className="num bg-fg text-bg grid size-6 shrink-0 place-content-center text-xs font-extrabold">
        {index}
      </span>
      <span className="text-xs font-bold tracking-[0.08em] uppercase [font-stretch:87.5%]">
        {title}
      </span>
    </h3>
    <div className="pt-3">{children}</div>
  </section>
);
