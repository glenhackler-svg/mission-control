import { NewMissionForm } from "./form";

export default function NewMissionPage() {
  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">New Mission</h1>
        <p className="text-[var(--ink-2)]">
          Define a multi-step goal and assign each step to an agent.
        </p>
      </div>
      <NewMissionForm />
    </div>
  );
}
