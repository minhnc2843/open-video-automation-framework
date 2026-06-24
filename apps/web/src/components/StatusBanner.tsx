export interface StatusBannerProps {
  readonly error: string | null;
  readonly statusMessage: string;
}

export function StatusBanner(props: StatusBannerProps): JSX.Element {
  if (props.error !== null) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950" role="alert">
        <span className="font-semibold">Action failed:</span> {props.error}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-800" role="status">
      {props.statusMessage}
    </div>
  );
}
