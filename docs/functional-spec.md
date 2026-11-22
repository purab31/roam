# Platform Requirements and Functional Specifications

## 1. Platform Overview

The platform is a multi-role web application for the buying, selling and
renting of pre-owned vehicles. It connects individual vehicle owners,
second-hand vehicle dealers, buyers and renters through a common
marketplace.

Individual owners can list their vehicles for sale, for rent, or for
both purposes. They can receive enquiries and purchase offers from
individual buyers as well as registered dealers. Dealers can manage
their own inventory, discover vehicles listed by individuals, submit
purchase offers and manage customer enquiries and rental requests.
Buyers and renters can search for vehicles, review their details,
contact sellers or dealers, submit purchase offers and request rental
bookings.

The platform also includes administrative functionality for managing
users, dealers, vehicle listings, offers, bookings, reports and platform
activity.

The platform is intended to support the following transaction and
interaction types:

-   Individual owner to individual buyer: sale of a pre-owned vehicle.
-   Individual owner to dealer: direct purchase offer from a registered
    dealer.
-   Dealer to individual buyer: sale of a vehicle from dealer inventory.
-   Individual owner to renter: rental of an individually owned vehicle.
-   Dealer to renter: rental of a vehicle listed by a dealership.

The platform facilitates discovery, enquiries, offers, booking requests
and status tracking. It is designed as an academic Web Technologies
project, so the implementation should focus on the core marketplace
workflows rather than commercial-scale integrations. Final vehicle
handover, legal ownership transfer, rental handover and payment
settlement may be completed outside the platform. The application may
record agreed amounts and transaction statuses, but an online payment
gateway is not required.

## 2. User Roles and Permissions

A single registered account may support more than one capability. For
example, a person may browse and purchase vehicles while also listing a
personally owned vehicle for sale or rent.

### 2.1 Guest / Unregistered Visitor

A guest should be able to:

-   View the public landing page.
-   Browse publicly available vehicle listings.
-   Search and filter vehicles.
-   View vehicle details and photographs.
-   View public dealer profiles.
-   View general platform information.
-   Start registration or login when attempting an account-restricted
    action.

A guest should not be able to submit offers, make booking requests, save
favourites, contact a seller through account-based enquiries or manage
listings.

### 2.2 Registered User / Buyer

A registered buyer should be able to:

-   Maintain a personal profile.
-   Browse vehicles listed by individuals and dealers.
-   Search, filter, sort and compare vehicles.
-   View vehicle and seller/dealer details.
-   Save vehicles to favourites.
-   Submit purchase enquiries.
-   Submit purchase offers where the listing allows offers.
-   Request a vehicle inspection or viewing appointment.
-   View submitted enquiries and offers.
-   Track offer status and responses.
-   View purchase-related activity and history.

### 2.3 Renter

A registered renter should be able to:

-   Browse vehicles available for rent.
-   Filter vehicles by location, rental price, vehicle type and
    availability.
-   View rental terms, charges, deposits and conditions.
-   Select rental pickup and return dates.
-   View an estimated rental cost.
-   Submit a rental booking request.
-   View booking status.
-   Cancel a booking where cancellation is permitted.
-   View current, upcoming, cancelled and completed bookings.
-   View rental history.

A user may also be a buyer, seller or dealer where the account has the
relevant capabilities.

### 2.4 Individual Vehicle Owner / Seller

An individual owner should be able to:

-   Create and maintain a personal profile.
-   Add one or more vehicles.
-   List a vehicle for sale, rent, or both.
-   Provide vehicle specifications, pricing and photographs.
-   Edit vehicle and listing information.
-   Update sale and rental availability independently.
-   Temporarily deactivate a listing.
-   Reactivate an eligible listing.
-   Mark a vehicle as sold.
-   Manage rental availability.
-   View enquiries from potential buyers and renters.
-   Receive purchase offers from individual buyers.
-   Receive purchase offers from registered dealers.
-   Accept, reject or respond to offers.
-   View rental booking requests.
-   Accept or reject rental requests.
-   View upcoming and past rentals.
-   View vehicle listing activity and relevant statistics.
-   Maintain a record of vehicle-related activity.

### 2.5 Dealer

A dealer account should represent a second-hand vehicle dealership and
should support:

-   Dealership registration.
-   Dealership profile management.
-   Submission of dealership information for verification.
-   Management of dealership contact details and location.
-   Addition and management of dealership inventory.
-   Browsing of vehicles listed by individual owners.
-   Filtering of individual listings using vehicle and location
    criteria.
-   Viewing detailed information about an individual owner's vehicle.
-   Submitting purchase offers to individual owners.
-   Managing sent offers and their statuses.
-   Managing vehicles acquired from individual owners.
-   Listing dealership inventory for sale, rent, or both.
-   Managing customer enquiries.
-   Managing rental booking requests.
-   Viewing sold and rented vehicle records.
-   Viewing inventory and activity statistics.

A dealer should only be able to publish public dealership listings when
the dealer account meets the platform's verification requirements
configured by the administrator.

### 2.6 Administrator

The administrator should have access to platform-wide management
functions.

Administrator capabilities should include:

-   View, search and manage registered users.
-   View user profiles and account status.
-   Block or unblock accounts.
-   View dealer registrations.
-   Approve, reject or request changes to dealer verification.
-   View all vehicle records and public listings.
-   Review, approve, reject, deactivate or remove listings.
-   Review reported listings and users.
-   Manage listing visibility and status.
-   View purchase offers and rental bookings.
-   Monitor transaction and booking statuses.
-   Review disputes or reported problems.
-   Manage platform categories and configurable listing rules.
-   View platform statistics and activity summaries.

Administrative actions should be restricted to authorised administrator
accounts.

## 3. Account Registration, Authentication and Profile Management

### 3.1 Registration

The registration process should collect the information required to
create an account, including:

