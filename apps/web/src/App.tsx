import { useState, type ReactElement } from "react";
import type { ProjectLanguage } from "@ovaf/contracts";
import { JobPanel } from "./components/JobPanel";
import { ProjectPanel } from "./components/ProjectPanel";
import { ScriptPanel } from "./components/ScriptPanel";
import { StatusBanner } from "./components/StatusBanner";
import { ValidationPanel } from "./components/ValidationPanel";
import { useVideoAutomationWorkspace } from "./state/useVideoAutomationWorkspace";

export function App(): ReactElement {
  const workspace = useVideoAutomationWorkspace();
  const [openProjectId, setOpenProjectId] = useState("");
  const [projectLanguage, setProjectLanguage] = useState<ProjectLanguage>("vi");
  const [projectName, setProjectName] = useState("Short video draft");

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="mx-auto max-w-[1680px] px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Open Video Automation Framework</p>
            <h1 className="text-2xl font-semibold text-neutral-950">Render workspace</h1>
          </div>
          <StatusBanner error={workspace.state.error} statusMessage={workspace.state.statusMessage} />
        </header>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)_380px]">
          <ProjectPanel
            apiBaseUrl={workspace.state.apiBaseUrl}
            busyAction={workspace.state.busyAction}
            onApiBaseUrlChange={workspace.actions.setApiBaseUrl}
            onCreateProject={() => {
              void workspace.actions.createProject({
                language: projectLanguage,
                name: projectName
              });
            }}
            onOpenProject={() => {
              void workspace.actions.openProject(openProjectId);
            }}
            onOpenProjectIdChange={setOpenProjectId}
            onProjectLanguageChange={setProjectLanguage}
            onProjectNameChange={setProjectName}
            openProjectId={openProjectId}
            projectLanguage={projectLanguage}
            projectName={projectName}
            recentProjects={workspace.state.recentProjects}
            selectedProjectId={workspace.state.selectedProject?.id ?? null}
            workspaceId={workspace.state.workspaceId}
          />

          <ScriptPanel
            busyAction={workspace.state.busyAction}
            latestVersion={workspace.state.latestVersion}
            onRenderVideo={() => {
              void workspace.actions.renderVideo();
            }}
            onSaveVersion={() => {
              void workspace.actions.saveVersion();
            }}
            onScriptTextChange={workspace.actions.setScriptText}
            onValidateScript={() => {
              void workspace.actions.validateScript();
            }}
            scriptText={workspace.state.scriptText}
            selectedProject={workspace.state.selectedProject}
            validation={workspace.state.validation}
          />

          <div className="space-y-4">
            <ValidationPanel validation={workspace.state.validation} />
            <JobPanel
              apiBaseUrl={workspace.state.apiBaseUrl}
              busyAction={workspace.state.busyAction}
              job={workspace.state.job}
              logs={workspace.state.logs}
              onCancelJob={() => {
                void workspace.actions.cancelJob();
              }}
              onLoadLogs={() => {
                void workspace.actions.loadLogs();
              }}
              onRefreshJob={() => {
                void workspace.actions.refreshJob();
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
