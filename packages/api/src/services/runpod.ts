/**
 * RunPod Serverless API client.
 * Dispatches GPU processing jobs and checks their status.
 */

interface RunPodDispatchInput {
  videoUrl: string;
  roomId: string;
  tourId: string;
}

interface RunPodDispatchResponse {
  id: string;
  status: string;
}

interface RunPodStatusResponse {
  id: string;
  status: string;
  output?: unknown;
  error?: string;
}

interface RunPodJobStatus {
  status: string;
  output?: unknown;
}

function getRunPodConfig(): { apiKey: string; endpointId: string } {
  const apiKey = process.env["RUNPOD_API_KEY"];
  const endpointId = process.env["RUNPOD_ENDPOINT_ID"];

  if (!apiKey || !endpointId) {
    throw new Error(
      "RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID environment variables are required",
    );
  }

  return { apiKey, endpointId };
}

/**
 * Dispatches a video processing job to RunPod Serverless.
 * @param input - Job input containing videoUrl, roomId and tourId
 * @returns Object containing the RunPod job ID
 */
export async function dispatchJob(
  input: RunPodDispatchInput,
): Promise<{ jobId: string }> {
  const { apiKey, endpointId } = getRunPodConfig();

  const response = await fetch(
    `https://api.runpod.ai/v2/${endpointId}/run`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Falha ao despachar job RunPod (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as RunPodDispatchResponse;

  if (!data.id) {
    throw new Error("RunPod retornou resposta sem ID de job");
  }

  return { jobId: data.id };
}

/**
 * Retrieves the current status of a RunPod job.
 * @param jobId - RunPod job ID returned from dispatchJob
 * @returns Job status and optional output data
 */
export async function getJobStatus(jobId: string): Promise<RunPodJobStatus> {
  const { apiKey, endpointId } = getRunPodConfig();

  const response = await fetch(
    `https://api.runpod.ai/v2/${endpointId}/status/${jobId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Falha ao consultar status do job RunPod (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as RunPodStatusResponse;

  return {
    status: data.status,
    ...(data.output !== undefined && { output: data.output }),
  };
}