-   Full name.
-   Email address.
-   Mobile number.
-   Password.
-   Password confirmation.
-   Acceptance of applicable terms and conditions.

The platform should validate required fields and prevent registration
using an email address or mobile number that is already registered,
where uniqueness is required.

### 3.2 Login and Session Access

Authentication functionality should include:

-   Login using registered credentials.
-   Logout.
-   Protected access to account-specific pages.
-   Role- and permission-based access to restricted features.
-   Handling of invalid credentials.
-   Password reset or forgot-password functionality.
-   Secure password storage.
-   Appropriate handling of expired or invalid authentication sessions.

### 3.3 Profile Management

Registered users should be able to:

-   View their profile.
-   Edit permitted personal information.
-   Update their mobile number and email address.
-   Change their password.
-   Upload or change a profile photograph.
-   View their account role and enabled capabilities.
-   Choose whether their mobile number and email address are visible on
    public profiles, where applicable.
-   Request account deactivation or deletion.
-   View the status of an account deactivation or deletion request.

When an account is deactivated, the user should not be able to create
new listings, offers or bookings. Existing records should be retained
where they are needed for active bookings, transaction history or
administration. Account deletion requests should be reviewed and handled
without deleting records that must remain available for these purposes.

### 3.4 Multi-Role Accounts

The platform should not require a person to create separate accounts
merely because they want to buy a vehicle and also sell or rent their
own vehicle.

The account model should support multiple capabilities where
appropriate, while ensuring that restricted actions are available only
to authorised users.

## 4. Vehicle Information and Listing Management

### 4.1 Vehicle Information

A vehicle record should support the following information, as
applicable:

**Basic information**

-   Manufacturer / brand.
-   Model.
-   Variant.
-   Vehicle category or body type.
-   Manufacturing year.
-   Registration year, where different or relevant.
-   Registration number, with suitable privacy controls.
-   Fuel type.
-   Transmission type.
-   Kilometres driven.
-   Number of previous owners.
-   Vehicle condition.
-   Colour.
-   Seating capacity.
-   Engine or battery details, where applicable.

**Location information**

-   Country.
-   State.
-   City.
-   Area or locality.
-   Pincode.
-   Pickup or inspection location, where relevant.

**Description and media**

-   Listing title.
-   Vehicle description.
-   Multiple vehicle photographs.
-   Optional supporting documents or inspection information.
-   Additional vehicle features and specifications.

**Condition information**

-   Overall condition.
-   Known damage or defects.
-   Service history information, if supplied.
-   Accident history information, if supplied.
-   Insurance information, if supplied.
-   Pollution certificate or other relevant document information, if
    supplied.

Information supplied by a user should be represented as user-provided
information unless independently verified by the platform.

### 4.2 Listing Purpose

When creating a listing, an owner or authorised dealer should be able to
select one of the following:

1.  **For Sale:** The vehicle is available for purchase.
2.  **For Rent:** The vehicle is available for rental.
3.  **For Sale and Rent:** The vehicle is available for both purposes,
    subject to separate sale and rental availability.

Sale and rental availability should be managed independently. For
example, an owner should be able to stop accepting rental requests while
keeping the vehicle listed for sale.

### 4.3 Sale Listing Details

A sale listing should support:

-   Asking price.
-   Whether the price is negotiable.
-   Minimum acceptable offer, if the owner chooses to provide it
    privately.
-   Sale description and conditions.
-   Seller type: individual or dealer.
-   Listing creation and last-updated dates.
-   Sale status.
-   Enquiry and offer availability.

### 4.4 Rental Listing Details

A rental listing should support:

-   Daily rental price.
-   Weekly rental price, if applicable.
-   Other pricing periods, if supported.
-   Security deposit.
-   Minimum rental duration.
-   Maximum rental duration.
-   Available rental dates.
-   Pickup location.
-   Return location, if different.
-   Driver included or not included.
-   Rental conditions.
-   Mileage limits, if applicable.
-   Fuel policy, if applicable.
-   Cancellation policy.
-   Rental availability status.

### 4.5 Listing Management

The listing owner or authorised dealer should be able to:

-   Create a listing.
-   View their listings.
-   Edit listing details.
-   Add, replace and remove photographs.
-   Update asking price.
-   Update rental rates and conditions.
-   Activate or deactivate a listing.
-   Mark a sale listing as reserved when the seller is finalising a sale.
-   Remove the reserved status when the reservation is cancelled or
    expires.
-   Mark a vehicle as sold.
-   Mark rental availability as unavailable.
-   Reactivate a listing where permitted.
-   Delete or request removal of a listing.
-   View enquiries, offers and booking requests associated with a
    listing.

### 4.6 Listing Review and Visibility

The platform should support listing statuses such as:

-   Draft.
-   Pending review.
-   Approved / published.
-   Rejected.
-   Active.
-   Reserved.
-   Inactive.
-   Sold.
-   Removed.

The exact status model may distinguish between moderation status, sale
status and rental status so that one status does not incorrectly control
all listing activity.

## 5. Vehicle Discovery, Search, Filtering and Sorting

### 5.1 Search

Users should be able to search available vehicles using:

-   Brand.
-   Model.
-   Variant.
-   Keyword.
-   City.
-   Area or locality.

### 5.2 Filters

Search results should be filterable using:

  -----------------------------------------------------------------------
  Filter                              Supported criteria
  ----------------------------------- -----------------------------------
  Listing purpose                     Sale, rent, sale and rent

  Price                               Minimum and maximum price

  Brand                               Vehicle manufacturer

  Model                               Vehicle model

  Manufacturing year                  Year range

  Fuel type                           Petrol, diesel, CNG, electric,
                                      hybrid and other supported types

  Transmission                        Manual, automatic

  Body type                           Hatchback, sedan, SUV, MUV and
                                      other supported categories

  Kilometres driven                   Minimum and maximum range

  Ownership                           First owner, second owner and other
                                      supported values

  Seller type                         Individual or dealer

  Location                            City, area and pincode

  Vehicle condition                   Excellent, good, average and other
                                      supported values

  Rental availability                 Selected date range or available
                                      now
  -----------------------------------------------------------------------

