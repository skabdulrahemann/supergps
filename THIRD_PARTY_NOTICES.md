# Third Party Notices

## Traccar

Project: Traccar GPS Tracking System
Repository: https://github.com/traccar/traccar
License: Apache License 2.0

The SuperGPS GPS tracking gateway uses Traccar documentation and protocol
decoder behavior as a reference for understanding GPS protocol framing,
packet types, checksum behavior, ACK requirements, and field semantics.

No Traccar Java source code has been copied verbatim into this repository.
The GT06 implementation in `backend/tracking/gt06Protocol.js` is native
Node.js code adapted to the existing SuperGPS tracking service and tests.

Reference materials:
- https://github.com/traccar/traccar/tree/master/src/main/java/org/traccar/protocol
- https://www.traccar.org/protocols/
- https://www.traccar.org/identify-protocol/

