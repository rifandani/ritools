import { useState } from "react";

import {
  Leaderboard,
  LeaderboardContent,
  LeaderboardEnd,
  LeaderboardHeader,
  LeaderboardItem,
  LeaderboardStart,
  LeaderboardTitle,
} from "@/core/components/ui/leaderboard";

import { Variant, VariantGrid } from "../variant";

const formats = [
  { name: "JPEG", value: 82 },
  { name: "WebP", value: 64 },
  { name: "PNG", value: 41 },
  { name: "AVIF", value: 28 },
];

const Board = ({ isAction = false }: { isAction?: boolean }) => {
  const [chosen, setChosen] = useState<string | null>(isAction ? "JPEG" : null);
  return (
    <Leaderboard className="w-full">
      <LeaderboardHeader>
        <LeaderboardTitle>Kept</LeaderboardTitle>
      </LeaderboardHeader>
      <LeaderboardContent>
        {formats.map((format) => (
          <LeaderboardItem
            key={format.name}
            maxValue={100}
            onAction={
              isAction
                ? () => {
                    setChosen(format.name);
                  }
                : undefined
            }
            value={format.value}
          >
            <LeaderboardStart>{format.name}</LeaderboardStart>
            <LeaderboardEnd>{format.value}%</LeaderboardEnd>
          </LeaderboardItem>
        ))}
      </LeaderboardContent>
      {chosen ? <p className="text-muted-fg text-xs">Picked {chosen}</p> : null}
    </Leaderboard>
  );
};

export const LeaderboardShowcase = () => (
  <div className="flex flex-col gap-8">
    <VariantGrid>
      <Variant className="w-72" label="compression kept, by format">
        <Board />
      </Variant>
      <Variant className="w-72" demo="hover" label="with an action, hovered">
        <Board isAction />
      </Variant>
    </VariantGrid>

    <VariantGrid>
      <Variant className="w-72" label="rest">
        <Board />
      </Variant>
      <Variant className="w-72" demo="hover" label="hover">
        <Board />
      </Variant>
      <Variant className="w-72" demo="pressed" label="pressed">
        <Board isAction />
      </Variant>
      <Variant className="w-72" demo="focus" label="focus">
        <Board isAction />
      </Variant>
      <Variant className="w-72" demo="disabled" label="disabled">
        <Board />
      </Variant>
    </VariantGrid>
  </div>
);
