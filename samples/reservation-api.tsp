// Reservation API - hotel reservation system sample for C# code generation
import "@typespec/http";
import "@typespec/openapi";
using TypeSpec.Http;
using TypeSpec.OpenAPI;

@useAuth(ApiKeyAuth<ApiKeyLocation.header, "X-Api-Key">)
namespace AutomationHubGateway.Api;

@error
model Error {
  type?: string;
  title: string;
  status: int32;
  detail?: string;
  instance?: string;
}

model CommonListParameters {
  @header
  requestID: string;

  @query
  locale?: string;

  @header
  clientVersion?: string;
}

model Guest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  loyaltyTier?: string;
  loyaltyPoints?: int32;
}

enum reservationState {
  Confirmed,
  Pending,
  Cancelled,
}

model Reservation {
  id: string;
  guest: Guest;
  checkInDate: utcDateTime;
  checkOutDate: utcDateTime;
  createdAt: utcDateTime;
  state: reservationState;
}

model ListLinks is Record<url> {
  next?: url;
  prev?: url;
}

model ReservationListResult {
  @pageItems results: Reservation[];
  @continuationToken nextPageToken?: string;
  @header("Link") link?: LinkHeader<ListLinks>;
}

@route("/reservations")
@tag("Reservations")
interface Reservations {
  /** List reservations with optional filtering */
  @operationId("GetReservation")
  @list
  @get
  list(
    @query checkInStartDate?: utcDateTime,
    @query checkInEndDate?: utcDateTime,
  ): ReservationListResult;
}
