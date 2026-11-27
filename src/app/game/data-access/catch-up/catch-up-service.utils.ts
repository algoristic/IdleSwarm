import { CatchUpRequest, CatchUpResponse } from './catch-up-service.model';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isCatchUpRequest(value: unknown): value is CatchUpRequest {
  return (
    isRecord(value) &&
    value['type'] === 'catchUp' &&
    isRecord(value['config']) &&
    isRecord(value['state']) &&
    typeof value['seconds'] === 'number'
  );
}

export function isCatchUpResponse(value: unknown): value is CatchUpResponse {
  if (!isRecord(value)) return false;
  if (value['type'] === 'progress')
    return typeof value['done'] === 'number' && typeof value['total'] === 'number';
  return (
    value['type'] === 'done' &&
    isRecord(value['state']) &&
    (value['summary'] === null || isRecord(value['summary']))
  );
}