### 5.3 Sorting

Search results should support sorting by:

-   Price: low to high.
-   Price: high to low.
-   Recently listed.
-   Recently updated.
-   Manufacturing year.
-   Lowest kilometres driven.

### 5.4 Search Result Behaviour

Search and listing pages should support:

-   Vehicle cards with key information.
-   Vehicle photograph or image gallery preview.
-   Asking price or rental rate.
-   Vehicle location.
-   Seller type.
-   Listing purpose.
-   Availability status.
-   Navigation to the complete vehicle details page.
-   Pagination or equivalent result loading.
-   Total matching result count.
-   Clear-all-filters functionality.
-   Appropriate empty-result messages.

## 6. Vehicle Details Page

Each publicly accessible vehicle listing should have a detailed page
containing:

-   Vehicle title.
-   Multiple photographs.
-   Brand, model and variant.
-   Manufacturing and registration year.
-   Fuel type.
-   Transmission.
-   Kilometres driven.
-   Ownership information.
-   Vehicle condition.
-   Location.
-   Description.
-   Additional specifications.
-   Seller or dealer information.
-   Sale price, where applicable.
-   Rental charges and conditions, where applicable.
-   Sale availability.
-   Rental availability.
-   Listing creation or update information.
-   Relevant enquiry, offer or booking actions.

Actions displayed on the page should depend on the listing purpose,
listing status and the permissions of the current user.

## 7. Individual Seller-to-Buyer Purchase Workflow

The platform should support direct interaction between an individual
vehicle owner and an interested buyer.

### 7.1 Buyer Capabilities

A buyer should be able to:

-   Discover individual-owner listings.
-   View vehicle details.
-   View permitted seller profile information.
-   Submit a purchase enquiry.
-   Submit a purchase offer.
-   Request a vehicle inspection or viewing.
-   View submitted enquiries and offers.
-   Track responses and offer status.

### 7.2 Seller Capabilities

An individual seller should be able to:

-   Receive buyer enquiries.
-   View the buyer's enquiry details.
-   Receive purchase offers.
-   View the offer amount and buyer details permitted by the platform.
-   Accept an offer.
-   Reject an offer.
-   Respond with a counteroffer, if negotiation is supported.
-   View the history of offers.
-   Update the vehicle's sale status when the sale is completed.

### 7.3 Purchase Offer Statuses

Purchase offers should support statuses such as:

-   Submitted.
-   Pending.
-   Accepted.
-   Rejected.
-   Counteroffer made.
-   Withdrawn.
-   Expired.
-   Completed or closed.

An accepted offer should not automatically imply that legal ownership
transfer or payment has been completed. The platform should distinguish
offer acceptance from final sale completion.

### 7.4 Purchase Completion

After an offer is accepted, the seller should be able to:

-   Mark the sale as pending completion.
-   Record the final agreed purchase amount.
-   Mark the vehicle as sold once the parties confirm completion.

The buyer should be able to view the agreed amount and final transaction
status. The platform should record the transaction date and the related
buyer, seller, vehicle and listing. The platform does not process the
payment or perform legal ownership transfer.

## 8. Individual Seller-to-Dealer Purchase Workflow

This is a core marketplace capability.

### 8.1 Dealer Discovery of Individual Listings

Registered dealers should be able to:

-   Browse vehicles listed by individual owners.
-   Search by brand, model and variant.
-   Filter by price range.
-   Filter by manufacturing year.
-   Filter by kilometres driven.
-   Filter by ownership history.
-   Filter by vehicle condition.
-   Filter by city or location.
-   View detailed vehicle information.
-   View permitted seller contact or profile information.

### 8.2 Dealer Purchase Offers

Dealers should be able to:

-   Submit a purchase offer to an individual owner.
-   Specify an offered purchase price.
-   Include an optional message or purchase condition.
-   View their submitted offers.
-   Track offer responses.
-   Withdraw an offer where permitted.
-   Submit a revised offer or counteroffer where supported.

### 8.3 Individual Seller Offer Management

Individual owners should be able to:

-   Receive offers from multiple dealers.
-   View the name and profile of each registered dealer.
-   Compare offers and offered amounts.
-   View offer conditions and messages.
-   Accept an offer.
-   Reject an offer.
-   Respond with a counteroffer, if supported.
-   View previous offer activity.

### 8.4 Acquisition Status

The platform should maintain a record of the outcome of the interaction,
including:

-   Offer submitted.
-   Offer accepted.
-   Offer rejected.
-   Acquisition pending.
-   Vehicle acquired by dealer.
-   Acquisition cancelled or closed.

When a dealer successfully acquires a vehicle and the acquisition is
recorded, the individual owner's public sale listing should no longer
remain available as an active listing. The dealer may then create or
manage an appropriate listing for the acquired vehicle, subject to the
platform's vehicle ownership and listing rules.

## 9. Dealer Registration and Dealership Management

### 9.1 Dealer Registration Information

A dealer registration should support:

-   Dealership name.
-   Dealer or business owner's name.
-   Business email address.
-   Contact number.
-   Dealership address.
-   City and pincode.
-   Dealership description.
-   Dealership logo or profile image.
-   Business registration information, where required.
-   Supporting verification documents, where required.

### 9.2 Dealer Verification

The platform should support:

-   Submission of dealer verification details.
-   Pending verification status.
-   Administrator review.
-   Approval or rejection.
-   Request for additional information.
-   Verified or unverified dealer status.
-   Restriction of public listing privileges for dealers who have not
    met verification requirements.

### 9.3 Dealer Profile

A public dealer profile may display:

