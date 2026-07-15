# Security Specification: Company Trip Room Booking

## 1. Data Invariants
- An employee document must have valid fields, conforming to types and sizes.
- A room document must have correct gender restriction values.
- Anyone can read the collections because this is an unauthenticated employee registration tool.
- Updates can be made without authentication to support friction-free employee booking, but fields like `id` and `name` must be structurally valid.

## 2. The "Dirty Dozen" Payloads
These payloads attempt to breach the system's schema or injection restrictions:
1. Setting an extremely long ID or name.
2. Injecting invalid gender restriction values.
3. Setting an invalid rsvpStatus.
4. Setting employee properties with missing required keys.
5. Trying to set system-generated fields (like config status) through standard fields.
6. Overwriting immutable fields on update.
7. Injecting massive strings as floor numbers.
8. Trying to set negative values for pricePerNight.
9. Injecting script tags or HTML in the room number.
10. Attempting SQL/NoSQL injection via document paths.
11. Bypassing schema validation using extra properties.
12. Creating room bookings for non-existent room numbers.

## 3. Security Rules draft
The security rules will validate incoming data formats and enforce that only correct types can be written.
