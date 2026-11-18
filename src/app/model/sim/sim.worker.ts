import { handleSimRequest } from './sim-core';
import type { SimRequest, SimResponse } from './sim-protocol';

addEventListener('message', ({ data }: MessageEvent<SimRequest>) => {
  handleSimRequest(
    data,
    (response: SimResponse) => postMessage(response),
    () => performance.now(),
  );
});
