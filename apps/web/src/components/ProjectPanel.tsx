import type { ProjectLanguage } from "@ovaf/contracts";
import type { RecentProject, WorkspaceAction } from "../state/useVideoAutomationWorkspace";

const PROJECT_LANGUAGES: readonly ProjectLanguage[] = ["vi", "en"];

export interface ProjectPanelProps {
  readonly apiBaseUrl: string;
  readonly busyAction: WorkspaceAction | null;
  readonly openProjectId: string;
  readonly projectLanguage: ProjectLanguage;
  readonly projectName: string;
  readonly recentProjects: readonly RecentProject[];
  readonly selectedProjectId: string | null;
  readonly workspaceId: string | null;
  readonly onApiBaseUrlChange: (apiBaseUrl: string) => void;
  readonly onCreateProject: () => void;
  readonly onOpenProject: () => void;
  readonly onOpenProjectIdChange: (projectId: string) => void;
  readonly onProjectLanguageChange: (language: ProjectLanguage) => void;
  readonly onProjectNameChange: (projectName: string) => void;
}

export function ProjectPanel(props: ProjectPanelProps): JSX.Element {
  const isCreating = props.busyAction === "create-project";
  const isOpening = props.busyAction === "open-project";

  return (
    <section className="rounded-lg border border-neutral-300 bg-white p-4">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Workspace</p>
        <h2 className="text-lg font-semibold text-neutral-950">Project control</h2>
      </div>

      <label className="block text-sm font-medium text-neutral-800" htmlFor="api-base-url">
        API base URL
      </label>
      <input
        className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-600 focus:bg-white"
        id="api-base-url"
        onChange={(event) => props.onApiBaseUrlChange(event.target.value)}
        placeholder="http://localhost:3000"
        value={props.apiBaseUrl}
      />

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          props.onCreateProject();
        }}
      >
        <div>
          <label className="block text-sm font-medium text-neutral-800" htmlFor="project-name">
            New project name
          </label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-600 focus:bg-white"
            id="project-name"
            onChange={(event) => props.onProjectNameChange(event.target.value)}
            value={props.projectName}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-800" htmlFor="project-language">
            Language
          </label>
          <select
            className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-600 focus:bg-white"
            id="project-language"
            onChange={(event) => props.onProjectLanguageChange(event.target.value as ProjectLanguage)}
            value={props.projectLanguage}
          >
            {PROJECT_LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language === "vi" ? "Vietnamese" : "English"}
              </option>
            ))}
          </select>
        </div>

        <button
          className="w-full rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-neutral-400"
          disabled={isCreating}
          type="submit"
        >
          {isCreating ? "Creating..." : "Create project"}
        </button>
      </form>

      <form
        className="mt-5 space-y-3 border-t border-neutral-200 pt-5"
        onSubmit={(event) => {
          event.preventDefault();
          props.onOpenProject();
        }}
      >
        <label className="block text-sm font-medium text-neutral-800" htmlFor="open-project-id">
          Open by project ID
        </label>
        <input
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-950 outline-none focus:border-emerald-600 focus:bg-white"
          id="open-project-id"
          onChange={(event) => props.onOpenProjectIdChange(event.target.value)}
          placeholder="project-..."
          value={props.openProjectId}
        />
        <button
          className="w-full rounded-md border border-neutral-400 bg-white px-3 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100 disabled:text-neutral-500"
          disabled={isOpening}
          type="submit"
        >
          {isOpening ? "Opening..." : "Open project"}
        </button>
      </form>

      <div className="mt-5 border-t border-neutral-200 pt-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-neutral-950">Recent projects</h3>
          <span className="text-xs text-neutral-600">{props.workspaceId ?? "No workspace"}</span>
        </div>
        {props.recentProjects.length === 0 ? (
          <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-600">
            Created or opened projects will appear here for the current session.
          </p>
        ) : (
          <div className="space-y-2">
            {props.recentProjects.map((project) => {
              const isSelected = project.record.id === props.selectedProjectId;
              return (
                <button
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                      : "border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400"
                  }`}
                  key={project.record.id}
                  onClick={() => props.onOpenProjectIdChange(project.record.id)}
                  type="button"
                >
                  <span className="block font-medium">{project.record.name}</span>
                  <span className="block truncate font-mono text-xs text-neutral-600">{project.record.id}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