-   Dealership name.
-   Logo.
-   Location.
-   Description.
-   Contact information permitted for public display.
-   Verification status.
-   Active vehicle listings.

### 9.4 Dealer Inventory Management

Dealers should be able to:

-   Add vehicles to inventory.
-   Create sale listings.
-   Create rental listings.
-   Create listings for both sale and rent.
-   Edit vehicle information.
-   Update sale prices.
-   Update rental rates.
-   Upload and manage photographs.
-   Activate or deactivate listings.
-   Mark vehicles as sold.
-   Manage rental availability.
-   View enquiries and booking requests.
-   View inventory history.

### 9.5 Dealer Dashboard

The dealer dashboard should provide access to:

-   Dealership profile.
-   Inventory overview.
-   Active sale listings.
-   Active rental listings.
-   Inactive listings.
-   Vehicles acquired from individuals.
-   Purchase offers sent.
-   Purchase offers received, where applicable.
-   Customer enquiries.
-   Rental requests.
-   Upcoming rentals.
-   Completed rentals.
-   Sold vehicles.
-   Inventory and activity statistics.

## 10. Vehicle Rental and Booking Management

### 10.1 Rental Discovery

Renters should be able to:

-   Browse vehicles listed for rent.
-   Search by brand and model.
-   Filter by vehicle type.
-   Filter by daily or weekly rental price.
-   Filter by location.
-   Select pickup and return dates.
-   View rental availability.
-   View rental terms and conditions.
-   View security deposit requirements.

### 10.2 Rental Cost Information

The platform should display an estimated rental cost based on the
selected vehicle and rental period.

The cost breakdown may include:

-   Base rental charge.
-   Number of rental days.
-   Applicable additional charges.
-   Security deposit.
-   Estimated total payable amount.

The security deposit should be displayed separately from the rental
charge so that users can understand which amount is refundable, subject
to the owner's stated terms.

### 10.3 Booking Request

A renter should be able to:

-   Select a vehicle.
-   Select pickup date and time, if supported.
-   Select return date and time, if supported.
-   Review rental charges.
-   Review the security deposit.
-   Review rental conditions.
-   Submit a booking request.
-   View booking confirmation or rejection.
-   View booking details.
-   Cancel a booking where permitted.
-   Request a change to the pickup date or return date for an existing
    booking, where modification is permitted.
-   View the status of a booking modification request.

### 10.4 Owner / Dealer Booking Management

The listing owner or dealer should be able to:

-   View incoming booking requests.
-   View renter details permitted by the platform.
-   Review requested dates.
-   Review the estimated rental amount.
-   Accept a booking request.
-   Reject a booking request.
-   Approve or reject a renter's booking modification request.
-   View upcoming bookings.
-   View active rentals.
-   Mark a vehicle as handed over, if this status is tracked.
-   Mark a rental as returned or completed.
-   View cancelled bookings.
-   View rental history.
-   View rental earnings or recorded rental amounts.

### 10.5 Rental Availability and Conflict Prevention

Rental availability must be checked before a booking is confirmed.
Owners and dealers should be able to mark dates as unavailable when a
vehicle is being used privately or is unavailable for another reason.
These blocked dates should be considered during booking and modification
checks.

The platform should prevent confirmation of overlapping bookings for the
same vehicle.

For example, if a vehicle has a confirmed booking from 25 November to 28
November, another booking that overlaps those dates should not be
confirmed.

The platform should distinguish between:

-   Requested booking.
-   Pending booking.
-   Confirmed booking.
-   Rejected booking.
-   Cancelled booking.
-   Active rental.
-   Completed rental.
-   Modification requested, where booking changes are supported.

Only statuses that represent a confirmed or active reservation should
block conflicting rental dates, according to the platform's booking
rules. An approved booking modification must be checked against current
availability and the estimated rental cost must be recalculated before
the updated dates are saved.

### 10.6 Rental History

The platform should maintain records of:

-   Vehicle rented.
-   Renter.
-   Vehicle owner or dealer.
-   Booking start and end dates.
-   Rental amount.
-   Security deposit information.
-   Booking status.
-   Cancellation details, where applicable.
-   Completion status.

## 11. User Dashboards

Each dashboard should display information relevant to the user's
capabilities and account permissions.

### 11.1 Individual Owner Dashboard

The individual owner dashboard should include:

-   Profile information.
-   My vehicles.
-   My sale listings.
-   My rental listings.
-   Active listings.
-   Inactive listings.
-   Sold vehicles.
-   Incoming buyer enquiries.
-   Purchase offers from buyers.
-   Purchase offers from dealers.
-   Offer comparison.
-   Incoming rental requests.
-   Upcoming rentals.
-   Active rentals.
-   Completed rentals.
-   Rental history.
-   Recorded rental earnings.
-   Vehicle listing views or other available listing statistics.

### 11.2 Buyer Dashboard

The buyer dashboard should include:

-   Profile information.
-   Submitted purchase enquiries.
-   Submitted purchase offers.
-   Offer responses and statuses.
-   Requested inspection appointments.
-   Favourite vehicles.
-   Recently viewed vehicles, if supported.
-   Purchase activity and history.

### 11.3 Renter Dashboard

The renter dashboard should include:

-   Profile information.
-   Submitted booking requests.
-   Pending bookings.
-   Confirmed bookings.
-   Upcoming rentals.
-   Active rentals.
-   Completed rentals.
-   Cancelled bookings.
-   Rental history.
-   Booking details and status.

### 11.4 Dealer Dashboard

The dealer dashboard should include:

-   Dealership profile.
-   Verification status.
-   Inventory summary.
-   Sale listings.
-   Rental listings.
-   Inactive listings.
-   Vehicles acquired from individuals.
-   Offers sent to individual owners.
-   Offers received.
-   Customer enquiries.
-   Rental booking requests.
-   Upcoming rentals.
-   Completed rentals.
-   Sold vehicles.
-   Inventory statistics.
-   Rental activity statistics.

