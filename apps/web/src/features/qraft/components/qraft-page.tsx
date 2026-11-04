"use client";

import { useState } from "react";

import { Container } from "@/core/components/ui/container";
import { Tab, TabList, TabPanel, Tabs } from "@/core/components/ui/tabs";
import { useAgentActions } from "@/core/hooks/use-agent-actions";

import { QRAFT_AGENT_ACTIONS } from "../qraft.agent";
import type { QraftAgentController, QraftTab } from "../qraft.agent";
import { useQraft } from "../use-qraft";
import { QraftBatch } from "./qraft-batch";
import { QraftCode } from "./qraft-code";
import { QraftExplainer } from "./qraft-explainer";
import { QraftPayload } from "./qraft-payload";
import { QraftPreview } from "./qraft-preview";
import { QraftStyle } from "./qraft-style";

/**
 * Qraft: a local code desk.
 *
 * Single is the default tab, so the first screen holds the one code and its
 * Preview. The default QR is in the server HTML, because the core renders it
 * without a DOM. Every other Code Family loads on the client when the user asks
 * for it. Batch swaps the desk for the Label Sheet work.
 */
export const QraftPage = () => {
  const controller = useQraft();
  // Controlled, so an Agent Action shows the tab it works on.
  const [tab, setTab] = useState<QraftTab>("single");

  const agentController: QraftAgentController = {
    batchBusy: controller.batchBusy,
    batchProblem: controller.batchProblem,
    changeBatchText: controller.changeBatchText,
    changeField: controller.changeField,
    changeOutput: controller.changeOutput,
    changeRaw: controller.changeRaw,
    changeStyle: controller.changeStyle,
    choosePreset: controller.choosePreset,
    chooseSymbology: controller.chooseSymbology,
    downloadSheet: controller.downloadSheet,
    downloadZip: controller.downloadZip,
    entries: controller.entries,
    removeLogo: controller.removeLogo,
    renderSvg: controller.freshSvg,
    save: controller.save,
    setSheet: controller.setSheet,
    settings: controller.settings,
    sheet: controller.sheet,
    showTab: setTab,
    tab,
  };
  useAgentActions(QRAFT_AGENT_ACTIONS, agentController);

  return (
    <Container className="flex max-w-none min-w-0 flex-col py-10 sm:py-14">
      {/* The crumb already names the Tool; this keeps the page landmarked. */}
      <h1 className="sr-only">Qraft</h1>

      <Tabs
        className="w-full min-w-0 gap-8"
        onSelectionChange={(key) => {
          setTab(key === "batch" ? "batch" : "single");
        }}
        selectedKey={tab}
      >
        <TabList aria-label={controller.t("qraftTabsLabel")}>
          <Tab id="single">{controller.t("qraftModeSingle")}</Tab>
          <Tab id="batch">{controller.t("qraftModeBatch")}</Tab>
        </TabList>

        <TabPanel id="single">
          <div className="grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)]">
            <div className="order-2 flex min-w-0 flex-col gap-8 lg:order-1">
              <QraftPayload controller={controller} />
              <QraftCode controller={controller} />
              <QraftStyle controller={controller} />
            </div>
            <div className="order-1 min-w-0 self-start lg:sticky lg:top-20 lg:order-2">
              <QraftPreview controller={controller} />
            </div>
          </div>
        </TabPanel>

        <TabPanel id="batch">
          <QraftBatch controller={controller} />
        </TabPanel>
      </Tabs>

      <QraftExplainer />
    </Container>
  );
};
