import type { SimRequest, SimResponse } from './sim-service.model';
import { handleSimRequest } from './sim-service.utils';

addEventListener('message', ({ data }: MessageEvent<SimRequest>) => {
  handleSimRequest(
    data,
    (response: SimResponse) => postMessage(response),
    () => performance.now(),
  );
});
