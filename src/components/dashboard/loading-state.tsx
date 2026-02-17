import { API_URL } from "@/config/constants";

interface LoadingStateProps {
  error: string | null;
}

export function LoadingState({ error }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-5">⚡</div>
        <p className="text-gray-400 text-base">
          {error ? `Connection error: ${error}` : "Connecting to bot..."}
        </p>
        <p className="text-gray-600 text-sm mt-3">
          Make sure the API server is running at {API_URL}
        </p>
      </div>
    </div>
  );
}
