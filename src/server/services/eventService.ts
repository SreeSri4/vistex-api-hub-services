import { RegistrationService } from './baseRegistrationService.js';
import { ServiceError } from './dataStore.js';

// Registers Events for a tenant. Items are written to:
//   <DATA_DIR>/<tenant_id>/Events/<id>.json
export const eventService = new RegistrationService({
  label: 'Event',
  folderName: 'Events',
  validate: (payload) => {
    if (payload.type !== undefined && typeof payload.type !== 'string') {
      throw new ServiceError('Event "type" must be a string when provided (e.g. "Kafka", "Webhook").');
    }
    if (payload.channel !== undefined && typeof payload.channel !== 'string') {
      throw new ServiceError('Event "channel" must be a string when provided.');
    }
  },
});