## 12. Administrator Dashboard and Platform Management

### 12.1 User Management

Administrators should be able to:

-   View all registered users.
-   Search and filter users.
-   View user account details.
-   View account roles and capabilities.
-   Block or unblock accounts.
-   Review reported user accounts.

### 12.2 Dealer Management

Administrators should be able to:

-   View dealer registrations.
-   Review dealership information.
-   Review submitted verification documents.
-   Approve or reject dealer verification.
-   Request additional information.
-   Suspend or revoke dealer privileges where justified.
-   View dealer listings and activity.

### 12.3 Vehicle and Listing Management

Administrators should be able to:

-   View all vehicles.
-   View all public listings.
-   Search and filter listings.
-   Review pending listings.
-   Approve or reject listings.
-   Request corrections.
-   Deactivate or remove inappropriate listings.
-   Review reported vehicles.
-   View sale and rental availability statuses.

### 12.4 Offer and Booking Oversight

Administrators should be able to:

-   View purchase offers.
-   View offer status and related listing information.
-   View rental booking records.
-   Monitor booking statuses.
-   Review cancellations.
-   Review reported disputes or complaints.
-   Access relevant records for platform moderation.

### 12.5 Platform Analytics

The administrator dashboard may display:

-   Total registered users.
-   Total individual owners.
-   Total registered dealers.
-   Total verified dealers.
-   Total vehicles.
-   Total active sale listings.
-   Total active rental listings.
-   Total sold vehicles.
-   Total purchase offers.
-   Total rental bookings.
-   Pending dealer verifications.
-   Pending listing reviews.
-   Reported listings.
-   Popular vehicle brands and models.
-   Most viewed listings, if view tracking is enabled.
-   Rental and sale activity summaries.

## 13. Enquiries and Communication

The platform should provide a structured way for interested users to
contact vehicle owners and dealers.

### 13.1 Enquiry Submission

An enquiry may contain:

-   Enquirer account.
-   Vehicle listing.
-   Listing owner or dealer.
-   Enquiry subject or category.
-   Enquiry message.
-   Submission date.
-   Enquiry status.

### 13.2 Enquiry Management

Users receiving enquiries should be able to:

-   View incoming enquiries.
-   View the related vehicle.
-   View the enquiry message.
-   Respond to the enquiry using a basic text response within the
    enquiry record.
-   Mark an enquiry as resolved or closed.
-   View enquiry history.

### 13.3 Notifications

The platform should provide notifications for relevant events,
including:

-   New buyer enquiry.
-   New dealer purchase offer.
-   New buyer purchase offer.
-   Offer accepted or rejected.
-   Counteroffer received.
-   New rental booking request.
-   Booking accepted or rejected.
-   Booking cancellation.
-   Listing approval or rejection.
-   Dealer verification approval or rejection.
-   Relevant listing or account moderation actions.

Notifications may be displayed within the website. Email notifications
are optional. A real-time chat system is not required. Contact details
should only be displayed according to the user's visibility settings;
users can use listing enquiries without exposing their private contact
details publicly.

## 14. Favourites, Comparison and Recently Viewed Vehicles

### 14.1 Favourites

Registered users should be able to:

-   Add a vehicle to favourites.
-   Remove a vehicle from favourites.
-   View their saved vehicles.
-   Navigate from a favourite to the vehicle details page.
-   Handle vehicles that have become inactive, sold or unavailable.

### 14.2 Vehicle Comparison

Users should be able to select multiple vehicles and compare relevant
information, including:

-   Brand and model.
-   Variant.
-   Manufacturing year.
-   Price.
-   Kilometres driven.
-   Fuel type.
-   Transmission.
-   Ownership history.
-   Vehicle condition.
-   Location.
-   Rental rate, where applicable.

Comparison should be limited to a manageable number of vehicles and
should present equivalent specifications together.

### 14.3 Recently Viewed Vehicles

The platform may maintain a user's recently viewed vehicle list and
provide links back to those vehicle details pages.

## 15. Reporting

### 15.1 Reporting

Users should be able to report:

-   Misleading vehicle information.
-   Suspicious or fraudulent listings.
-   Inappropriate photographs or descriptions.
-   Suspicious user accounts.
-   Misleading dealer profiles.
-   Other platform policy violations.

A report should record:

-   Reporting user.
-   Reported listing, account or dealer.
-   Report category.
-   Description.
-   Submission date.
-   Review status.
-   Administrative resolution, where applicable.

## 16. Vehicle Inspection and Viewing Requests

The platform may support requests for an in-person vehicle inspection or
viewing.

A buyer should be able to:

-   Request an inspection or viewing.
-   Select a preferred date and time.
-   Provide an optional message.
-   View the request status.

A seller or dealer should be able to:

-   View inspection requests.
-   Accept or reject a proposed appointment.
-   Suggest an alternative date or time, if supported.
-   View upcoming appointments.
-   Mark an appointment as completed or cancelled.

This functionality coordinates an appointment; it does not itself verify
the vehicle's mechanical condition.

## 17. Additional Platform Features

The following features may be included where appropriate:

### 17.1 Location-Based Discovery

-   Search vehicles by city.
-   Filter by area or pincode.
-   Display vehicle location.
-   Display pickup or inspection location.

### 17.2 Listing Expiry

-   Store listing creation and expiry dates.
-   Notify owners when a listing is approaching expiry.
-   Mark expired listings as inactive or pending renewal.
-   Allow owners to renew eligible listings.

### 17.3 Vehicle and Listing Statistics

Where view tracking is enabled, owners and dealers may view:

-   Listing views.
-   Favourite count.
-   Enquiry count.
-   Offer count.
-   Booking request count.

### 17.4 Document and Image Management

