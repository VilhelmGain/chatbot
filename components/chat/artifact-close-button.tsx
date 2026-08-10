import { memo, useCallback } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { CrossIcon } from "./icons";

function PureArtifactCloseButton() {
  const { setArtifact } = useArtifact();
  const handleClick = useCallback(() => {
    setArtifact((currentArtifact) =>
      currentArtifact.status === "streaming"
        ? {
            ...currentArtifact,
            isVisible: false,
          }
        : { ...initialArtifactData, status: "idle" }
    );
  }, [setArtifact]);

  return (
    <button
      className="group flex size-8 items-center justify-center rounded-3xl border border-transparent text-muted-foreground transition-all duration-150 hover:border-white/8 hover:bg-white/5 hover:text-foreground active:scale-95"
      data-testid="artifact-close-button"
      onClick={handleClick}
      type="button"
    >
      <CrossIcon size={16} />
    </button>
  );
}

export const ArtifactCloseButton = memo(PureArtifactCloseButton, () => true);
