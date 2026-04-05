import { createChannelSender } from './index';
import { outboundMockResponse } from '../outbound-mapping/mock';

export async function runOutboundMock() {
  const sender = createChannelSender('website');
  return sender.send(outboundMockResponse);
}