-   Upload multiple vehicle photographs.
-   Replace or remove photographs.
-   Upload permitted supporting documents.
-   Restrict access to private documents.
-   Validate supported file formats and file sizes.

### 17.5 Transaction Records and Receipts

The platform may maintain records of:

-   Accepted purchase offers.
-   Recorded sale completion.
-   Confirmed rental bookings.
-   Rental completion.
-   Recorded rental charges and deposits.
-   Cancellation and status history.

The platform-generated transaction record is an activity record only;
it should not be represented as proof of legal vehicle ownership
transfer. PDF receipts or invoices are not required for this project.

## 18. Business Rules and Status Management

The platform should enforce consistent rules across vehicles, listings,
offers and bookings.

### 18.1 Vehicle and Listing Rules

-   A vehicle may have a sale listing, rental listing or both.
-   Sale and rental availability should be maintained independently.
-   A sold vehicle should not remain available as an active sale
    listing.
-   A reserved sale listing should remain visible but should not accept
    new purchase offers.
-   A seller should be able to remove a reservation if the sale does
    not proceed.
-   An owner should be able to deactivate a listing temporarily.
-   An inactive listing should not appear in normal public search
    results.
-   A vehicle with an active rental booking may remain available for
    sale, subject to the owner's listing terms.
-   A vehicle acquired by a dealer should no longer appear as an active
    sale listing under the previous individual owner's account.
-   A dealer may create a new listing for an acquired vehicle, subject
    to ownership and listing rules.
-   Listing moderation status should be distinct from sale and rental
    availability where necessary.

### 18.2 Offer Rules

-   Offers should be associated with a specific vehicle listing and an
    identified buyer or dealer.
-   The offer amount and submission time should be recorded.
-   Sellers should be able to accept or reject eligible offers.
-   Counteroffers should be recorded as part of the negotiation history
    if supported.
-   An accepted offer should not automatically be treated as a completed
    sale.
-   The final sale status should be updated only when the relevant
    completion is recorded.
-   Closed, rejected, withdrawn or expired offers should not be treated
    as active offers.
-   Once a seller accepts an offer, other active offers for that sale
    listing should be closed or marked as unavailable.
-   A purchase offer must not be accepted if the listing is sold,
    inactive or otherwise unavailable.
-   Accepting an offer and completing a sale must remain separate
    actions.

### 18.3 Rental Rules

-   Rental requests must include a valid start and end date.
-   The return date must be later than the pickup date.
-   Rental requests must satisfy the listing's minimum and maximum
    duration rules.
-   The selected dates must be checked against confirmed or active
    bookings and owner/dealer blocked dates.
-   Overlapping confirmed bookings for the same vehicle must be
    prevented.
-   A pending request should not automatically be treated as a confirmed
    rental.
-   A cancelled or rejected booking should not block availability once
    its status permits the dates to be released.
-   Rental cost calculations should use the applicable rate and rental
    duration.
-   Security deposit information should be represented separately from
    rental charges.
-   Rental completion and vehicle return should be tracked distinctly
    from booking confirmation.
-   A booking modification must be approved by the owner or dealer and
    rechecked for date conflicts before it takes effect.
-   The rental estimate should be recalculated when an approved date
    modification changes the rental duration.
-   Rejected or cancelled booking requests should not block dates.

### 18.4 Role and Permission Rules

-   Users should only modify their own profiles and permitted records.
-   Deactivated users should not be able to create new listings, offers
    or bookings.
-   Public contact information should follow each user's visibility
    settings.
-   Individual owners should only manage their own vehicle listings.
-   Dealers should only manage their authorised dealership profiles and
    inventory.
-   Buyers should only view and manage their own enquiries and offers.
-   Renters should only view and manage their own booking requests and
    bookings.
-   Administrators should have platform-wide privileges appropriate to
    their role.
-   Unverified dealers should not be permitted to publish listings if
    verification is required.
-   Restricted actions should be checked on the server, not only hidden
    in the user interface.

### 18.5 Data Validation Rules

-   Required fields must be validated.
-   Email addresses must follow an accepted format.
-   Mobile numbers must follow the platform's accepted format.
-   Prices and rental charges must be valid non-negative amounts.
-   Manufacturing year must be a valid year.
-   Kilometres driven must be a valid non-negative value.
-   Rental end dates must follow rental start dates.
-   Uploaded files must satisfy permitted format and size restrictions.
-   User input must be validated on both client and server sides.
-   Duplicate or inconsistent records should be prevented where
    appropriate.

## 19. Suggested Database Entities and Data Organisation

The following entities represent the main categories of information
required by the platform. They are conceptual data groups; the final
database structure may combine or separate them as needed.

  -----------------------------------------------------------------------
  Entity / Collection                 Information stored
  ----------------------------------- -----------------------------------
  Users                               Personal details, credentials,
                                      account status, contact visibility
                                      and capabilities

  Dealers                             Dealership details, address,
                                      verification information and status

  Vehicles                            Vehicle specifications, condition,
                                      ownership-related information and
                                      media references

  Listings                            Listing owner, vehicle reference,
                                      sale/rental purpose, prices,
                                      availability, reservation and
                                      visibility status

  Offers                              Buyer or dealer offer, seller,
                                      listing, amount, message and status

  Bookings                            Renter, vehicle listing, date
                                      range, charges, deposit, booking
                                      status and modification requests

  Favourites                          User and saved vehicle/listing
                                      references

  Enquiries                           Enquirer, recipient, listing,
                                      message and status

  Notifications                       Recipient, event type, message,
                                      read status and timestamp

  Reports                             Reporting user, reported subject,
                                      reason, description and resolution
                                      status

  Inspection Requests                 Requester, listing, preferred
                                      date/time and appointment status

  Unavailable Dates                   Vehicle listing, blocked date
                                      range and owner/dealer reference

  Transaction Records                 Relevant accepted offers, recorded
                                      sale outcomes and rental completion
                                      records
  -----------------------------------------------------------------------

