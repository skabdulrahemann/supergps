const EventEmitter = require('events');

const trackingEvents = new EventEmitter();

function emitTrackingPosition(payload) {
  trackingEvents.emit('tracking:position', payload);
}

function onTrackingPosition(listener) {
  trackingEvents.on('tracking:position', listener);
  return () => trackingEvents.off('tracking:position', listener);
}

module.exports = {
  emitTrackingPosition,
  onTrackingPosition,
};
