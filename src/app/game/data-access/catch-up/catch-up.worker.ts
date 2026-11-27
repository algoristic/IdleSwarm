import { catchUp } from '../../domain/catch-up-logic';
import { CatchUpResponse } from './catch-up-service.model';
import { isCatchUpRequest } from './catch-up-service.utils';

addEventListener('message', ({ data }: MessageEvent<unknown>) => {
  if (!isCatchUpRequest(data)) throw new TypeError('invalid catch-up request');
  const { config, state, seconds } = data;
  const summary = catchUp(config, state, seconds, (done, total) =>
    post({ type: 'progress', done, total }),
  );
  post({ type: 'done', state, summary });
});

function post(message: CatchUpResponse): void {
  postMessage(message);
}