### 19.1 Relationships Between Main Entities

The data model should support relationships such as:

-   One user can own multiple vehicles.
-   One dealer can manage multiple vehicles.
-   A vehicle can have one or more listing records over its lifecycle,
    subject to platform rules.
-   A listing belongs to a vehicle and has an associated owner or
    dealer.
-   A listing may receive multiple enquiries.
-   A sale listing may receive multiple purchase offers.
-   A rental listing may receive multiple booking requests.
-   A user may save multiple vehicles or listings as favourites.
-   A user may receive multiple notifications.
-   A booking is associated with a renter and a vehicle listing.
-   A report is associated with a reporting user and a reported subject.
-   A transaction record is associated with the relevant vehicle,
    listing, buyer and seller.
-   Unavailable date records are associated with a rental listing.

The platform should preserve the history of offers, bookings and listing
status changes where this information is needed for user dashboards,
administration and dispute review.

## 20. Suggested REST API Resource Areas

The application should expose RESTful endpoints for communication
between the frontend and backend. The following are representative
resource paths and operations, not a prescribed implementation sequence.

  ---------------------------------------------------------------------------------------
  HTTP Method             Example endpoint                        Purpose
  ----------------------- --------------------------------------- -----------------------
  POST                    `/api/auth/register`                    Register an account

  POST                    `/api/auth/login`                       Authenticate an account

  POST                    `/api/auth/logout`                      End an authenticated
                                                                  session

  GET                     `/api/users/profile`                    Retrieve current user's
                                                                  profile

  PUT                     `/api/users/profile`                    Update current user's
                                                                  profile

  PATCH                   `/api/users/account-status`             Request account
                                                                  deactivation

  GET                     `/api/vehicles`                         Retrieve vehicle
                                                                  records or searchable
                                                                  listings

  GET                     `/api/vehicles/:id`                     Retrieve vehicle
                                                                  details

  POST                    `/api/vehicles`                         Create a vehicle record

  PUT                     `/api/vehicles/:id`                     Update a vehicle record

  DELETE                  `/api/vehicles/:id`                     Delete or remove an
                                                                  eligible vehicle record

  GET                     `/api/listings`                         Retrieve public
                                                                  listings

  GET                     `/api/listings/:id`                     Retrieve listing
                                                                  details

  POST                    `/api/listings`                         Create a listing

  PUT                     `/api/listings/:id`                     Update a listing

  PATCH                   `/api/listings/:id/status`              Update listing status,
                                                                  including reservation

  GET                     `/api/dealers`                          Retrieve dealer
                                                                  profiles

  POST                    `/api/dealers/register`                 Submit dealer
                                                                  registration

  GET                     `/api/dealers/:id`                      Retrieve dealer profile

  PUT                     `/api/dealers/:id`                      Update dealer profile

  POST                    `/api/offers`                           Submit a purchase offer

  GET                     `/api/offers/my-offers`                 Retrieve offers
                                                                  submitted by the
                                                                  current user

  GET                     `/api/offers/received`                  Retrieve offers
                                                                  received by the current
                                                                  user

  PATCH                   `/api/offers/:id/status`                Update an offer status

  POST                    `/api/bookings`                         Submit a rental booking
                                                                  request

  GET                     `/api/bookings`                         Retrieve bookings
                                                                  accessible to the
                                                                  current user

  GET                     `/api/bookings/:id`                     Retrieve booking
                                                                  details

  PATCH                   `/api/bookings/:id/status`              Update a booking status

  PATCH                   `/api/bookings/:id/modification`        Request or respond to a
                                                                  booking date change

  POST                    `/api/listings/:id/unavailable-dates`    Add unavailable rental
                                                                  dates

  POST                    `/api/enquiries`                        Submit an enquiry

  GET                     `/api/enquiries`                        Retrieve enquiries
                                                                  accessible to the
                                                                  current user

  POST                    `/api/favourites`                       Add a favourite

  DELETE                  `/api/favourites/:id`                   Remove a favourite

  POST                    `/api/reports`                          Submit a report

  POST                    `/api/transactions`                     Record sale completion

  GET                     `/api/notifications`                    Retrieve notifications

  PATCH                   `/api/notifications/:id/read`           Mark a notification as
                                                                  read

  GET                     `/api/admin/dashboard`                  Retrieve administrative
                                                                  statistics

  GET                     `/api/admin/listings`                   Retrieve listings for
                                                                  administration

  PATCH                   `/api/admin/listings/:id/status`        Moderate a listing

  GET                     `/api/admin/dealers`                    Retrieve dealer
                                                                  registrations

  PATCH                   `/api/admin/dealers/:id/verification`   Update dealer
                                                                  verification status
  ---------------------------------------------------------------------------------------

All endpoints that modify data should enforce authentication,
authorisation, validation and appropriate error handling.

## 21. User Interface and Navigation Requirements

The website should provide clear navigation based on the user's role and
the functionality available to them.

### 21.1 Public Navigation

Public navigation may include:

-   Home.
-   Buy Cars.
-   Rent Cars.
-   Sell Your Car.
-   Dealer Directory.
-   Search.
-   Login.
-   Register.

### 21.2 Vehicle Browsing Interface

The vehicle browsing interface should include:

-   Search bar.
-   Filter panel.
-   Sorting controls.
-   Vehicle result cards.
-   Listing purpose indicators.
-   Price or rental rate.
-   Location.
-   Seller type.
-   Favourite action.
-   Link to vehicle details.

### 21.3 Vehicle Listing Interface

The listing creation and editing interface should organise fields into
clear sections:

-   Basic vehicle details.
-   Vehicle specifications.
-   Vehicle condition.
-   Location.
-   Listing purpose.
-   Sale pricing.
-   Rental pricing and conditions.
-   Photographs and supporting information.
-   Preview and submission.

Fields should be displayed conditionally where appropriate. For example,
rental pricing fields should be required only when the vehicle is listed
for rent.

### 21.4 Dashboard Interface

Dashboards should provide:

-   Role-appropriate navigation.
-   Summary cards.
-   Listing and booking tables.
-   Offer and enquiry status indicators.
-   Search and filtering within records.
-   Links to detailed records.
-   Clear actions for permitted status changes.
-   Account settings for contact visibility and account deactivation.
-   Simple controls for reserving a sale listing and blocking rental
    dates.

### 21.5 Responsive Design

The website should support:

-   Desktop screens.
-   Tablets.
-   Mobile phones.
-   Responsive navigation.
-   Responsive vehicle cards and forms.
-   Readable tables or mobile-friendly alternatives.
-   Consistent layouts and accessible form controls.

## 22. Validation, Security and Error Handling Requirements

### 22.1 Client-Side Validation

The frontend should validate:

-   Required form fields.
-   Email and mobile number formats.
-   Password and password confirmation.
-   Numeric price and rental fields.
-   Manufacturing year.
-   Kilometres driven.
-   Rental date ranges.
-   Image and document upload constraints.
-   Missing or invalid listing information.

The interface should show understandable validation messages near the
relevant fields.

### 22.2 Server-Side Validation

The backend should independently validate:

-   Registration and login data.
-   User permissions.
-   Vehicle and listing data.
-   Offer amounts and offer ownership.
-   Booking dates, modifications and availability.
-   Account status and permissions.
-   Sale reservation and completion status.
-   Listing status transitions.
-   Dealer verification restrictions.
-   Uploaded file metadata and restrictions.
-   Resource ownership before allowing updates or deletion.

Client-side validation must not be treated as a replacement for
server-side validation.

### 22.3 Security Requirements

The platform should support:

-   Secure password hashing.
-   Authentication for protected resources.
-   Role-based and resource-level authorisation.
-   Protection against unauthorised listing modifications.
-   Input validation and sanitisation.
-   Safe handling of uploaded files.
-   Protection of private user and dealer information.
-   Appropriate access controls for administrative functions.
-   Secure handling of authentication tokens or sessions.
-   Consistent error responses without exposing sensitive internal
    details.

### 22.4 Error Handling

The application should handle cases such as:

-   Invalid login credentials.
-   Duplicate registration details.
-   Missing required fields.
-   Invalid vehicle identifiers.
-   Unavailable or removed listings.
-   Unauthorised access.
-   Invalid offer status changes.
-   Conflicting rental dates or unavailable dates.
-   Invalid booking modification requests.
-   Attempts to offer on reserved, sold or inactive listings.
-   Invalid booking dates.
-   Unsupported file formats.
-   File size limit violations.
-   Database or service errors.

Users should receive clear messages explaining what happened and, where
possible, what action they can take.

## 23. Technology and Course-Scope Alignment

The platform's functional requirements align with the Web Technology
course topics and practical outcomes.

  -----------------------------------------------------------------------
  Course topic                        Platform functionality demonstrated
  ----------------------------------- -----------------------------------
  HTML and CSS                        Public pages, forms, listing cards,
                                      dashboards and vehicle details

  Bootstrap / responsive frameworks   Responsive layouts, navigation,
                                      forms, cards and tables

  JavaScript                          Search interactions, filters, form
                                      behaviour, price calculations and
                                      date handling

  JSON and arrays                     Structured vehicle data, form data
                                      and API request/response data

  ReactJS                             Interactive vehicle browsing,
                                      dashboards, listing forms and
                                      client-side validation

  NodeJS                              Backend application logic, request
                                      processing and server-side
                                      validation

  ExpressJS                           Routing, middleware,
                                      authentication, authorisation and
                                      API handling

  RESTful APIs                        CRUD operations for users,
                                      vehicles, listings, offers and
                                      bookings

  MongoDB                             Persistent storage of platform
                                      users, vehicles, listings and
                                      transaction-related records

  Postman                             Testing API operations, request
                                      validation and response handling

  Deployment                          Making the frontend, backend and
                                      database-connected application
                                      accessible in a deployed
                                      environment
  -----------------------------------------------------------------------

## 24. Functional Scope Summary

The platform's functional scope for this academic project can be grouped
into the following modules. Features such as online payment processing,
automated document verification, real-time GPS tracking, AI-based
valuation and third-party integrations are outside the current scope.

1.  User registration, authentication and profile management.
2.  Multi-role user capabilities and permissions.
3.  Vehicle information management.
4.  Vehicle listing creation and management.
5.  Sale, rental and combined listing options.
6.  Vehicle browsing, search, filtering and sorting.
7.  Vehicle details and image gallery.
8.  Individual seller-to-buyer purchase workflow.
9.  Individual seller-to-dealer purchase workflow.
10. Dealer registration and verification.
11. Dealer profile and inventory management.
12. Rental discovery and availability checking.
13. Rental booking and cancellation management.
14. Individual owner and dealer dashboards.
15. Buyer and renter dashboards.
16. Administrator dashboard and platform management.
17. Enquiries and communication.
18. Purchase offers and negotiation.
19. Notifications.
20. Favourites and saved vehicles.
21. Vehicle comparison.
22. Recently viewed vehicles.
23. Listing and user reporting.
24. Vehicle inspection and viewing requests.
25. Location-based discovery.
26. Listing expiry and renewal.
27. Basic vehicle and listing statistics.
28. Document and image management.
29. Transaction and rental history.
30. Validation, security and error handling.
31. Responsive user interface.
32. REST API resource management and database operations.
33. Account lifecycle and contact visibility management.
34. Sale reservation and completion management.
35. Rental booking modification and unavailable-date management.

This document defines the platform's functional requirements, user
roles, workflows, business rules, data areas and interface expectations.
It intentionally does not prescribe a phase-by-phase development
sequence or implementation plan.
